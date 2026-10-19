import { useEffect, useRef } from 'react';
import { clearMathJax, typesetMathJax } from '../utils/mathjax';

// Typesets the math inside the returned ref's element on mount, then calls onTypeset (unless
// it has unmounted by then), and tells MathJax to forget it on unmount.
export function useMathJax<T extends HTMLElement>(onTypeset?: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let mounted = true;
    typesetMathJax(element).then(() => {
      if (mounted) onTypeset?.();
    });
    return () => {
      mounted = false;
      clearMathJax(element);
    };
  }, []);

  return ref;
}
