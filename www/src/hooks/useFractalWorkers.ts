import { useEffect, useRef, useState, useCallback } from 'react';
import { FractalType, WorkerRequest, WorkerResponse } from '../workers/fractalWorker';

export interface RenderParams {
  type: FractalType;
  canvas: HTMLCanvasElement;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  max_iter: number;
  real: number;
  imaginary: number;
}

export function useFractalWorkers() {
  const workers = useRef<Worker[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const cancelTokens = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Initialize worker pool (fallback to 4 if hardwareConcurrency is missing)
    const numWorkers = Math.max(1, navigator.hardwareConcurrency || 4);
    for (let i = 0; i < numWorkers; i++) {
      workers.current.push(new Worker(new URL('../workers/fractalWorker.ts', import.meta.url), { type: 'module' }));
    }

    return () => {
      workers.current.forEach(w => w.terminate());
      workers.current = [];
    };
  }, []);

  const cancelRendering = useCallback(() => {
    // Invalidate all active jobs by assigning a new token era
    cancelTokens.current.clear();
    setIsRendering(false);
  }, []);

  const renderFractal = useCallback((params: RenderParams) => {
    cancelRendering();
    
    const currentRenderToken = Date.now();
    cancelTokens.current.add(currentRenderToken);

    setElapsed(null);
    setIsRendering(true);
    
    const start_time = performance.now();
    const { canvas, type, x_min, x_max, y_min, y_max, max_iter, real, imaginary } = params;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Device Pixel Ratio for Retina screens
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    
    const physicalWidth = Math.floor(cssWidth * dpr);
    const physicalHeight = Math.floor(cssHeight * dpr);

    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    ctx.clearRect(0, 0, physicalWidth, physicalHeight);

    const numWorkers = workers.current.length;
    // 8x8 chunks is usually a good balance of job queue distribution
    const chunksX = 8;
    const chunksY = 8;
    
    const totalChunks = chunksX * chunksY;
    let chunksCompleted = 0;

    let nextChunkIdx = 0;
    let jobIdCounter = 0;

    const activeJobs = new Map<number, { px_x: number, px_y: number, px_w: number, px_h: number }>();
    const idleWorkers = [...workers.current];

    const assignJobs = () => {
      if (!cancelTokens.current.has(currentRenderToken)) return;

      while (idleWorkers.length > 0 && nextChunkIdx < totalChunks) {
        const cx = nextChunkIdx % chunksX;
        const cy = Math.floor(nextChunkIdx / chunksX);
        nextChunkIdx++;

        const chunkW = Math.floor(physicalWidth / chunksX);
        const chunkH = Math.floor(physicalHeight / chunksY);
        
        const px_x = cx * chunkW;
        const px_y = cy * chunkH;
        const px_w = (cx === chunksX - 1) ? physicalWidth - px_x : chunkW;
        const px_h = (cy === chunksY - 1) ? physicalHeight - px_y : chunkH;

        const c_x_min = x_min + (x_max - x_min) * (px_x / physicalWidth);
        const c_x_max = x_min + (x_max - x_min) * ((px_x + px_w) / physicalWidth);
        const c_y_min = y_min + (y_max - y_min) * (px_y / physicalHeight);
        const c_y_max = y_min + (y_max - y_min) * ((px_y + px_h) / physicalHeight);

        const worker = idleWorkers.pop()!;
        const jobId = jobIdCounter++;
        
        activeJobs.set(jobId, { px_x, px_y, px_w, px_h });

        const req: WorkerRequest = {
          id: jobId,
          type,
          width: px_w,
          height: px_h,
          x_min: c_x_min,
          x_max: c_x_max,
          y_min: c_y_min,
          y_max: c_y_max,
          max_iter,
          real,
          imaginary
        };

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (!cancelTokens.current.has(currentRenderToken)) {
            // Give worker back if cancelled
            idleWorkers.push(worker);
            return;
          }

          const res = e.data;

          // エラーが返された場合はスキップしてカウントを進める
          if (res.error) {
            console.warn(`Chunk ${res.id} failed:`, res.error);
            activeJobs.delete(res.id);
            chunksCompleted++;
            if (chunksCompleted === totalChunks) {
              setElapsed(Math.round(performance.now() - start_time));
              setIsRendering(false);
            } else {
              idleWorkers.push(worker);
              assignJobs();
            }
            return;
          }

          const jobInfo = activeJobs.get(res.id);
          if (jobInfo && res.data) {
            const imgData = new ImageData(res.data as any, jobInfo.px_w, jobInfo.px_h);
            ctx.putImageData(imgData, jobInfo.px_x, jobInfo.px_y);
            activeJobs.delete(res.id);
          }
          
          chunksCompleted++;
          if (chunksCompleted === totalChunks) {
            setElapsed(Math.round(performance.now() - start_time));
            setIsRendering(false);
          } else {
            idleWorkers.push(worker);
            assignJobs();
          }
        };

        worker.postMessage(req);
      }
    };

    assignJobs();
  }, [cancelRendering]);

  return { renderFractal, cancelRendering, elapsed, isRendering };
}
