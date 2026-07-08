function draw(context, canvas_w, canvas_h, result, memory) {
    // This function draws arrays without copying Wasm memory.
    let ptr = result.get_ptr();
    let len = result.get_len();
    let data = new Uint8ClampedArray(memory.buffer, ptr, len);
    let img = new ImageData(data, canvas_w, canvas_h);
    context.putImageData(img, 0, 0);
    
    // Free the memory in Rust
    result.free();
}

console.log("[INFO] Start loading WASM 🚀");
const wasm = import("../pkg").catch(console.error);
console.log("[INFO] End loading WASM ✅");

Promise.all([wasm]).then(async function (
    [{ generate_mandelbrot_set, generate_julia_set, get_memory }]) {
    
    let memory = get_memory();
    // Mandelbrot Set
    let canvas_mandelbrot = document.getElementById("canvas_mandelbrot");
    if (canvas_mandelbrot != null) {
        const X_MIN = -2.0;
        const X_MAX = 1.0;
        const Y_MIN = -1.0;
        const Y_MAX = 1.0;
        const MAX_ITER = 300;
        const REAL = 0.0;
        const IMAGINARY = 0.0;

        let context = canvas_mandelbrot.getContext("2d");
        const canvasWidth = canvas_mandelbrot.clientWidth;
        const canvasHeight = canvas_mandelbrot.clientHeight;

        console.log("[INFO] Draw: Mandelbrot set");
        const start_time = Date.now();

        let result_mandelbrot = generate_mandelbrot_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
        draw(context, canvasWidth, canvasHeight, result_mandelbrot, memory);

        const end_time = Date.now();
        const elapsed = end_time - start_time;
        console.log(`[INFO] Elapsed: ${elapsed}[ms] for Mandelbrot set`);
    }

    // Julia Set
    let canvas_julia = document.getElementById("canvas_julia");
    if (canvas_julia != null) {
        const X_MIN = -2.0;
        const X_MAX = 2.0;
        const Y_MIN = -1.5;
        const Y_MAX = 1.5;
        const MAX_ITER = 1000;
        const REAL = -0.7269;
        const IMAGINARY = 0.1889;

        let context = canvas_julia.getContext("2d");
        const canvasWidth = canvas_julia.clientWidth;
        const canvasHeight = canvas_julia.clientHeight;

        console.log("[INFO] Draw: Julia set");
        const start_time = Date.now();

        let result_julia = generate_julia_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
        draw(context, canvasWidth, canvasHeight, result_julia, memory);

        const end_time = Date.now();
        const elapsed = end_time - start_time;
        console.log(`[INFO] Elapsed: ${elapsed}[ms] for Julia set`);
    }
});
