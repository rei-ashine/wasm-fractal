export {};

let mathJaxPromise = Promise.resolve();

export const typesetMathJax = (element: HTMLElement) => {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    // Chain the promise to ensure sequential execution and avoid "Typeset in progress" errors
    mathJaxPromise = mathJaxPromise
      .then(() => window.MathJax!.typesetPromise!([element]))
      .catch((err) => {
        console.warn('MathJax Typeset failed: ', err);
      });
  }
};

export const clearMathJax = (element: HTMLElement) => {
  if (window.MathJax && typeof window.MathJax.typesetClear === 'function') {
    // Forget the math in a container that is being removed, so MathJax does not keep
    // references to it. Chained so it never runs in the middle of a typeset.
    mathJaxPromise = mathJaxPromise
      .then(() => window.MathJax!.typesetClear!([element]))
      .catch((err) => {
        console.warn('MathJax typesetClear failed: ', err);
      });
  }
};
