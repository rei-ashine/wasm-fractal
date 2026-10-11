import React from 'react';
import FractalCanvas from '../components/FractalCanvas';
import { useMathJax } from '../hooks/useMathJax';
import { FractalDefinition } from '../config/fractalConfig';

// The page of one fractal: its definition typeset by MathJax and a canvas to render it.
const FractalPage: React.FC<{ fractal: FractalDefinition }> = ({ fractal }) => {
  const mathRef = useMathJax<HTMLDivElement>();

  return (
    <>
      <div className="mt-3">
        <h1 className="display-4">{fractal.title}</h1>
      </div>

      <div ref={mathRef}>
        <div className="lead mt-3">
          {`A complex number \\( ${fractal.variable} \\) `}<br className="d-md-none" />
          {`is in ${fractal.setName} if,`}<br />
          {'as \\( n \\) → \\( \\infty \\), \\( z_n \\) does not'}<br className="d-md-none" />
          diverge where :
        </div>

        <div className="lead">
          {`\\[
            \\begin{cases}
            \\begin{align}
              ${fractal.formula.join(' \\\\\n              \\\\[0.01em]\n              ')}
            \\end{align}
            \\end{cases}
          \\]`}
        </div>
      </div>

      <div className="mt-3">
        <FractalCanvas fractal={fractal} redrawOnClick />
      </div>
    </>
  );
};

export default FractalPage;
