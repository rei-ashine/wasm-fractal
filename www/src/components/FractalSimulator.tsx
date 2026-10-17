import React, { useEffect, useRef, useState } from 'react';
import SimulatorControls from './SimulatorControls';
import { Complex, FractalDefinition, initialC } from '../config/fractalConfig';
import { physicalCanvasSize } from '../hooks/useFractalWorkers';
import { PIXEL_RATIO_CAP, RenderStatus, Scene, useSimulatorCanvas } from '../hooks/useSimulatorCanvas';
import {
  Range, autoMaxIter, formatZoom, isAtMaxZoom, limitsFor, rangesEqual, zoomAt, zoomOf,
} from '../utils/viewMath';

interface FractalSimulatorProps {
  fractal: FractalDefinition;
  // The Julia set's c; the other fractals ignore it
  c: Complex;
  onCChange: (c: Complex) => void;
}

function statusText(status: RenderStatus): string {
  if (status.kind === 'rendering') return 'Rendering...';
  if (status.kind === 'done') return `Rendered in ${status.ms} ms`;
  return '';
}

function sameScene(a: Scene, b: Scene): boolean {
  return rangesEqual(a.range, b.range) && a.maxIter === b.maxIter && a.c.re === b.c.re && a.c.im === b.c.im;
}

// The zoomable canvas of a fractal page. It owns the view: a new view is shown at once by
// moving the last image (preview), then commit renders it.
const FractalSimulator: React.FC<FractalSimulatorProps> = ({ fractal, c, onCChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { preview, render, status } = useSimulatorCanvas(fractal.type, canvasRef);

  // The view's own four values, so the initial range is bit-identical to the config
  const { x_min, x_max, y_min, y_max, max_iter } = fractal.view;
  const initialRange: Range = { x_min, x_max, y_min, y_max };
  // The initial width is zoom 1
  const w0 = x_max - x_min;

  // rangeRef is the view the handlers work on, range its copy for display
  const rangeRef = useRef<Range>(initialRange);
  const [range, setRange] = useState<Range>(initialRange);
  // The scene last passed to render, or null once a preview has replaced its image
  const lastSceneRef = useRef<Scene | null>(null);

  const limits = () => {
    const canvas = canvasRef.current;
    return limitsFor(canvas ? physicalCanvasSize(canvas, PIXEL_RATIO_CAP).width : 0);
  };

  // Renders the view with this c, unless that is the scene last rendered
  const commit = (view: Range, nextC: Complex) => {
    const scene: Scene = { range: view, maxIter: autoMaxIter(max_iter, zoomOf(view, w0)), c: nextC };
    if (lastSceneRef.current && sameScene(lastSceneRef.current, scene)) return;
    lastSceneRef.current = scene;
    render(scene);
  };

  // Shows the view at once by moving the last image. The preview stops the render in progress,
  // so the next commit renders even if it comes back to the scene last rendered. A view that
  // does not change (a button at a limit, Reset on the initial view) keeps that render going.
  const previewView = (view: Range) => {
    if (rangesEqual(view, rangeRef.current)) return;
    rangeRef.current = view;
    lastSceneRef.current = null;
    preview(view);
  };

  const moveTo = (view: Range, nextC: Complex) => {
    previewView(view);
    setRange(view);
    commit(view, nextC);
  };

  // + and − zoom about the center of the canvas (a canvas without a size has no center)
  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.clientWidth === 0) return;
    const size = canvas.clientWidth;
    moveTo(zoomAt(rangeRef.current, size / 2, size / 2, factor, size, limits()), c);
  };

  // The scene is rendered with the initial c right away; when the c prop follows,
  // commit finds the same scene and does not render it twice
  const reset = () => {
    const c0 = initialC(fractal);
    onCChange(c0);
    moveTo(initialRange, c0);
  };

  // In development StrictMode mounts twice, and the cleanup in between cancels the first
  // render; forgetting its scene makes the second mount render again
  useEffect(() => () => {
    lastSceneRef.current = null;
  }, []);

  // The first render when the page opens, and a new one when c changes
  useEffect(() => {
    commit(rangeRef.current, c);
  }, [c]);

  const zoomLabel = `×${formatZoom(zoomOf(range, w0))}${isAtMaxZoom(range, limits()) ? ' (max)' : ''}`;

  return (
    <div className="fractal-simulator mt-3">
      <canvas ref={canvasRef} aria-label="Fractal simulator: drag to move, scroll or pinch to zoom" />
      <SimulatorControls
        zoomLabel={zoomLabel}
        status={statusText(status)}
        onZoomIn={() => zoomBy(2)}
        onZoomOut={() => zoomBy(0.5)}
        onReset={reset}
      />
    </div>
  );
};

export default FractalSimulator;
