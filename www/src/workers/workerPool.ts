import { WorkerRequest, WorkerResponse } from './fractalWorker';

// Resolves with the worker's response, or null if the job was cancelled.
type JobResolve = (res: WorkerResponse | null) => void;

interface Job {
  req: WorkerRequest;
  group: string;
  resolve: JobResolve;
  cancelled: boolean;
}

export class WorkerPool {
  private idleWorkers: Worker[] = [];
  private queue: Job[] = [];
  // The job each busy worker is currently running
  private running = new Map<Worker, Job>();

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.idleWorkers.push(this.spawnWorker());
    }
  }

  private spawnWorker(): Worker {
    const worker = new Worker(new URL('./fractalWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const job = this.running.get(worker);
      this.running.delete(worker);
      this.idleWorkers.push(worker);
      // A cancelled job was already resolved with null; drop its late result.
      if (job && !job.cancelled) {
        job.resolve(e.data);
      }
      this.processQueue();
    };

    // An uncaught error (e.g. the module failed to load) may leave the worker unusable,
    // so remove it from the pool instead of posting more jobs to it.
    worker.onerror = (e: ErrorEvent) => {
      e.preventDefault();
      worker.terminate();
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);

      const job = this.running.get(worker);
      this.running.delete(worker);
      if (job) {
        // Only replace a worker that was running a job, so a worker that always fails
        // to load cannot respawn forever while idle.
        this.idleWorkers.push(this.spawnWorker());
        if (!job.cancelled) {
          job.resolve({ id: job.req.id, error: e.message || 'Worker error' });
        }
      }

      if (this.idleWorkers.length === 0 && this.running.size === 0) {
        // No worker left to run the queue; fail it rather than hang.
        for (const queued of this.queue) {
          queued.resolve({ id: queued.req.id, error: 'No worker available' });
        }
        this.queue = [];
      }

      this.processQueue();
    };

    return worker;
  }

  private processQueue() {
    while (this.queue.length > 0 && this.idleWorkers.length > 0) {
      const job = this.queue.shift()!;
      const worker = this.idleWorkers.pop()!;
      this.running.set(worker, job);
      worker.postMessage(job.req);
    }
  }

  public submitTask(req: WorkerRequest, group: string): Promise<WorkerResponse | null> {
    return new Promise((resolve) => {
      this.queue.push({ req, group, resolve, cancelled: false });
      this.processQueue();
    });
  }

  // Cancel every queued or running job of one group, leaving other groups untouched.
  public cancelGroup(group: string) {
    this.queue = this.queue.filter((job) => {
      if (job.group !== group) return true;
      job.resolve(null);
      return false;
    });

    // Running jobs cannot be interrupted; resolve them now and ignore their results.
    for (const job of this.running.values()) {
      if (job.group === group && !job.cancelled) {
        job.cancelled = true;
        job.resolve(null);
      }
    }
  }
}

// A single pool shared by every canvas, so the number of workers matches the CPU cores
// no matter how many fractals are rendered at once.
let sharedPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!sharedPool) {
    const numWorkers = Math.max(1, navigator.hardwareConcurrency || 4);
    sharedPool = new WorkerPool(numWorkers);
  }
  return sharedPool;
}
