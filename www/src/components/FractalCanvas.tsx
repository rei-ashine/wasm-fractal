import React, { useCallback, useEffect, useRef } from 'react';
import { useFractalWorkers } from '../hooks/useFractalWorkers';
import { FractalDefinition } from '../config/fractalConfig';

interface FractalCanvasProps {
  fractal: FractalDefinition;
  // Re-render the fractal when the canvas is clicked
  redrawOnClick?: boolean;
}

// A 300x300 canvas that renders its fractal on mount, with the render time below it.
const FractalCanvas: React.FC<FractalCanvasProps> = ({ fractal, redrawOnClick = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderFractal, isRendering, elapsed } = useFractalWorkers();

  const draw = useCallback(() => {
    if (canvasRef.current) {
      renderFractal({ canvas: canvasRef.current, type: fractal.type, ...fractal.view });
    }
  }, [renderFractal, fractal]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="btn-pop"
        style={{
          width: '300px',
          height: '300px',
          borderRadius: '5px',
          cursor: redrawOnClick ? 'pointer' : undefined,
        }}
        onClick={redrawOnClick ? draw : undefined}
      />
      <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
        {isRendering ? 'Rendering...' : (elapsed !== null ? `Rendered in ${elapsed} ms` : '')}
      </p>
    </>
  );
};

export default FractalCanvas;
