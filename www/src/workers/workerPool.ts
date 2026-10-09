import { WorkerRequest, WorkerResponse } from './fractalWorker';

// Resolves with the worker's response, or null if the job was cancelled.
type JobResolve = (res: WorkerResponse | null) => void;

interface Job {
  req: WorkerRequest;
  group: string;
  resolve: JobResolve;
  cancelled: boolean;
}

// Stop respawning after this many worker errors in a row with no successful job in between,
// so a worker script that can never load (e.g. a stale chunk returning 404) does not
// respawn forever.
const MAX_CONSECUTIVE_FAILURES = 3;

export class WorkerPool {
  private idleWorkers: Worker[] = [];
  private queue: Job[] = [];
  // The job each busy worker is currently running
  private running = new Map<Worker, Job>();
  private consecutiveFailures = 0;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.idleWorkers.push(this.spawnWorker());
    }
  }

  private get workerCount() {
    return this.idleWorkers.length + this.running.size;
  }

  private spawnWorker(): Worker {
    const worker = new Worker(new URL('./fractalWorker.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      // Ignore a response that does not belong to the job this worker is running
      // (e.g. it arrives after the job was already failed), so it is never applied
      // to another job and the worker is not pushed to idleWorkers twice.
      if (this.running.get(worker)?.req.id !== e.data.id) return;

      this.consecutiveFailures = 0;
      this.completeJob(worker, e.data);
      this.idleWorkers.push(worker);
      this.processQueue();
    });

    // The worker is still alive when a response cannot be deserialized; only its job failed.
    // Registered with addEventListener: Chromium has no Worker.onmessageerror attribute.
    worker.addEventListener('messageerror', () => {
      this.completeJob(worker, { id: -1, error: 'Worker response could not be deserialized' });
      this.idleWorkers.push(worker);
      this.processQueue();
    });

    // An uncaught error (e.g. the module failed to load) may leave the worker unusable,
    // so replace it, whether it was running a job or idle, to keep the pool at full size.
    worker.addEventListener('error', (e: ErrorEvent) => {
      e.preventDefault();
      worker.terminate();
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
      this.completeJob(worker, { id: -1, error: e.message || 'Worker error' });

      this.consecutiveFailures++;
      if (this.consecutiveFailures <= MAX_CONSECUTIVE_FAILURES) {
        this.idleWorkers.push(this.spawnWorker());
      }

      this.processQueue();
    });

    return worker;
  }

  // Settle the job running on a worker (if any) and mark the worker as no longer running.
  private completeJob(worker: Worker, res: WorkerResponse) {
    const job = this.running.get(worker);
    this.running.delete(worker);
    // A cancelled job was already resolved with null; drop its late result.
    if (job && !job.cancelled) {
      job.resolve(res.id === -1 ? { ...res, id: job.req.id } : res);
    }
  }

  private processQueue() {
    if (this.workerCount === 0) {
      // Every worker failed and respawning gave up; fail jobs rather than hang.
      for (const job of this.queue) {
        job.resolve({ id: job.req.id, error: 'No worker available' });
      }
      this.queue = [];
      return;
    }

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
