import React, { useEffect, useRef, useState } from 'react';
import SimulatorControls, { AppliedValues, ControlValues } from './SimulatorControls';
import { Complex, FractalDefinition, initialC } from '../config/fractalConfig';
import { physicalCanvasSize } from '../hooks/useFractalWorkers';
import { PIXEL_RATIO_CAP, RenderStatus, Scene, useSimulatorCanvas } from '../hooks/useSimulatorCanvas';
import {
  Range, autoMaxIter, clampManualMaxIter, formatCenter, formatZoom, isAtMaxZoom, limitsFor, rangeCenter,
  rangeFromCenter, rangeWidth, rangesEqual, zoomAt, zoomOf,
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

// The iteration limit: the zoom's own (Auto), or the one typed in
interface MaxIterSetting {
  auto: boolean;
  manualMaxIter: number;
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
  // iterRef is the setting the handlers work on, iter its copy for display
  const iterRef = useRef<MaxIterSetting>({ auto: true, manualMaxIter: max_iter });
  const [iter, setIterState] = useState<MaxIterSetting>(iterRef.current);
  const setIter = (next: MaxIterSetting) => {
    iterRef.current = next;
    setIterState(next);
  };
  const maxIterFor = (view: Range, setting: MaxIterSetting) =>
    setting.auto ? autoMaxIter(max_iter, zoomOf(view, w0)) : setting.manualMaxIter;

  const limits = () => {
    const canvas = canvasRef.current;
    return limitsFor(canvas ? physicalCanvasSize(canvas, PIXEL_RATIO_CAP).width : 0);
  };

  // Renders the view with this c and the current iteration setting, unless that is the scene last rendered
  const commit = (view: Range, nextC: Complex) => {
    const scene: Scene = { range: view, maxIter: maxIterFor(view, iterRef.current), c: nextC };
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
    setIter({ auto: true, manualMaxIter: max_iter });
    onCChange(c0);
    moveTo(initialRange, c0);
  };

  // Enter or Go in the inputs. Everything typed is applied by one commit; as with Reset,
  // the c prop that follows finds that scene already rendered. A new c alone keeps the
  // image on the canvas until the passes draw over it, since it changes the shape itself.
  const apply = (v: AppliedValues) => {
    let view = rangeRef.current;
    if (v.centerRe !== null || v.centerIm !== null || v.zoom !== null) {
      const center = rangeCenter(view);
      view = rangeFromCenter(v.centerRe ?? center.x, v.centerIm ?? center.y, v.zoom ?? zoomOf(view, w0), w0, limits());
      previewView(view);
      setRange(view);
    }
    if (v.maxIter !== null) setIter({ auto: false, manualMaxIter: clampManualMaxIter(v.maxIter) });
    if (v.c !== null) onCChange(v.c);
    commit(view, v.c ?? c);
  };

  // Turning Auto on renders with the zoom's own limit. Turning it off keeps the limit in use,
  // so there is nothing to render.
  const changeAuto = (auto: boolean) => {
    if (auto) {
      setIter({ ...iterRef.current, auto: true });
      commit(rangeRef.current, c);
    } else {
      setIter({ auto: false, manualMaxIter: maxIterFor(rangeRef.current, iterRef.current) });
    }
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

  const zoom = zoomOf(range, w0);
  const zoomLabel = `×${formatZoom(zoom)}${isAtMaxZoom(range, limits()) ? ' (max)' : ''}`;
  // The center has as many decimals as the width of one physical pixel needs
  const center = rangeCenter(range);
  const pixelWidth = rangeWidth(range) / limits().pixels;
  const showC = fractal.type === 'julia';
  const values: ControlValues = {
    centerRe: formatCenter(center.x, pixelWidth),
    centerIm: formatCenter(center.y, pixelWidth),
    zoom: formatZoom(zoom),
    maxIter: String(maxIterFor(range, iter)),
    auto: iter.auto,
    ...(showC ? { cRe: String(c.re), cIm: String(c.im) } : {}),
  };

  return (
    <div className="fractal-simulator mt-3">
      <canvas ref={canvasRef} aria-label="Fractal simulator: drag to move, scroll or pinch to zoom" />
      <SimulatorControls
        values={values}
        zoomLabel={zoomLabel}
        status={statusText(status)}
        showC={showC}
        onZoomIn={() => zoomBy(2)}
        onZoomOut={() => zoomBy(0.5)}
        onReset={reset}
        onAutoChange={changeAuto}
        onApply={apply}
      />
    </div>
  );
};

export default FractalSimulator;
