import React from 'react';
import { useMathJax } from '../hooks/useMathJax';

// TeX typeset once by MathJax when it mounts. Give it key={tex} so that a new string
// mounts a new block, which is typeset again (and the old one cleared).
const MathBlock: React.FC<{ tex: string; className?: string }> = ({ tex, className }) => {
  const ref = useMathJax<HTMLDivElement>();
  return <div ref={ref} className={className}>{tex}</div>;
};

export default MathBlock;
