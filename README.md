# [WASM-Fractal](https://rei-ashine.github.io/wasm-fractal/)

DATE: Jul. 8th, 2026

![WASM-Fractal](./PNG/WASM-Fractal.png)

## Features & Optimizations

- **High-Performance Rust (WASM)**: Optimized algebraic calculations for the Julia set, the Mandelbrot set, the Burning Ship fractal and the Celtic Mandelbrot set, early escape checks (Cardioid & Period-2 Bulb) specifically for generating the Mandelbrot set, and exact orbit periodicity checks that stop cycling orbits early for the Mandelbrot set, the Burning Ship fractal and the Celtic Mandelbrot set without changing any result.
- **Multithreaded Rendering**: Leverages Web Workers (`navigator.hardwareConcurrency`) for parallel rendering to keep the React UI smooth.
- **Professional MathJax Integration**: Displays exact mathematical notations for fractals ($z_{n+1} = z_n^2 + c$) using robust React Promise chaining to prevent race conditions.
- **Google Tag Manager (GTM) Ready**: Built-in support for GTM and GA4 analytics through strict TypeScript definitions (`global.d.ts`).
- **Zero-Copy Data Transfer**: Uses Transferable Objects for fast pixel data transfer from Workers to the Canvas.
- **Zoomable Simulator**: Each fractal page can be zoomed and panned with the mouse wheel, drag, pinch and double tap, and jumped to by entering the center, zoom, max iterations and (for the Julia set) the constant c.

## Adding a Fractal

1. In Rust, add a module with its iteration (a step for `logic::escape_time`) and a `generate_*` function that passes it to `logic::render_fractal`.
2. Add a variant to `FractalKind` in `src/lib.rs` and its arm in `generate_fractal`. The variant's string becomes the fractal's `type` on the JS side.
3. Add an entry to `FRACTALS` in `www/src/config/fractalConfig.ts`. Its gallery card, menu link and page are generated from it.

## Testing

```sh
cargo test --profile test-fast        # the fractals (Rust)
cd www
node --test "src/**/*.test.ts"        # the view math and the fractal config
npm run build && npm run test:e2e     # the built site in Chromium, as a phone and a desktop
```

The browser tests need Playwright's Chromium once (`npx playwright install chromium`). They serve Bootstrap and MathJax from their npm packages instead of the CDN, and block Google Tag Manager.

## Directory Structure

```text
.
├── Cargo.lock
├── Cargo.toml
├── docs
│   └── superpowers
│       ├── plans
│       │   └── 2026-10-17-zoom-simulator.md
│       └── specs
│           └── 2026-10-17-zoom-simulator-design.md
├── GEMINI.md
├── pkg
│   ├── package.json
│   ├── README.md
│   ├── wasm_fractal_bg.js
│   ├── wasm_fractal_bg.wasm
│   ├── wasm_fractal_bg.wasm.d.ts
│   ├── wasm_fractal.d.ts
│   └── wasm_fractal.js
├── PNG
│   └── WASM-Fractal.png
├── README.md
├── src
│   ├── bin
│   ├── burning_ship.rs
│   ├── celtic_mandelbrot.rs
│   ├── julia.rs
│   ├── lib.rs
│   ├── logic.rs
│   ├── mandelbrot.rs
│   └── utils.rs
└── www
    ├── e2e
    │   ├── fixtures.ts
    │   ├── simulator.spec.ts
    │   └── site.spec.ts
    ├── index.html
    ├── LICENSE-APACHE
    ├── LICENSE-MIT
    ├── package-lock.json
    ├── package.json
    ├── playwright.config.ts
    ├── public
    │   ├── assets
    │   │   ├── GitHub-Mark-120px-plus.png
    │   │   ├── GitHub-Mark-Light-120px-plus.png
    │   │   └── rust-logo-256x256.png
    │   ├── css
    │   │   └── template.css
    │   └── png
    │       ├── julia.png
    │       └── mandelbrot.png
    ├── README.md
    ├── src
    │   ├── components
    │   │   ├── FractalCanvas.tsx
    │   │   ├── FractalSimulator.tsx
    │   │   ├── Layout.tsx
    │   │   ├── MathBlock.tsx
    │   │   ├── RouteScroll.tsx
    │   │   └── SimulatorControls.tsx
    │   ├── config
    │   │   ├── fractalConfig.test.ts
    │   │   └── fractalConfig.ts
    │   ├── hooks
    │   │   ├── useCanvasGestures.ts
    │   │   ├── useFractalWorkers.ts
    │   │   ├── useMathJax.ts
    │   │   ├── usePageTitle.ts
    │   │   └── useSimulatorCanvas.ts
    │   ├── main.tsx
    │   ├── pages
    │   │   ├── FractalPage.tsx
    │   │   ├── Home.tsx
    │   │   ├── Privacy.tsx
    │   │   └── Terms.tsx
    │   ├── types
    │   │   └── global.d.ts
    │   ├── utils
    │   │   ├── mathjax.ts
    │   │   ├── viewMath.test.ts
    │   │   └── viewMath.ts
    │   └── workers
    │       ├── fractalWorker.ts
    │       └── workerPool.ts
    ├── tsconfig.json
    └── vite.config.ts

22 directories, 63 files
```

---

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Language              Files        Lines         Code     Comments       Blanks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSS                       1          243          207           25           11
 JSON                      3         2062         2062            0            0
 Markdown                  2          222            0          187           35
 TOML                      1           29           22            2            5
 TSX                      11          833          677           72           84
 TypeScript               18         1593         1253          183          157
─────────────────────────────────────────────────────────────────────────────────
 HTML                      1           33           24            9            0
 |- JavaScript             1            5            5            0            0
 (Total)                               38           29            9            0
─────────────────────────────────────────────────────────────────────────────────
 Rust                      7          877          626          121          130
 |- Markdown               2           36            0           32            4
 (Total)                              913          626          153          134
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Total                    44         5933         4876          631          426
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Reference

- [『実践Rustプログラミング入門』](https://www.shuwasystem.co.jp/book/9784798061702.html)

![ref1](https://www.shuwasystem.co.jp//images/book/528321.jpg)
