import React, { useState } from 'react';
import FractalSimulator from '../components/FractalSimulator';
import { useMathJax } from '../hooks/useMathJax';
import { FractalDefinition, initialC } from '../config/fractalConfig';

// The page of one fractal: its definition typeset by MathJax and a simulator to explore it.
const FractalPage: React.FC<{ fractal: FractalDefinition }> = ({ fractal }) => {
  const mathRef = useMathJax<HTMLDivElement>();
  // The Julia set's c, shown by the formula and rendered by the simulator
  const [c, setC] = useState(() => initialC(fractal));

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
              ${fractal.formula(c).join(' \\\\\n              \\\\[0.01em]\n              ')}
            \\end{align}
            \\end{cases}
          \\]`}
        </div>
      </div>

      <FractalSimulator fractal={fractal} c={c} onCChange={setC} />
    </>
  );
};

export default FractalPage;
