import React, { useEffect, useRef } from 'react';
import { useFractalWorkers } from '../hooks/useFractalWorkers';
import { typesetMathJax } from '../utils/mathjax';
import { FRACTAL_CONFIG } from '../config/fractalConfig';

const Julia: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workers = useFractalWorkers('julia');

  const draw = () => {
    if (canvasRef.current) {
      workers.renderFractal({
        canvas: canvasRef.current,
        type: 'julia',
        ...FRACTAL_CONFIG.julia
      });
    }
  };

  useEffect(() => {
    typesetMathJax();
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mt-3">
        <h1 className="display-4">Julia Set</h1>
      </div>

      <div className="lead mt-3">
        A complex number \( z_0 \) <br className="d-md-none" />
        is in the filled-in Julia set if,<br />
        as \( i \) → \( \infty \), \( z_i \) does not<br className="d-md-none" />
        diverge where :
      </div>

      <div className="lead">
        {`\\[
        \\begin{cases}
        \\begin{align}
          \\space z_i &= z_{i-1}^2 + \\space c \\\\
          \\\\[0.01em]
          c \\space &= -0.7269 + 0.1889 \\space i
        \\end{align}
        \\end{cases}
        \\]`}
      </div>

      <div className="mt-3">
        <canvas 
          ref={canvasRef} 
          className="btn-pop"
          style={{ width: '300px', height: '300px', cursor: 'pointer', borderRadius: '5px' }}
          onClick={draw}
        ></canvas>
        <p className="mt-2 text-muted" style={{fontSize: '0.8rem'}}>
          {workers.isRendering ? 'Rendering...' : (workers.elapsed !== null ? `Rendered in ${workers.elapsed} ms` : '')}
        </p>
      </div>
    </>
  );
};

export default Julia;
