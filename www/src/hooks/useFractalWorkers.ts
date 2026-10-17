import { useState, useCallback, useEffect, useId } from 'react';
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
  // z_0 for the Mandelbrot set, c for the Julia set; unused by the other fractals
  real?: number;
  imaginary?: number;
  aa_level?: number;
  // false keeps the current image instead of clearing the canvas before drawing (default true)
  clear?: boolean;
  // Fraction (0 to 1) of the canvas resolution to compute (default 1). Below 1, the image is
  // computed at that size and stretched over the canvas once every chunk is in.
  scale?: number;
  // Upper limit for devicePixelRatio (default: no limit)
  pixelRatioCap?: number;
}

// Canvas size in device pixels (CSS size x devicePixelRatio, for Retina screens), optionally capped
export function physicalCanvasSize(
  canvas: HTMLCanvasElement,
  pixelRatioCap = Infinity,
): { width: number; height: number } {
  const ratio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
  return {
    width: Math.floor(canvas.clientWidth * ratio),
    height: Math.floor(canvas.clientHeight * ratio),
  };
}

let globalJobIdCounter = 0;

export function useFractalWorkers() {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  // Jobs from this hook form one group in the shared pool, so cancelling them
  // does not affect other canvases rendering at the same time.
  const group = useId();

  // When unmounting, we should cancel any pending jobs.
  useEffect(() => {
    return () => {
      getWorkerPool().cancelGroup(group);
    };
  }, [group]);

  const cancelRendering = useCallback(() => {
    getWorkerPool().cancelGroup(group);
    setIsRendering(false);
  }, [group]);

  // Resolves true once every chunk is drawn, or false if the render was cancelled first.
  const renderFractal = useCallback((params: RenderParams): Promise<boolean> => {
    cancelRendering();

    const {
      canvas, type, x_min, x_max, y_min, y_max, max_iter, real = 0, imaginary = 0,
      clear = true, scale = 1, pixelRatioCap,
    } = params;
    const ctx = canvas.getContext('2d', { alpha: false });
    // Below full scale, chunks go to an offscreen canvas that is stretched over the canvas at the end
    const offscreen = scale < 1 ? document.createElement('canvas') : null;
    const chunkCtx = offscreen ? offscreen.getContext('2d') : ctx;
    if (!ctx || !chunkCtx) {
      console.warn('2D canvas context is not available');
      return Promise.resolve(false);
    }

    setElapsed(null);
    setIsRendering(true);
    
    const start_time = performance.now();

    const { width: canvasWidth, height: canvasHeight } = physicalCanvasSize(canvas, pixelRatioCap);
    // Assigning the size clears the canvas, so only do it when the size changed
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
    if (clear) ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // The size to compute; smaller than the canvas when scale < 1
    const renderWidth = Math.max(1, Math.floor(canvasWidth * scale));
    const renderHeight = Math.max(1, Math.floor(canvasHeight * scale));
    if (offscreen) {
      offscreen.width = renderWidth;
      offscreen.height = renderHeight;
    }

    // 8x8 chunks is usually a good balance of job queue distribution
    const chunksX = 8;
    const chunksY = 8;
    
    const totalChunks = chunksX * chunksY;
    let chunksCompleted = 0;

    // Settles once: false at the first cancelled chunk, true after the last chunk is handled
    let settle!: (completed: boolean) => void;
    const completion = new Promise<boolean>((resolve) => {
      settle = resolve;
    });

    const pool = getWorkerPool();

    for (let cy = 0; cy < chunksY; cy++) {
      for (let cx = 0; cx < chunksX; cx++) {
        const chunkW = Math.floor(renderWidth / chunksX);
        const chunkH = Math.floor(renderHeight / chunksY);
        
        const px_x = cx * chunkW;
        const px_y = cy * chunkH;
        const px_w = (cx === chunksX - 1) ? renderWidth - px_x : chunkW;
        const px_h = (cy === chunksY - 1) ? renderHeight - px_y : chunkH;

        const c_x_min = x_min + (x_max - x_min) * (px_x / renderWidth);
        const c_x_max = x_min + (x_max - x_min) * ((px_x + px_w) / renderWidth);
        const c_y_min = y_min + (y_max - y_min) * (px_y / renderHeight);
        const c_y_max = y_min + (y_max - y_min) * ((px_y + px_h) / renderHeight);

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

        pool.submitTask(req, group).then((res) => {
          // null means this render was cancelled; a newer render owns the canvas now
          if (res === null) {
            settle(false);
            return;
          }

          if (res.error) {
            console.warn(`Chunk ${res.id} failed:`, res.error);
          } else if (res.data) {
            const imgData = new ImageData(res.data as any, px_w, px_h);
            chunkCtx.putImageData(imgData, px_x, px_y);
          }
          
          chunksCompleted++;
          if (chunksCompleted === totalChunks) {
            if (offscreen) {
              ctx.imageSmoothingEnabled = true;
              ctx.drawImage(offscreen, 0, 0, canvasWidth, canvasHeight);
            }
            setElapsed(Math.round(performance.now() - start_time));
            setIsRendering(false);
            settle(true);
          }
        });
      }
    }

    return completion;
  }, [cancelRendering, group]);

  return { renderFractal, cancelRendering, elapsed, isRendering };
}
