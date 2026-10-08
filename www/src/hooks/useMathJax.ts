import { useLayoutEffect, useRef } from 'react';
import { clearMathJax, typesetMathJax } from '../utils/mathjax';

// Typesets the math inside the returned ref's element on mount, and tells MathJax
// to forget it on unmount (before React removes the DOM).
export function useMathJax<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    typesetMathJax(element);
    return () => clearMathJax(element);
  }, []);

  return ref;
}
