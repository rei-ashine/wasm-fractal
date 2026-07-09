import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFractalWorkers } from '../hooks/useFractalWorkers';
import { FRACTAL_CONFIG } from '../config/fractalConfig';

const Home: React.FC = () => {
  const juliaRef = useRef<HTMLCanvasElement>(null);
  const mandelbrotRef = useRef<HTMLCanvasElement>(null);
  const juliaWorkers = useFractalWorkers('julia');
  const mandelbrotWorkers = useFractalWorkers('mandelbrot');

  useEffect(() => {
    if (juliaRef.current) {
      juliaWorkers.renderFractal({
        canvas: juliaRef.current,
        type: 'julia',
        ...FRACTAL_CONFIG.julia
      });
    }
    if (mandelbrotRef.current) {
      mandelbrotWorkers.renderFractal({
        canvas: mandelbrotRef.current,
        type: 'mandelbrot',
        ...FRACTAL_CONFIG.mandelbrot
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="mt-3">
        <h1 className="display-4 p-3">Gallery</h1>
      </div>

      <div className="mt-3">
        <div className="row">
          <div className="col-sm-6 mb-4">
            <Link to="/julia" style={{ textDecoration: 'none' }}>
              <canvas 
                ref={juliaRef} 
                className="col-sm btn-pop" 
                style={{ width: '300px', height: '300px', borderRadius: '5px' }} 
              />
              <p className="text-muted mt-2" style={{fontSize: '0.8rem'}}>
                {juliaWorkers.isRendering ? 'Rendering...' : (juliaWorkers.elapsed !== null ? `Rendered in ${juliaWorkers.elapsed} ms` : '')}
              </p>
            </Link>
          </div>
          <div className="col-sm-6 mb-4">
            <Link to="/mandelbrot" style={{ textDecoration: 'none' }}>
              <canvas 
                ref={mandelbrotRef} 
                className="col-sm btn-pop" 
                style={{ width: '300px', height: '300px', borderRadius: '5px' }} 
              />
              <p className="text-muted mt-2" style={{fontSize: '0.8rem'}}>
                {mandelbrotWorkers.isRendering ? 'Rendering...' : (mandelbrotWorkers.elapsed !== null ? `Rendered in ${mandelbrotWorkers.elapsed} ms` : '')}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
