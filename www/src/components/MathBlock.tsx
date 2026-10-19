import React, { useState } from 'react';
import { useMathJax } from '../hooks/useMathJax';

// One copy of the TeX, typeset by MathJax when it mounts. A pending copy is laid out over the
// shown one, out of sight, until it is typeset.
const Typeset: React.FC<{ tex: string; className?: string; pending?: boolean; onTypeset?: () => void }> = ({
  tex, className, pending, onTypeset,
}) => {
  const ref = useMathJax<HTMLDivElement>(onTypeset);
  return (
    <div ref={ref} className={`${className ?? ''}${pending ? ' math-pending' : ''}`} aria-hidden={pending || undefined}>
      {tex}
    </div>
  );
};

// TeX typeset by MathJax. A new string is typeset out of sight while the formula before it
// stays, and replaces it once ready, so the raw TeX never shows in between (the first string
// shows until MathJax has loaded).
const MathBlock: React.FC<{ tex: string; className?: string }> = ({ tex, className }) => {
  const [shown, setShown] = useState(tex);
  // Keyed by their TeX, so the pending copy, typeset, stays the same element once shown
  return (
    <div className="math-block">
      <Typeset key={shown} tex={shown} className={className} />
      {tex !== shown && <Typeset key={tex} tex={tex} className={className} pending onTypeset={() => setShown(tex)} />}
    </div>
  );
};

export default MathBlock;
