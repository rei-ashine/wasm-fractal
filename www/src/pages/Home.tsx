import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <>
      <div className="mt-3">
        <h1 className="display-4 p-3">Gallery</h1>
      </div>

      <div className="mt-3">
        <div className="row">
          <div className="col-sm-6 mb-4">
            <Link to="/julia">
              <img src="/png/julia.png" width="300" height="300" className="col-sm btn-pop" alt="Julia Set" />
            </Link>
          </div>
          <div className="col-sm-6 mb-4">
            <Link to="/mandelbrot">
              <img src="/png/mandelbrot.png" width="300" height="300" className="col-sm btn-pop" alt="Mandelbrot Set" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
