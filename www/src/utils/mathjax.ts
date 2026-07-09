export {};

let mathJaxPromise = Promise.resolve();

export const typesetMathJax = () => {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    // Chain the promise to ensure sequential execution and avoid "Typeset in progress" errors
    mathJaxPromise = mathJaxPromise
      .then(() => window.MathJax!.typesetPromise!())
      .catch((err) => {
        console.warn('MathJax Typeset failed: ', err);
      });
  }
};
