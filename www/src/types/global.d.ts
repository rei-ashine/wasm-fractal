export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: () => Promise<void>;
    };
    dataLayer: any[];
  }

  interface DedicatedWorkerGlobalScope {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}
