export {};

let mathJaxPromise = Promise.resolve();

// Run MathJax calls one after another to avoid "Typeset in progress" errors. Resolves once
// this call is done, failed or not.
const enqueue = (label: string, task: () => unknown): Promise<void> => {
  mathJaxPromise = mathJaxPromise
    .then(task)
    .then(() => undefined)
    .catch((err) => {
      console.warn(`MathJax ${label} failed: `, err);
    });
  return mathJaxPromise;
};

// Resolves once the element is typeset, or at once if MathJax has not loaded yet (its startup
// typesets the whole page then)
export const typesetMathJax = (element: HTMLElement): Promise<void> => {
  const mathJax = window.MathJax;
  if (!mathJax || typeof mathJax.typesetPromise !== 'function') return Promise.resolve();
  // Skip elements that were removed while waiting in the queue
  return enqueue('typeset', () => element.isConnected && mathJax.typesetPromise([element]));
};

export const clearMathJax = (element: HTMLElement) => {
  const mathJax = window.MathJax;
  if (!mathJax || typeof mathJax.typesetClear !== 'function') return;
  // Queued after any typeset still running for this element, so its math is cleared too.
  // This runs after React has removed the element; MathJax still finds the math because
  // it matches math items by containment within the (detached) element.
  enqueue('typesetClear', () => mathJax.typesetClear!([element]));
};
