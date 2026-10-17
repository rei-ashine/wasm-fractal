import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Complex } from '../config/fractalConfig';
import type { FractalType } from '../workers/fractalWorker';
import { Range, previewTransform } from '../utils/viewMath';
import { physicalCanvasSize, useFractalWorkers } from './useFractalWorkers';

// devicePixelRatio is capped at 2: a 3x phone screen is slightly coarser, but renders in about half the time
export const PIXEL_RATIO_CAP = 2;
// The quick pass computes this fraction of the resolution, without antialiasing
export const QUICK_SCALE = 0.25;
// A narrower canvas (not laid out, or hidden) is not rendered: its quick pass would be under
// 8 px, so some of the 8x8 chunks would be empty
const MIN_RENDER_PIXELS = 32;

// What a render draws: the region of the plane, the iteration limit and the Julia set's c
export interface Scene {
  range: Range;
  maxIter: number;
  c: Complex;
}

export type RenderStatus = { kind: 'idle' } | { kind: 'rendering' } | { kind: 'done'; ms: number };

// Draws the simulator canvas. preview shows another range at once by moving the last image,
// without computing anything; render draws a scene with a quick low-resolution pass and then
// the full pass, each over the image already on the canvas.
export function useSimulatorCanvas(type: FractalType, canvasRef: RefObject<HTMLCanvasElement>): {
  preview: (range: Range) => void;
  render: (scene: Scene) => void;
  status: RenderStatus;
} {
  const { renderFractal, cancelRendering } = useFractalWorkers();
  const [status, setStatus] = useState<RenderStatus>({ kind: 'idle' });

  // The scene last passed to render: the canvas shows its range
  const sceneRef = useRef<Scene | null>(null);
  // A copy of the canvas taken when a preview starts, and the range it shows
  const snapshotRef = useRef<{ image: HTMLCanvasElement; range: Range } | null>(null);
  // The range to preview at the next animation frame, and that frame's request
  const pendingRangeRef = useRef<Range | null>(null);
  const rafRef = useRef<number | null>(null);
  // Bumped when a render or a preview starts and on unmount, so the passes of an older render stop
  const tokenRef = useRef(0);
  // The canvas side in physical pixels when the last render started
  const renderedSizeRef = useRef(0);

  const drawPreview = useCallback(() => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    const snapshot = snapshotRef.current;
    const range = pendingRangeRef.current;
    if (!canvas || !ctx || !snapshot || !range) return;
    const t = previewTransform(snapshot.range, range, canvas.width);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(snapshot.image, t.x, t.y, t.size, t.size);
  }, [canvasRef]);

  const preview = useCallback((range: Range) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    if (!snapshotRef.current) {
      // Stop the render in progress and keep the image now on the canvas to move around
      cancelRendering();
      tokenRef.current++;
      const image = document.createElement('canvas');
      image.width = canvas.width;
      image.height = canvas.height;
      image.getContext('2d')?.drawImage(canvas, 0, 0);
      snapshotRef.current = { image, range: scene.range };
      setStatus({ kind: 'idle' });
    }
    pendingRangeRef.current = range;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(drawPreview);
  }, [canvasRef, cancelRendering, drawPreview]);

  const render = useCallback((scene: Scene) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Draw a scheduled preview now, so the passes start over the image of the new range
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      drawPreview();
    }
    snapshotRef.current = null;
    sceneRef.current = scene;
    const token = ++tokenRef.current;
    const size = physicalCanvasSize(canvas, PIXEL_RATIO_CAP).width;
    renderedSizeRef.current = size;
    if (size < MIN_RENDER_PIXELS) {
      // The ResizeObserver renders the scene once the canvas has a size
      cancelRendering();
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'rendering' });
    const start = performance.now();
    const params = {
      canvas, type, ...scene.range, max_iter: scene.maxIter, real: scene.c.re, imaginary: scene.c.im,
      clear: false, pixelRatioCap: PIXEL_RATIO_CAP,
    };
    // false means cancelled, and a new token means a newer render, a preview or unmounting
    // took over the canvas; either way this render stops. Cancelled while still the latest
    // render (nothing else took over), it is not rendering any more
    void (async () => {
      const quick = await renderFractal({ ...params, scale: QUICK_SCALE, aa_level: 1 });
      if (token !== tokenRef.current) return;
      if (!quick) { setStatus({ kind: 'idle' }); return; }
      const full = await renderFractal({ ...params, aa_level: 3 });
      if (token !== tokenRef.current) return;
      if (!full) { setStatus({ kind: 'idle' }); return; }
      setStatus({ kind: 'done', ms: Math.round(performance.now() - start) });
    })();
  }, [canvasRef, type, renderFractal, cancelRendering, drawPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // A new size (rotating a phone, resizing the window) renders the scene again at that size
    const observer = new ResizeObserver(() => {
      const scene = sceneRef.current;
      if (scene && physicalCanvasSize(canvas, PIXEL_RATIO_CAP).width !== renderedSizeRef.current) render(scene);
    });
    observer.observe(canvas);
    return () => {
      // Leaving the page drops the scheduled preview and the passes still running
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      tokenRef.current++;
    };
  }, [canvasRef, render]);

  return { preview, render, status };
}
