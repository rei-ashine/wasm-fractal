# [WASM-Fractal](https://rei-ashine.github.io/wasm-fractal/)

DATE: Jul. 8th, 2026

![WASM-Fractal](./PNG/WASM-Fractal.png)

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
    │   │   └── Layout.tsx
    │   ├── hooks
    │   │   └── useFractalWorkers.ts
    │   ├── main.tsx
    │   ├── pages
    │   │   ├── Home.tsx
    │   │   ├── Julia.tsx
    │   │   ├── Mandelbrot.tsx
    │   │   ├── Privacy.tsx
    │   │   └── Terms.tsx
    │   └── workers
    │       └── fractalWorker.ts
    ├── tsconfig.json
    └── vite.config.ts
```

---

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Language              Files        Lines         Code     Comments       Blanks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSS                       1          141          132            0            9
 JSON                      3         2101         2101            0            0
 Rust                      5          342          244           46           52
 TOML                      1           20           16            0            4
 TSX                       7          442          390            5           47
 TypeScript                3          262          208           11           43
─────────────────────────────────────────────────────────────────────────────────
 HTML                      1           30           24            6            0
 |- JavaScript             1            4            4            0            0
 (Total)                               34           28            6            0
─────────────────────────────────────────────────────────────────────────────────
 Markdown                  3          232            0          178           54
 |- BASH                   1           11            7            3            1
 (Total)                              243            7          181           55
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Total                    24         3585         3126          249          210
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Reference

- [『実践Rustプログラミング入門』](https://www.shuwasystem.co.jp/book/9784798061702.html)

![ref1](https://www.shuwasystem.co.jp//images/book/528321.jpg)
