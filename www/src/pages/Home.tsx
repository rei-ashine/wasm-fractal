import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFractalWorkers } from '../hooks/useFractalWorkers';

const Home: React.FC = () => {
  const juliaRef = useRef<HTMLCanvasElement>(null);
  const mandelbrotRef = useRef<HTMLCanvasElement>(null);
  const juliaWorkers = useFractalWorkers();
  const mandelbrotWorkers = useFractalWorkers();

  useEffect(() => {
    if (juliaRef.current) {
      juliaWorkers.renderFractal({
        canvas: juliaRef.current,
        type: 'julia',
        x_min: -2.0,
        x_max: 2.0,
        y_min: -1.5,
        y_max: 1.5,
        max_iter: 1000,
        real: -0.7269,
        imaginary: 0.1889
      });
    }
    if (mandelbrotRef.current) {
      mandelbrotWorkers.renderFractal({
        canvas: mandelbrotRef.current,
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
