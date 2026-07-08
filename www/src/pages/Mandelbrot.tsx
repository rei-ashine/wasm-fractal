import React, { useEffect, useRef } from 'react';
import { useFractalWorkers } from '../hooks/useFractalWorkers';

const Mandelbrot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workers = useFractalWorkers();

  const draw = () => {
    if (canvasRef.current) {
      workers.renderFractal({
        canvas: canvasRef.current,
        type: 'mandelbrot',
        x_min: -2.0,
        x_max: 1.0,
        y_min: -1.0,
        y_max: 1.0,
        max_iter: 300,
        real: 0.0,
        imaginary: 0.0
      });
    }
  };

  useEffect(() => {
    // MathJax Typesetting
    const w = window as any;
    if (w.MathJax && w.MathJax.typesetPromise) {
      w.MathJax.typesetPromise().catch((err: any) => console.log(err));
    }
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mt-3">
        <h1 className="display-4">Mandelbrot Set</h1>
      </div>

      <div className="lead mt-3">
        A complex number \( c \) <br className="d-md-none" />
        is in the Mandelbrot set if,<br />
        as \( i \) → \( \infty \), \( z_i \) does not<br className="d-md-none" />
        diverge where :
      </div>

      <div className="lead">
        {`\\[
          z_i =
          \\begin{cases}
            \\space z_{i-1}^2 + \\space c & (i \\geqq 1) \\\\
            \\\\[0.01em]
            \\space 0 & (i = 0)
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

export default Mandelbrot;
