export type FractalType = 'mandelbrot' | 'julia';

export interface WorkerRequest {
  id: number;
  type: FractalType;
  width: number;
  height: number;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  max_iter: number;
  real: number;
  imaginary: number;
}

export interface WorkerResponse {
  id: number;
  data: Uint8ClampedArray;
}

// Keep a cached reference to wasm once loaded
let wasmModule: typeof import('wasm-fractal') | null = null;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  try {
    if (!wasmModule) {
      wasmModule = await import('wasm-fractal');
    }
    
    let result;
    if (req.type === 'mandelbrot') {
      result = wasmModule.generate_mandelbrot_set(
        req.width, req.height,
        req.x_min, req.x_max,
        req.y_min, req.y_max,
        req.max_iter, req.real, req.imaginary
      );
    } else {
      result = wasmModule.generate_julia_set(
        req.width, req.height,
        req.x_min, req.x_max,
        req.y_min, req.y_max,
        req.max_iter, req.real, req.imaginary
      );
    }

    try {
      const memory = wasmModule.get_memory();
      const ptr = result.get_ptr();
      const len = result.get_len();
      
      // View the WASM memory directly
      const wasmView = new Uint8ClampedArray(memory.buffer, ptr, len);
      
      // Create a copy because we cannot transfer WASM memory, and we need to free it immediately
      const dataCopy = new Uint8ClampedArray(wasmView);
      
      // Transfer the copied buffer to the main thread for zero-copy postMessage
      self.postMessage({ id: req.id, data: dataCopy } as WorkerResponse, [dataCopy.buffer]);
    } finally {
      result.free();
    }
  } catch (err) {
    console.error("Worker error:", err);
  }
};
