export {};

let mathJaxPromise = Promise.resolve();

// Run MathJax calls one after another to avoid "Typeset in progress" errors.
const enqueue = (label: string, task: () => unknown) => {
  mathJaxPromise = mathJaxPromise
    .then(task)
    .then(() => undefined)
    .catch((err) => {
      console.warn(`MathJax ${label} failed: `, err);
    });
};

export const typesetMathJax = (element: HTMLElement) => {
  const mathJax = window.MathJax;
  if (!mathJax || typeof mathJax.typesetPromise !== 'function') return;
  // Skip elements that were removed while waiting in the queue
  enqueue('typeset', () => element.isConnected && mathJax.typesetPromise([element]));
};

export const clearMathJax = (element: HTMLElement) => {
  const mathJax = window.MathJax;
  if (!mathJax || typeof mathJax.typesetClear !== 'function') return;
  // Queued after any typeset still running for this element, so its math is cleared too.
  // This runs after React has removed the element; MathJax still finds the math because
  // it matches math items by containment within the (detached) element.
  enqueue('typesetClear', () => mathJax.typesetClear!([element]));
};
