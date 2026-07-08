import React, { useEffect, useRef, useState } from 'react';

const Julia: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const w = window as any;
    if (w.MathJax && w.MathJax.typesetPromise) {
      w.MathJax.typesetPromise().catch((err: any) => console.log(err));
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isCancelled = false;

    import('wasm-fractal').then((wasm) => {
      if (isCancelled) return;
      
      const { generate_julia_set, get_memory } = wasm;
      const memory = get_memory();
      
      const X_MIN = -2.0;
      const X_MAX = 2.0;
      const Y_MIN = -1.5;
      const Y_MAX = 1.5;
      const MAX_ITER = 1000;
      const REAL = -0.7269;
      const IMAGINARY = 0.1889;

      const context = canvas.getContext('2d');
      if (!context) return;

      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      console.log("[INFO] Draw: Julia set");
      const start_time = Date.now();

      const result = generate_julia_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
      
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
      console.log(`[INFO] Elapsed: ${timeMs}[ms] for Julia set`);
      setElapsed(timeMs);
    }).catch(console.error);

    return () => {
      isCancelled = true;
    };
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
          width="300" 
          height="300" 
          className="btn-pop"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setElapsed(null);
            canvasRef.current?.getContext('2d')?.clearRect(0,0,300,300);
            import('wasm-fractal').then((wasm) => {
              const { generate_julia_set, get_memory } = wasm;
              const result = generate_julia_set(300, 300, -2.0, 2.0, -1.5, 1.5, 1000, -0.7269, 0.1889);
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

export default Julia;
