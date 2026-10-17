import React, { useEffect, useRef } from 'react';
import { useFractalWorkers } from '../hooks/useFractalWorkers';
import { FractalDefinition } from '../config/fractalConfig';

interface FractalCanvasProps {
  fractal: FractalDefinition;
}

// A 300x300 gallery canvas that renders its fractal on mount, with the render time below it.
const FractalCanvas: React.FC<FractalCanvasProps> = ({ fractal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { renderFractal, isRendering, elapsed } = useFractalWorkers();

  useEffect(() => {
    if (canvasRef.current) {
      renderFractal({ canvas: canvasRef.current, type: fractal.type, ...fractal.view });
    }
  }, [renderFractal, fractal]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="btn-pop"
        style={{
          width: '300px',
          height: '300px',
          borderRadius: '5px',
        }}
      />
      <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
        {isRendering ? 'Rendering...' : (elapsed !== null ? `Rendered in ${elapsed} ms` : '')}
      </p>
    </>
  );
};

export default FractalCanvas;
