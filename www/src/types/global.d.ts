export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (elements?: (HTMLElement | string)[]) => Promise<void>;
      typesetClear?: (elements?: (HTMLElement | string)[]) => void;
    };
    dataLayer: any[];
  }

  interface DedicatedWorkerGlobalScope {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}
