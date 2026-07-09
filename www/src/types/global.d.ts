export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: () => Promise<void>;
    };
  }

  interface DedicatedWorkerGlobalScope {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}
