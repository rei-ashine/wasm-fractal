import { useState, useCallback, useEffect } from 'react';
import { FractalType, WorkerRequest } from '../workers/fractalWorker';
import { getWorkerPool } from '../workers/workerPool';

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
  aa_level?: number;
}

let globalJobIdCounter = 0;

export function useFractalWorkers(poolId: string) {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // When unmounting, we should cancel any pending jobs.
  useEffect(() => {
    return () => {
      const pool = getWorkerPool(poolId);
      pool.cancelAll();
    };
  }, [poolId]);

  const cancelRendering = useCallback(() => {
    const pool = getWorkerPool(poolId);
    pool.cancelAll();
    setIsRendering(false);
  }, [poolId]);

  const renderFractal = useCallback((params: RenderParams) => {
    cancelRendering();

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

    // 8x8 chunks is usually a good balance of job queue distribution
    const chunksX = 8;
    const chunksY = 8;
    
    const totalChunks = chunksX * chunksY;
    let chunksCompleted = 0;

    const pool = getWorkerPool(poolId);

    for (let cy = 0; cy < chunksY; cy++) {
      for (let cx = 0; cx < chunksX; cx++) {
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

        const jobId = globalJobIdCounter++;

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
          imaginary,
          aa_level: params.aa_level ?? 3
        };

        pool.submitTask(req).then((res) => {
          if (res.error) {
            console.warn(`Chunk ${res.id} failed:`, res.error);
          } else if (res.data) {
            const imgData = new ImageData(res.data as any, px_w, px_h);
            ctx.putImageData(imgData, px_x, px_y);
          }
          
          chunksCompleted++;
          if (chunksCompleted === totalChunks) {
            setElapsed(Math.round(performance.now() - start_time));
            setIsRendering(false);
          }
        });
      }
    }
  }, [cancelRendering, poolId]);

  return { renderFractal, cancelRendering, elapsed, isRendering };
}
