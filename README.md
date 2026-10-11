# [WASM-Fractal](https://rei-ashine.github.io/wasm-fractal/)

DATE: Jul. 8th, 2026

![WASM-Fractal](./PNG/WASM-Fractal.png)

## Features & Optimizations

- **High-Performance Rust (WASM)**: Optimized algebraic calculations for the Julia set, the Mandelbrot set, the Burning Ship fractal and the Celtic Mandelbrot set, and early escape checks (Cardioid & Period-2 Bulb) specifically for generating the Mandelbrot set.
- **Multithreaded Rendering**: Leverages Web Workers (`navigator.hardwareConcurrency`) for parallel rendering to keep the React UI smooth.
- **Professional MathJax Integration**: Displays exact mathematical notations for fractals ($z_{n+1} = z_n^2 + c$) using robust React Promise chaining to prevent race conditions.
- **Google Tag Manager (GTM) Ready**: Built-in support for GTM and GA4 analytics through strict TypeScript definitions (`global.d.ts`).
- **Zero-Copy Data Transfer**: Uses Transferable Objects for fast pixel data transfer from Workers to the Canvas.

## Adding a Fractal

1. In Rust, add a module with its iteration (a step for `logic::escape_time`) and a `generate_*` function that passes it to `logic::render_fractal`.
2. Add a variant to `FractalKind` in `src/lib.rs` and its arm in `generate_fractal`. The variant's string becomes the fractal's `type` on the JS side.
3. Add an entry to `FRACTALS` in `www/src/config/fractalConfig.ts`. Its gallery card, menu link and page are generated from it.

## Directory Structure

```text
.
├── Cargo.lock
├── Cargo.toml
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
    ├── index.html
    ├── LICENSE-APACHE
    ├── LICENSE-MIT
    ├── package-lock.json
    ├── package.json
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
    │   │   └── Layout.tsx
    │   ├── config
    │   │   └── fractalConfig.ts
    │   ├── hooks
    │   │   ├── useFractalWorkers.ts
    │   │   └── useMathJax.ts
    │   ├── main.tsx
    │   ├── pages
    │   │   ├── FractalPage.tsx
    │   │   ├── Home.tsx
    │   │   ├── Privacy.tsx
    │   │   └── Terms.tsx
    │   ├── types
    │   │   └── global.d.ts
    │   ├── utils
    │   │   └── mathjax.ts
    │   └── workers
    │       ├── fractalWorker.ts
    │       └── workerPool.ts
    ├── tsconfig.json
    └── vite.config.ts

18 directories, 43 files
```

---

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Language              Files        Lines         Code     Comments       Blanks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSS                       1          141          132            0            9
 JSON                      3         2101         2101            0            0
 Markdown                  2          162            0          135           27
 Rust                      5          518          394           48           76
 TOML                      1           20           16            0            4
 TSX                       7          422          370            4           48
 TypeScript                7          387          304           23           60
─────────────────────────────────────────────────────────────────────────────────
 HTML                      1           34           25            9            0
 |- JavaScript             1            5            5            0            0
 (Total)                               39           30            9            0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Total                    27         3790         3347          219          224
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Reference

- [『実践Rustプログラミング入門』](https://www.shuwasystem.co.jp/book/9784798061702.html)

![ref1](https://www.shuwasystem.co.jp//images/book/528321.jpg)
