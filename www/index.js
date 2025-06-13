function draw(context, canvas_w, canvas_h, data) {
    // This function draws arrays.
    let img = new ImageData(new Uint8ClampedArray(data), canvas_w, canvas_h);
    context.putImageData(img, 0, 0);
}

console.log("[INFO] Start loading WASM 🚀");
const wasm = import("../wasm-dist").catch(console.error);
console.log("[INFO] End loading WASM ✅");

Promise.all([wasm]).then(async function (
    [{ generate_mandelbrot_set }]) {
    const X_MIN = -2.0;
    const X_MAX = 1.0;
    const Y_MIN = -1.0;
    const Y_MAX = 1.0;
    const MAX_ITER = 300;
    // Initial value of z_0
    const REAL = 0.0;
    const IMAGINARY = 0.0;
    {
        let result_mandelbrot = null;
        const CANVAS_ID = "canvas_mandelbrot";
        let canvas = document.getElementById(CANVAS_ID);

        if (canvas != null) {
            let context = canvas.getContext("2d");
            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;

            console.log("[INFO] Draw: Mandelbrot set");
            const start_time = Date.now();

            result_mandelbrot = generate_mandelbrot_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
            draw(context, canvasWidth, canvasHeight, result_mandelbrot);

            const end_time = Date.now();
            const elapsed = end_time - start_time;
            console.log(`[INFO] Elapsed: ${elapsed}[ms] for Mandelbrot set`);
        }
    }
});

Promise.all([wasm]).then(async function (
    [{ generate_julia_set }]) {
    const X_MIN = -2.0;
    const X_MAX = 2.0;
    const Y_MIN = -1.5;
    const Y_MAX = 1.5;
    const MAX_ITER = 1000;
    // Initial value of c
    const REAL = -0.7269;
    const IMAGINARY = 0.1889;
    {
        let result_julia = null;
        const CANVAS_ID = "canvas_julia";
        let canvas = document.getElementById(CANVAS_ID);

        if (canvas != null) {
            let context = canvas.getContext("2d");
            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;

            console.log("[INFO] Draw: Julia set");
            const start_time = Date.now();

            result_julia = generate_julia_set(canvasWidth, canvasHeight, X_MIN, X_MAX, Y_MIN, Y_MAX, MAX_ITER, REAL, IMAGINARY);
            draw(context, canvasWidth, canvasHeight, result_julia);

            const end_time = Date.now();
            const elapsed = end_time - start_time;
            console.log(`[INFO] Elapsed: ${elapsed}[ms] for Julia set`);
        }
    }
});
