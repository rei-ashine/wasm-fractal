import { WorkerRequest, WorkerResponse } from './fractalWorker';

type JobCallback = (res: WorkerResponse) => void;

interface Job {
  req: WorkerRequest;
  callback: JobCallback;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private queue: Job[] = [];
  
  // A set of cancelled job IDs so we can ignore their results
  private cancelledJobs = new Set<number>();

  constructor(private size: number) {
    this.init();
  }

  private init() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL('./fractalWorker.ts', import.meta.url), { type: 'module' });
      this.workers.push(worker);
      this.idleWorkers.push(worker);

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const res = e.data;
        
        // Put the worker back to idle pool
        this.idleWorkers.push(worker);
        
        // If this job was cancelled, ignore the result.
        if (this.cancelledJobs.has(res.id)) {
          this.cancelledJobs.delete(res.id);
        } else {
          // We need to look up the callback.
          // Wait, the callback was bound before we posted the message.
          // We actually need a map of active jobs to their callbacks.
        }
        
        // Process next in queue
        this.processQueue();
      };
    }
  }

  private activeJobs = new Map<number, JobCallback>();

  private processQueue() {
    while (this.queue.length > 0 && this.idleWorkers.length > 0) {
      const job = this.queue.shift()!;
      // If the job was already cancelled while in queue, skip it
      if (this.cancelledJobs.has(job.req.id)) {
        this.cancelledJobs.delete(job.req.id);
        continue;
      }
      
      const worker = this.idleWorkers.pop()!;
      
      this.activeJobs.set(job.req.id, job.callback);
      
      // We overwrite the onmessage handler to easily bind the result to the job
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const res = e.data;
        this.idleWorkers.push(worker);
        
        const callback = this.activeJobs.get(res.id);
        if (callback) {
          this.activeJobs.delete(res.id);
          // Only fire callback if not cancelled
          if (!this.cancelledJobs.has(res.id)) {
            callback(res);
          } else {
            this.cancelledJobs.delete(res.id);
          }
        }
        
        this.processQueue();
      };

      worker.postMessage(job.req);
    }
  }

  public submitTask(req: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve) => {
      this.queue.push({
        req,
        callback: resolve
      });
      this.processQueue();
    });
  }

  public cancelAll() {
    // 1. Mark all queued jobs as cancelled
    for (const job of this.queue) {
      this.cancelledJobs.add(job.req.id);
    }
    this.queue = [];

    // 2. Mark all actively running jobs as cancelled
    for (const id of this.activeJobs.keys()) {
      this.cancelledJobs.add(id);
    }
    this.activeJobs.clear();
  }
}

// Registry for independent singleton pools
const pools = new Map<string, WorkerPool>();

export function getWorkerPool(poolId: string): WorkerPool {
  if (!pools.has(poolId)) {
    const numWorkers = Math.max(1, navigator.hardwareConcurrency || 4);
    pools.set(poolId, new WorkerPool(numWorkers));
  }
  return pools.get(poolId)!;
}
