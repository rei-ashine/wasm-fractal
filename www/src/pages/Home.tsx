import React from 'react';
import { Link } from 'react-router-dom';
import FractalCanvas from '../components/FractalCanvas';
import { FRACTALS } from '../config/fractalConfig';

const Home: React.FC = () => {
  return (
    <>
      <div className="mt-3">
        <h1 className="display-4 p-3">Gallery</h1>
      </div>

      <div className="mt-3">
        <div className="row">
          {FRACTALS.map((fractal) => (
            <div key={fractal.type} className="col-sm-6 mb-4">
              <Link to={`/${fractal.path}`} style={{ textDecoration: 'none' }}>
                <FractalCanvas fractal={fractal} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Home;
