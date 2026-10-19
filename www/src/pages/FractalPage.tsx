import React, { useState } from 'react';
import FractalSimulator from '../components/FractalSimulator';
import MathBlock from '../components/MathBlock';
import { useMathJax } from '../hooks/useMathJax';
import { FractalDefinition, initialC } from '../config/fractalConfig';
import { usePageTitle } from '../hooks/usePageTitle';

// The page of one fractal: its definition typeset by MathJax and a simulator to explore it.
const FractalPage: React.FC<{ fractal: FractalDefinition }> = ({ fractal }) => {
  usePageTitle(fractal.title);
  const mathRef = useMathJax<HTMLDivElement>();
  // The Julia set's c, shown by the formula and rendered by the simulator
  const [c, setC] = useState(() => initialC(fractal));
  const tex = `\\[
            \\begin{cases}
            \\begin{align}
              ${fractal.formula(c).join(' \\\\\n              \\\\[0.01em]\n              ')}
            \\end{align}
            \\end{cases}
          \\]`;

  return (
    <>
      <div className="mt-3">
        <h1 className="display-4">{fractal.title}</h1>
      </div>

      <div ref={mathRef} className="lead mt-3">
        {`A complex number \\( ${fractal.variable} \\) `}<br className="d-md-none" />
        {`is in ${fractal.setName} if,`}<br />
        {'as \\( n \\) → \\( \\infty \\), \\( z_n \\) does not'}<br className="d-md-none" />
        diverge where :
      </div>

      {/* A new c makes a new formula, which MathBlock typesets before it replaces the old one */}
      <MathBlock tex={tex} className="lead" />

      <FractalSimulator fractal={fractal} c={c} onCChange={setC} />
    </>
  );
};

export default FractalPage;
