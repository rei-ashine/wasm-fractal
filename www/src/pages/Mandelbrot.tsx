import React, { useEffect, useRef, useState } from 'react';

const Mandelbrot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    // MathJax Typesetting
    const w = window as any;
    if (w.MathJax && w.MathJax.typesetPromise) {
      w.MathJax.typesetPromise().catch((err: any) => console.log(err));
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isCancelled = false;

    import('wasm-fractal').then((wasm) => {
      if (isCancelled) return;
      
      const { generate_mandelbrot_set, get_memory } = wasm;
      const memory = get_memory();
      
      const X_MIN = -2.0;
      const X_MAX = 1.0;
      const Y_MIN = -1.0;
      const Y_MAX = 1.0;
      const MAX_ITER = 300;
      const REAL = 0.0;
      const IMAGINARY = 0.0;

      const context = canvas.getContext('2d');
      if (!context) return;

      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      console.log("[INFO] Draw: Mandelbrot set");
      const start_time = Date.now();

      const result = generate_mandelbrot_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
      
      try {
        const ptr = result.get_ptr();
        const len = result.get_len();
        const data = new Uint8ClampedArray(memory.buffer, ptr, len);
        const img = new ImageData(data, canvasWidth, canvasHeight);
        context.putImageData(img, 0, 0);
      } finally {
        result.free();
      }

      const end_time = Date.now();
      const timeMs = end_time - start_time;
      console.log(`[INFO] Elapsed: ${timeMs}[ms] for Mandelbrot set`);
      setElapsed(timeMs);
    }).catch(console.error);

    return () => {
      isCancelled = true;
    };
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
          width="300" 
          height="300" 
          className="btn-pop"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            // Optional: re-render on click
            setElapsed(null);
            canvasRef.current?.getContext('2d')?.clearRect(0,0,300,300);
            import('wasm-fractal').then((wasm) => {
              const { generate_mandelbrot_set, get_memory } = wasm;
              const result = generate_mandelbrot_set(300, 300, -2.0, 1.0, -1.0, 1.0, 300, 0.0, 0.0);
              try {
                const data = new Uint8ClampedArray(get_memory().buffer, result.get_ptr(), result.get_len());
                canvasRef.current?.getContext('2d')?.putImageData(new ImageData(data, 300, 300), 0, 0);
              } finally {
                result.free();
              }
            });
          }}
        ></canvas>
        {elapsed !== null && <p className="mt-2 text-muted" style={{fontSize: '0.8rem'}}>Rendered in {elapsed} ms</p>}
      </div>
    </>
  );
};

export default Mandelbrot;
