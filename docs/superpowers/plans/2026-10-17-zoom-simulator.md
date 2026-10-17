# 拡大できるフラクタル・シミュレーター 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 個別のフラクタルのページを、ホイール・ドラッグ・ピンチで拡大・移動でき、中心座標・拡大率・最大反復回数・Julia の c を数値で指定できるシミュレーターにする。

**Architecture:**
- 表示範囲の計算は、DOM に依存しない純粋関数（`viewMath.ts`）にまとめ、`node --test` で単体テストする。
- 次の3つを別々の部品にする。
  - 操作の受け取り（`useCanvasGestures`）
  - プレビューと段階的な描画（`useSimulatorCanvas`）
  - 画面（`FractalSimulator` と `SimulatorControls`）
- 描画は、既存の Worker プールと `useFractalWorkers` を拡張して使う。Rust/wasm は変えない。

**Tech Stack:**
- React 18、TypeScript 5、Vite 8
- Bootstrap 5.0.2（CDN の CSS のみ）
- Web Workers と wasm（既存）
- Node の `node --test`。TypeScript の型を取り除いてそのまま実行する機能を使う（CI は Node 24、手元は 22.22）。
- 確認用の Playwright（Chromium）。リポジトリには入れない。

**Spec:** `docs/superpowers/specs/2026-10-17-zoom-simulator-design.md`

## Global Constraints

- **変えないもの:**
  - 新しい npm パッケージは追加しない。
  - Rust/wasm（`src/`）と Worker（`www/src/workers/`）は変えない。
- **表記は英語:**
  - ボタン: `−`（U+2212）、`+`、`Reset`、`Go`
  - 入力欄のラベル: `Center Re`、`Center Im`、`Zoom`、`Max iterations`、`Auto`、`c Re`、`c Im`
  - 状態表示: `Rendering...`、`Rendered in N ms`
- **キャンバス:**
  - 正方形で、最大 600 CSS px。
  - 物理ピクセルの一辺は `floor(CSS の大きさ × min(devicePixelRatio, 2))`。
  - キャンバスの上端が `y_min`（今と同じ向き）。
- **ホイール:**
  - 倍率は `exp(-deltaY × 0.0015)`。
  - `deltaMode` 1（行単位）は `deltaY` を 16 倍、2（ページ単位）はキャンバスの高さ（CSS px）倍に換算する。
  - 止まってから 150 ms で描き直す。
- **ダブルタップとダブルクリック:** 2回の押下が 300 ms 以内かつ 30 px 以内で、どちらの押下も 6 px 以上動いていないとき、その点を2倍に拡大する。
- **制限:**
  - 幅は 8 以下。
  - 中心は `|cx| ≤ 4`、`|cy| ≤ 4`。
  - 幅は `K × ulp(max(|cx|, |cy|, 1)) × n` 以上（`K = 8`、`n` はキャンバスの一辺の物理ピクセル数）。
- **最大反復回数:**
  - `Auto` は `min(50000, round(base × (1 + max(0, log2(zoom)) / 4)))`。
  - 手で入力した値は 10〜100,000 に収める。
- **描画:**
  - 粗い下描きは `scale: 0.25`、`aa_level: 1`。
  - 本描きは `aa_level: 3`。
  - どちらも `clear: false`。
- **数値の表示:**
  - 中心は小数点以下 `ceil(−log10(w / n)) + 1` 桁。
  - 拡大率は、100万未満なら有効数字3桁で桁区切り付き（`1,250`）、それ以上は `toExponential(2)`（`3.47e+9`）。
  - 拡大の上限では ` (max)` を付ける。
- **初期範囲:**
  - Burning Ship（`[-1.8, -1.6] × [-0.1, 0.1]`）と Celtic（`[-2, 2]²`）は、今の値とビット単位で同じにする。
  - ギャラリーのこの2枚の画像は変えない。
- **コミット:** メッセージは英語で書き、末尾にこのセッションの帰属の2行を付ける。

## Review Focus

どのタスクのテストにも出てこないが、使う人に最も影響しそうな入力や状況です。それぞれに確認を追加しました。

1. **ピンチの途中で片方の指を離す（2本から1本へ）:** 表示が飛ばず、残った指の動いた分だけ移動する。→ Task 6 Step 5
2. **ホイールの種類の違い:** トラックパッドの細かい `deltaMode` 0、Firefox の行単位 `deltaMode` 1、ページ単位 2 のどれでも、1回の倍率が極端にならない。→ Task 1 の `wheelZoomFactor` のテスト
3. **描画中の画面の回転やウィンドウの大きさの変更:** 最後の描画が新しい大きさで完了し、古い大きさの画像が残らない。→ Task 4 Step 6
4. **極端な入力（拡大率 `1e30`、中心 `1e308`、反復回数 `-5`、拡大率 `0`）:** 範囲は有限の値のまま制限の内側に収まり、`NaN` や `Infinity` が表示されない。→ Task 1 の `rangeFromCenter` のテストと Task 5 Step 6
5. **描画中のページの移動（メニューで次々に移動）:** コンソールにエラーが出ず、最後のページが最後まで描かれる。→ Task 7 Step 3

---

## ファイルの分担

| ファイル | 役割 | Task |
|---|---|---|
| `www/src/utils/viewMath.ts`（新規） | 表示範囲の純粋な計算 | 1 |
| `www/src/utils/viewMath.test.ts`（新規） | その単体テスト | 1 |
| `www/tsconfig.json` | テストファイルを `tsc` の対象から外す | 1 |
| `.github/workflows/test.yml`、`deploy.yml` | `node --test` を実行する | 1 |
| `www/src/config/fractalConfig.ts` | 正方形の初期範囲、c を受け取る数式 | 2 |
| `www/src/config/fractalConfig.test.ts`（新規） | 初期範囲と数式のテスト | 2 |
| `www/src/hooks/useFractalWorkers.ts` | `clear`、`scale`、`pixelRatioCap` と Promise、`physicalCanvasSize` | 3 |
| `www/src/hooks/useSimulatorCanvas.ts`（新規） | プレビュー、段階的な描画、大きさの変化への対応 | 4 |
| `www/src/components/FractalSimulator.tsx`（新規） | シミュレーター本体（状態を持ち、部品をつなぐ） | 4–6 |
| `www/src/components/SimulatorControls.tsx`（新規） | ボタン、入力欄、状態表示（表示と入力の受け付けだけ） | 4–5 |
| `www/src/components/MathBlock.tsx`（新規） | TeX を MathJax で表示し、文字列が変わったら作り直す | 5 |
| `www/src/hooks/useCanvasGestures.ts`（新規） | Pointer Events とホイールの受け取り | 6 |
| `www/src/pages/FractalPage.tsx` | シミュレーターを置き、Julia の c を持つ | 2, 4, 5 |
| `www/src/components/FractalCanvas.tsx` | ギャラリー専用にする（`redrawOnClick` を外す） | 4 |
| `www/public/css/template.css` | キャンバスと入力欄のスタイル | 4–6 |
| `README.md` | 機能説明とディレクトリ構成 | 7 |

**ブラウザでの確認の共通手順**（Task 2〜7）
- **配信:**
  - wasm はリポジトリのルートで `wasm-pack build --target bundler --no-opt` で作る。Rust は変えないので、`pkg/` が今の `main` と同じなら作り直さなくてよい。`--no-opt` は、手元で binaryen をダウンロードできないために付けている。
  - `cd www && npx tsc --noEmit && npm run build && npx vite preview --port 4180 --strictPort` で配信する。
- **スクリプト:** 作業用フォルダ（scratchpad）の `zoom-e2e/` に置き、`/opt/node22/lib/node_modules/playwright/index.mjs` から Playwright を読み込む。
- **外部のスクリプトを止める:** `cdn.jsdelivr` と `googletagmanager` への通信は止める。MathJax は読み込まれないので、数式は TeX の文字列のまま DOM に残る。
- **キャンバスのハッシュ:** `getImageData` の全バイトを `h = (h * 31 + byte) >>> 0` で畳み込み、`幅x高さ:h` の形にする。
- **ギャラリーの基準値:** `main` の Burning Ship は `300x300:3605551641`、Celtic は `300x300:3802848154`。画面 900×1400、DPR 1 での値。
- **コンソール:** エラーが出ないこと（読み込みを止めたリソースの失敗は除く）も、毎回確かめる。

---

### Task 1: 表示範囲の計算（`viewMath.ts`）とテストの実行環境

**Files:**
- Create: `www/src/utils/viewMath.ts`
- Create: `www/src/utils/viewMath.test.ts`
- Modify: `www/tsconfig.json`（`"exclude": ["src/**/*.test.ts"]` を追加）
- Modify: `.github/workflows/test.yml`、`.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: なし
- Produces（`www/src/utils/viewMath.ts`）:

```ts
export interface Range { x_min: number; x_max: number; y_min: number; y_max: number }
export interface Limits { maxWidth: number; maxCenter: number; pixels: number }

export const MAX_WIDTH = 8;
export const MAX_CENTER = 4;
export const PRECISION_K = 8;
export const AUTO_MAX_ITER_CAP = 50000;
export const MANUAL_MAX_ITER_MIN = 10;
export const MANUAL_MAX_ITER_MAX = 100000;
export const WHEEL_ZOOM_SPEED = 0.0015;
export const WHEEL_LINE_HEIGHT = 16;

export function limitsFor(pixels: number): Limits;          // { maxWidth: 8, maxCenter: 4, pixels }
export function rangeWidth(r: Range): number;                // x_max - x_min
export function rangeCenter(r: Range): { x: number; y: number };
export function zoomOf(r: Range, w0: number): number;        // w0 / rangeWidth(r)
export function rangesEqual(a: Range, b: Range): boolean;
export function ulp(m: number): number;                      // 2^(floor(log2 m) - 52), for m >= 1
export function minWidthLimit(cx: number, cy: number, pixels: number): number;
export function isAtMaxZoom(r: Range, limits: Limits): boolean;
export function clampRange(r: Range, limits: Limits): Range;
export function rangeFromCenter(cx: number, cy: number, zoom: number, w0: number, limits: Limits): Range;
export function zoomAt(r: Range, sx: number, sy: number, factor: number, size: number, limits: Limits): Range;
export function panBy(r: Range, dx: number, dy: number, size: number, limits: Limits): Range;
export function autoMaxIter(base: number, zoom: number): number;
export function clampManualMaxIter(n: number): number;
export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number): number;
export function previewTransform(from: Range, to: Range, size: number): { x: number; y: number; size: number };
export function formatCenter(value: number, pixelWidth: number): string;
export function formatZoom(zoom: number): string;            // without "×" and " (max)"
export function parseNumber(text: string): number | null;
```

- [ ] **Step 1: 失敗するテストを書く（`www/src/utils/viewMath.test.ts`）**

`import { test } from 'node:test'`、`import assert from 'node:assert/strict'`、`import { … } from './viewMath.ts'`（拡張子付き）。誤差を許す比較には、ローカルの `near(actual, expected, tol)` を使う（`Math.abs(actual - expected) <= tol` を `assert.ok` で確かめる）。

```ts
const M = { x_min: -2, x_max: 1, y_min: -1.5, y_max: 1.5 };   // Mandelbrot の初期範囲
const L = limitsFor(1200);

test('zoomAt keeps the point under the cursor fixed', () => {
  const r = zoomAt(M, 150, 450, 2, 600, limitsFor(600));
  near(r.x_min + 0.25 * rangeWidth(r), -1.25, 1e-12);
  near(r.y_min + 0.75 * rangeWidth(r), 0.75, 1e-12);
  near(rangeWidth(r), 1.5, 1e-12);
});
test('zoomAt stops at the widest range', () => {
  const r = zoomAt(M, 300, 300, 0.1, 600, L);
  near(rangeWidth(r), 8, 1e-12);
  near(rangeCenter(r).x, -0.5, 1e-12);
});
test('zoomAt stops at the precision limit', () => {
  const deep = rangeFromCenter(-0.75, 0.1, 1e15, 3, L);
  assert.equal(isAtMaxZoom(deep, L), true);
  const r = zoomAt(deep, 300, 300, 2, 600, L);
  // 上限の幅は数値の刻みの約1万倍しかないので、幅の相対誤差は 1e-4 程度になる
  near(rangeWidth(r) / minWidthLimit(-0.75, 0.1, 1200), 1, 1e-3);
});
test('panBy moves the image with the pointer', () => {
  const r = panBy(M, 60, -30, 600, L);
  near(r.x_min, -2.3, 1e-15); near(r.x_max, 0.7, 1e-15);
  near(r.y_min, -1.35, 1e-15); near(r.y_max, 1.65, 1e-15);
});
test('panBy keeps the center within 4', () => {
  const r = panBy(rangeFromCenter(3.9, 0, 1, 1, L), -600, 0, 600, L);
  near(rangeCenter(r).x, 4, 1e-12);
});
test('clampRange leaves a range within the limits untouched', () => {
  assert.deepEqual(clampRange(M, L), M);
  const ship = { x_min: -1.8, x_max: -1.6, y_min: -0.1, y_max: 0.1 };
  assert.deepEqual(clampRange(ship, L), ship);
});
test('clampRange shrinks a range wider than 8', () => {
  assert.deepEqual(clampRange({ x_min: -5, x_max: 5, y_min: -5, y_max: 5 }, L),
                   { x_min: -4, x_max: 4, y_min: -4, y_max: 4 });
});
test('rangeFromCenter clamps extreme input', () => {            // Review Focus 4
  const r = rangeFromCenter(1e308, -1e308, 1e30, 4, L);
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v));
  near(rangeCenter(r).x, 4, 1e-11); near(rangeCenter(r).y, -4, 1e-11);
  near(rangeWidth(r) / minWidthLimit(4, -4, 1200), 1, 1e-3);
  near(rangeWidth(rangeFromCenter(0, 0, 0, 4, L)), 8, 1e-12);
  near(rangeWidth(rangeFromCenter(0, 0, -5, 4, L)), 8, 1e-12);
});
test('ulp and minWidthLimit use the precision of the center', () => {
  assert.equal(ulp(1), 2 ** -52); assert.equal(ulp(1.5), 2 ** -52);
  assert.equal(ulp(2), 2 ** -51); assert.equal(ulp(4), 2 ** -50);
  assert.equal(minWidthLimit(-0.75, 0, 1200), 8 * 2 ** -52 * 1200);
  assert.equal(minWidthLimit(-1.7, 0, 1200), 8 * 2 ** -52 * 1200);
  assert.equal(minWidthLimit(3, 0, 1200), 8 * 2 ** -51 * 1200);
});
test('autoMaxIter', () => {
  assert.equal(autoMaxIter(300, 1), 300);
  assert.equal(autoMaxIter(300, 0.5), 300);
  assert.equal(autoMaxIter(300, 1e6), 1795);
  assert.equal(autoMaxIter(300, 1e12), 3290);
  assert.equal(autoMaxIter(1000, 1e12), 10966);
  assert.equal(autoMaxIter(1000, 2 ** 200), 50000);
});
test('clampManualMaxIter', () => {
  assert.equal(clampManualMaxIter(5), 10); assert.equal(clampManualMaxIter(-5), 10);
  assert.equal(clampManualMaxIter(123.4), 123); assert.equal(clampManualMaxIter(200000), 100000);
});
test('wheelZoomFactor normalizes deltaMode', () => {           // Review Focus 2
  near(wheelZoomFactor(-100, 0, 600), Math.exp(0.15), 1e-12);
  near(wheelZoomFactor(3, 1, 600), Math.exp(-0.072), 1e-12);
  near(wheelZoomFactor(1, 2, 600), Math.exp(-0.9), 1e-12);
  assert.equal(wheelZoomFactor(0, 0, 600), 1);
});
test('previewTransform matches zoomAt and panBy', () => {
  assert.deepEqual(previewTransform(M, M, 600), { x: 0, y: 0, size: 600 });
  const z = previewTransform(M, zoomAt(M, 150, 450, 2, 600, L), 600);
  near(z.x, -150, 1e-9); near(z.y, -450, 1e-9); near(z.size, 1200, 1e-9);
  const p = previewTransform(M, panBy(M, 60, -30, 600, L), 600);
  near(p.x, 60, 1e-9); near(p.y, -30, 1e-9); near(p.size, 600, 1e-9);
});
test('rangesEqual and zoomOf', () => {
  assert.equal(rangesEqual(M, { ...M }), true);
  assert.equal(rangesEqual(M, { ...M, y_max: 1.6 }), false);
  assert.equal(zoomOf({ x_min: 0, x_max: 1.5, y_min: 0, y_max: 1.5 }, 3), 2);
});
test('formatCenter', () => {
  assert.equal(formatCenter(-0.5, 0.0025), '-0.5000');
  assert.equal(formatCenter(-0.7436438870371587, 2e-15), '-0.7436438870371587');
  assert.equal(formatCenter(-1e-9, 0.02), '0.000');
});
test('formatZoom', () => {
  assert.equal(formatZoom(1), '1'); assert.equal(formatZoom(0.025), '0.025');
  assert.equal(formatZoom(1250.4), '1,250'); assert.equal(formatZoom(12345), '12,300');
  assert.equal(formatZoom(3.4712e9), '3.47e+9');
});
test('parseNumber', () => {
  assert.equal(parseNumber('3.47e9'), 3.47e9); assert.equal(parseNumber(' -0.5 '), -0.5);
  assert.equal(parseNumber('1,250'), 1250);
  for (const bad of ['abc', '', 'Infinity', '1e400']) assert.equal(parseNumber(bad), null);
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd www && node --test "src/**/*.test.ts"`
Expected: FAIL。`./viewMath.ts` が見つからないエラー。

- [ ] **Step 3: `www/src/utils/viewMath.ts` を実装する**

上の Interfaces のとおりに作る。テストだけでは決まらない部分は次のとおり。
- **`rangeCenter`:** `x_min + (x_max − x_min) / 2` で計算し、とても大きな値でもあふれないようにする。
- **`clampRange`:** 範囲が制限の内側なら、受け取った値をそのまま返す（初期範囲をビット単位で保つため）。外側なら、中心を ±4 に、幅を `[minWidthLimit(収めた中心), 8]` に収め、中心 ± 幅/2 で作り直す。
- **`rangeFromCenter`:** 中心を ±4 に収める。`zoom > 0` なら `w0 / zoom`、そうでなければ 8 を幅とし、`[minWidthLimit(収めた中心), 8]` に収めて、中心 ± 幅/2 で作る。
- **`zoomAt`:**
  1. 固定する点 `p = (x_min + sx/size·w, y_min + sy/size·w)` を求める。
  2. 新しい幅 `w' = clamp(w / factor, minWidthLimit(今の中心), 8)` を求める。
  3. `x_min' = p.x − sx/size·w'`、`x_max' = p.x + (1 − sx/size)·w'` とする（y も同じ）。
  4. 最後に `clampRange` を通す。
- **`panBy`:** 4つの端から `dx/size·w`（y は `dy/size·w`）を引き、`clampRange` を通す。
- **`isAtMaxZoom`:** `rangeWidth ≤ minWidthLimit(中心) × (1 + 1e-9)` のとき true。
- **`formatCenter`:** 小数点以下の桁数を `ceil(−log10(pixelWidth)) + 1`（0〜20 に収める）で `toFixed` する。結果が 0 なら先頭の `-` を取る。
- **`formatZoom`:** 1e6 未満は `Number(zoom.toPrecision(3)).toLocaleString('en-US', { maximumFractionDigits: 20 })`、それ以上は `zoom.toExponential(2)`。
- **`parseNumber`:** 前後の空白と `,` を取り除き、空なら null。`Number()` の結果が有限でなければ null。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd www && node --test "src/**/*.test.ts"`
Expected: PASS（17件）。

- [ ] **Step 5: `www/tsconfig.json` に `"exclude": ["src/**/*.test.ts"]` を追加し、型を確かめる**

Run: `cd www && npx tsc --noEmit`
Expected: 出力なし、終了コード 0（`viewMath.ts` は対象のまま）。

- [ ] **Step 6: CI に `node --test` を追加する**

- **`test.yml`:** `Test Rust` の後に、`actions/setup-node@v4`（`node-version: '24'`）と、`Test frontend logic` のステップ（`working-directory: ./www`、`run: node --test "src/**/*.test.ts"`）を追加する。冒頭のコメントも「Rust と frontend のロジックのテスト」に直す。
- **`deploy.yml`:** `Build Frontend (Vite)` の `npm ci` の後に `node --test "src/**/*.test.ts"` を追加する。

- [ ] **Step 7: コミット**

```bash
git add www/src/utils/viewMath.ts www/src/utils/viewMath.test.ts www/tsconfig.json .github/workflows/test.yml .github/workflows/deploy.yml
git commit -m "Add view math for the zoom simulator with node:test unit tests"
```

---

### Task 2: 正方形の初期範囲と、c を受け取る数式

**Files:**
- Modify: `www/src/config/fractalConfig.ts`（Julia と Mandelbrot の `view`、`formula` の型と値）
- Create: `www/src/config/fractalConfig.test.ts`
- Modify: `www/src/pages/FractalPage.tsx`（数式を `fractal.formula(initialC(fractal))` から作る）

**Interfaces:**
- Consumes: なし
- Produces（`fractalConfig.ts`）:

```ts
export interface Complex { re: number; im: number }
// FractalDefinition.formula の型を string[] から次に変える
formula: (c: Complex) => string[];
export function initialC(def: FractalDefinition): Complex;   // { re: view.real ?? 0, im: view.imaginary ?? 0 }
export function complexTeX(c: Complex): string;              // "-0.7269 + 0.1889i"
```

- [ ] **Step 1: 失敗するテストを書く（`www/src/config/fractalConfig.test.ts`）**

`import { FRACTALS, initialC, complexTeX } from './fractalConfig.ts'` を使う。`fractalConfig.ts` の `import type` は Node が取り除くので、そのまま読み込める。

```ts
const byType = (t: string) => FRACTALS.find((f) => f.type === t)!;
const range = (t: string) => { const v = byType(t).view; return [v.x_min, v.x_max, v.y_min, v.y_max]; };

test('initial ranges', () => {
  assert.deepEqual(range('julia'), [-2, 2, -2, 2]);
  assert.deepEqual(range('mandelbrot'), [-2, 1, -1.5, 1.5]);
  assert.deepEqual(range('burningShip'), [-1.8, -1.6, -0.1, 0.1]);   // 今の値とビット単位で同じ
  assert.deepEqual(range('celticMandelbrot'), [-2, 2, -2, 2]);
});
test('initial ranges are square', () => {
  for (const f of FRACTALS) {
    const wx = f.view.x_max - f.view.x_min, wy = f.view.y_max - f.view.y_min;
    assert.ok(Math.abs(wx - wy) <= 1e-12 * wx, f.type);
  }
});
test('the Julia formula shows c', () => {
  const j = byType('julia');
  assert.deepEqual(j.formula(initialC(j)), ['z_{n+1} &= z_n^2 + c', 'c &= -0.7269 + 0.1889i']);
  assert.equal(complexTeX({ re: -0.4, im: -0.6 }), '-0.4 - 0.6i');
  assert.equal(complexTeX({ re: 0.25, im: 0 }), '0.25 + 0i');
});
test('the other formulas do not depend on c', () => {
  for (const t of ['mandelbrot', 'burningShip', 'celticMandelbrot']) {
    assert.deepEqual(byType(t).formula({ re: 1, im: 1 }), byType(t).formula({ re: 0, im: 0 }));
  }
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd www && node --test "src/**/*.test.ts"`
Expected: FAIL。`initialC` が無い。Julia の範囲が `[-2, 2, -1.5, 1.5]` のまま。

- [ ] **Step 3: `fractalConfig.ts` を変える**

- Julia の `y_min`/`y_max` を `-2.0`/`2.0`、Mandelbrot を `-1.5`/`1.5` にする。
- `formula` を関数にする。Julia は `(c) => [String.raw\`z_{n+1} &= z_n^2 + c\`, \`c &= ${complexTeX(c)}\`]` とし、ほかの3つは `() => [...]`（今の行のまま）にする。
- `complexTeX` は `` `${c.re} ${c.im < 0 ? '-' : '+'} ${Math.abs(c.im)}i` `` とする。

- [ ] **Step 4: `FractalPage.tsx` を合わせる**

`fractal.formula.join(...)` を `fractal.formula(initialC(fractal)).join(...)` に変える（c の状態は Task 4 で持たせる）。

- [ ] **Step 5: テスト、型、ビルドを確かめる**

Run: `cd www && node --test "src/**/*.test.ts" && npx tsc --noEmit && npm run build`
Expected: テストは 21件すべて PASS、`tsc` は出力なし、ビルドは `✓ built`。

- [ ] **Step 6: ブラウザで確かめる**

Expected:
- ギャラリー
  - Burning Ship と Celtic のハッシュは基準値と同じ（`3605551641`、`3802848154`）。
  - Mandelbrot と Julia のハッシュは基準値と違う（比率を直したため）。
- `#/julia` の DOM に `c &= -0.7269 + 0.1889i` がある。
- コンソールにエラーがない。

- [ ] **Step 7: コミット**

```bash
git add www/src/config/fractalConfig.ts www/src/config/fractalConfig.test.ts www/src/pages/FractalPage.tsx
git commit -m "Make the Mandelbrot and Julia views square and build the Julia formula from c"
```

---

### Task 3: `useFractalWorkers` に描き方のオプションと完了の通知を足す

**Files:**
- Modify: `www/src/hooks/useFractalWorkers.ts`

**Interfaces:**
- Consumes: なし
- Produces:

```ts
export interface RenderParams {
  // …今のフィールドに加えて
  clear?: boolean;          // 既定 true。false なら描く前に消さない
  scale?: number;           // 既定 1。1 未満はその割合の解像度で描き、全部そろってから引き伸ばして描く
  pixelRatioCap?: number;   // 既定は上限なし。devicePixelRatio の上限
}
export function physicalCanvasSize(canvas: HTMLCanvasElement, pixelRatioCap?: number): { width: number; height: number };
// floor(clientWidth × min(devicePixelRatio || 1, cap))、高さも同じ
// useFractalWorkers().renderFractal の戻り値: Promise<boolean>（全ブロックを処理したら true、取り消されたら false）
```

- [ ] **Step 1: 変更前のギャラリーのハッシュを記録する**

Task 2 のビルドで、ギャラリーの4枚のハッシュを記録する。

- [ ] **Step 2: `renderFractal` を変える**

- 大きさは `physicalCanvasSize(canvas, pixelRatioCap ?? Infinity)` で求める。`canvas.width`/`height` が違うときだけ代入する（代入するとキャンバスが消えるため）。`clear` が true なら `clearRect` する（今と同じ見た目になる）。
- 計算する大きさは、幅も高さも `max(1, floor(大きさ × scale))` にする。ブロックの分け方（8×8）は今のままにする。
- `scale` が 1 なら、今と同じく `putImageData` で直接キャンバスに描く。
- `scale` が 1 未満なら、`document.createElement('canvas')` で作った同じ大きさのキャンバスにブロックを描く。全部そろったら、`imageSmoothingEnabled = true` で `drawImage(offscreen, 0, 0, width, height)` する。
- Promise は、最後のブロックを処理した時点（`scale` が 1 未満なら引き伸ばして描いた後）で true になる。どれかのブロックが `null`（取り消し）で返った時点で false になる。結果は一度だけ返す。
- `elapsed` と `isRendering` の更新は今のまま残す。

- [ ] **Step 3: 型、ビルド、ギャラリーを確かめる**

Run: `cd www && npx tsc --noEmit && npm run build`。そのあとブラウザで確かめる。
Expected: ギャラリーの4枚のハッシュが Step 1 と同じ（オプションを省略すれば今と同じ動きなので）。コンソールにエラーがない。

- [ ] **Step 4: コミット**

```bash
git add www/src/hooks/useFractalWorkers.ts
git commit -m "Let renderFractal keep the old image, render at a lower scale and report completion"
```

---

### Task 4: シミュレーターのキャンバス（プレビューと段階的な描画）と `+`/`−`/`Reset`

**Files:**
- Create: `www/src/hooks/useSimulatorCanvas.ts`
- Create: `www/src/components/FractalSimulator.tsx`
- Create: `www/src/components/SimulatorControls.tsx`（このタスクではボタンと拡大率と状態表示だけ）
- Modify: `www/src/pages/FractalPage.tsx`（`FractalCanvas` を `FractalSimulator` に置き換え、c を `useState(() => initialC(fractal))` で持つ）
- Modify: `www/src/components/FractalCanvas.tsx`（`redrawOnClick` とカーソルの指定を外す）
- Modify: `www/public/css/template.css`

**Interfaces:**
- Consumes:
  - Task 1: `Range`、`limitsFor`、`zoomAt`、`zoomOf`、`rangeWidth`、`rangesEqual`、`isAtMaxZoom`、`autoMaxIter`、`previewTransform`、`formatZoom`
  - Task 2: `Complex`、`FractalDefinition`、`initialC`
  - Task 3: `renderFractal`、`cancelRendering`、`physicalCanvasSize`
- Produces:

```ts
// useSimulatorCanvas.ts
export const PIXEL_RATIO_CAP = 2;
export const QUICK_SCALE = 0.25;
export interface Scene { range: Range; maxIter: number; c: Complex }
export type RenderStatus = { kind: 'idle' } | { kind: 'rendering' } | { kind: 'done'; ms: number };
export function useSimulatorCanvas(type: FractalType, canvasRef: React.RefObject<HTMLCanvasElement>): {
  preview: (range: Range) => void;   // 描きかけを取り消し、最後の画像を動かして range を見せる
  render: (scene: Scene) => void;    // 粗い下描き → 本描き
  status: RenderStatus;
};

// FractalSimulator.tsx（default export）
interface FractalSimulatorProps { fractal: FractalDefinition; c: Complex; onCChange: (c: Complex) => void }

// SimulatorControls.tsx（default export、このタスクの props）
interface SimulatorControlsProps { zoomLabel: string; status: string; onZoomIn(): void; onZoomOut(): void; onReset(): void }
```

- [ ] **Step 1: `useSimulatorCanvas.ts` を実装する**

- **ref で持つもの:**
  - `sceneRef`: 最後に `render` に渡した scene。キャンバスはこの範囲を表している。
  - `snapshotRef`: `{ image: HTMLCanvasElement; range: Range } | null`
  - `pendingRangeRef` と `rafRef`
  - `tokenRef`: 描き直しの番号
  - `renderedSizeRef`: 描き直しを始めた時点の物理ピクセル数
- **`preview(range)`:**
  - `sceneRef` が無ければ何もしない。
  - `snapshotRef` が無ければ、次の順に行う。`cancelRendering()`、`tokenRef` を1つ進める、キャンバスを同じ大きさのキャンバスに写し取って `{ image, range: sceneRef.current.range }` を保存、状態を `idle` にする。
  - `pendingRangeRef = range` とし、まだ予約していなければ `requestAnimationFrame` で描画を予約する。
  - 描画では、黒で全体を塗り、`previewTransform(snapshot.range, pending, canvas.width)` の位置と大きさで `drawImage` する。
- **`render(scene)`:**
  1. 予約中のプレビューがあれば、取り消してその場で描く。
  2. `snapshotRef = null` にし、`sceneRef` を更新し、`tokenRef` を進め、`renderedSizeRef` に今の物理ピクセル数を入れ、状態を `rendering` にする。
  3. `{ canvas, type, ...scene.range, max_iter: scene.maxIter, real: c.re, imaginary: c.im, clear: false, pixelRatioCap: 2 }` に `scale: 0.25, aa_level: 1` を足して描く。
  4. 3 が true で、番号が変わっていなければ、`aa_level: 3` で描く。
  5. 4 も同じ条件を満たしたら、状態を `{ kind: 'done', ms: 開始からの経過 }` にする。
- **大きさの変化:** `ResizeObserver` でキャンバスを見張る。`physicalCanvasSize(canvas, 2).width` が `renderedSizeRef` と違い、`sceneRef` があれば、`render(sceneRef.current)` を呼ぶ。
- **ページを離れるとき:** 予約したアニメーションフレームを取り消し、`ResizeObserver` を外し、`tokenRef` を進める。

- [ ] **Step 2: `SimulatorControls.tsx` と `FractalSimulator.tsx` を実装する**

- **`SimulatorControls`:** 1行に `−`、`+`、`Reset`（`btn btn-sm btn-outline-secondary`）と `zoomLabel` を並べる。その下に状態表示（`text-muted mt-2`、`fontSize: '0.8rem'`）を置く。
- **`FractalSimulator` が持つ値:**
  - `w0 = fractal.view.x_max − fractal.view.x_min`
  - `initialRange` は `fractal.view` の4つの値そのもの
  - `rangeRef` と、表示用の `range`（state）
- **制限:** `limits() = limitsFor(physicalCanvasSize(canvas, PIXEL_RATIO_CAP).width)`。操作の大きさ `size` は `canvas.clientWidth`。
- **`commit(range, c)`:**
  - `maxIter = autoMaxIter(fractal.view.max_iter, zoomOf(range, w0))`。`Auto` 以外は Task 5 で足す。
  - 最後に描いた scene と、範囲（`rangesEqual`）、`maxIter`、c がすべて同じなら何もしない。違えば `render`。
- **初回:** ページを開いたら一度だけ `render`。
- **c の変更:** props の `c` が変わったら `commit(rangeRef.current, c)`。
- **ボタン:**
  - `+` は `zoomAt(rangeRef, size/2, size/2, 2, size, limits())`、`−` は倍率 0.5。どちらも `preview`、`setRange`、`commit` の順に呼ぶ。
  - `Reset` は `initialRange` に戻し、`onCChange(initialC(fractal))` を呼び、`preview`、`setRange`、`commit` を呼ぶ。
- **表示:**
  - `zoomLabel = '×' + formatZoom(zoomOf(range, w0)) + (isAtMaxZoom(range, limits()) ? ' (max)' : '')`
  - 状態表示は `rendering` → `Rendering...`、`done` → `Rendered in N ms`、`idle` → 空。
- **要素の構成:** `<div className="fractal-simulator mt-3">` の中に、`<canvas aria-label="Fractal simulator: drag to move, scroll or pinch to zoom">` と `SimulatorControls` を置く。キャンバスには `btn-pop` クラスを付けない（マウスを乗せたときに浮き上がる効果を付けないため）。

- [ ] **Step 3: ページとギャラリーをつなぎ替え、CSS を足す**

- **`FractalPage`:** `const [c, setC] = useState(() => initialC(fractal))` を足す。数式は `fractal.formula(c)` から作り、`<FractalSimulator fractal={fractal} c={c} onCChange={setC} />` を置く。
- **`FractalCanvas`:** `redrawOnClick` の prop と `onClick` と `cursor` を外す。
- **CSS:** `template.css` に次を足す。
  - `.fractal-simulator canvas`: `display: block`、`width: 100%`、`max-width: 600px`、`aspect-ratio: 1 / 1`、`margin: 0 auto`、`background-color: #000`、`border-radius: 5px`
  - `.fractal-simulator .simulator-controls`: `max-width: 600px`、`margin: 0 auto`

- [ ] **Step 4: 型とビルド**

Run: `cd www && node --test "src/**/*.test.ts" && npx tsc --noEmit && npm run build`
Expected: 21件 PASS、`tsc` は出力なし、`✓ built`。

- [ ] **Step 5: ブラウザで、ボタンと「古い描画が残らないこと」を確かめる**

画面は 900×1400、DPR 1。

Expected:
- 4つのページすべてで、次のとおりになる。
  - 状態が `Rendered in` になる。
  - `canvas.clientWidth <= 600` で、`canvas.width === Math.floor(canvas.clientWidth)`（DPR 1）。
  - 拡大率の表示が `×1`。
- Mandelbrot で `+` を押すと `×2`、`−` で `×1`、`Reset` で `×1` に戻る。毎回 `Rendered in` になる。
- 速い操作と遅い操作で、最終的な画像が同じになる。
  - 速い操作: `+` を待たずに3回押してから、`Rendered in` を待つ。
  - 遅い操作: 読み込み直したページで、`+` を押して `Rendered in` を待つことを3回くり返す。
  - キャンバスのハッシュが一致し、表示がどちらも `×8` になる。
- ギャラリーの Burning Ship と Celtic のハッシュが基準値と同じ。
- コンソールにエラーがない。

- [ ] **Step 6: 描画中に大きさを変えたときを確かめる（Review Focus 3）**

Mandelbrot で `+` を押した直後に、`page.setViewportSize({ width: 500, height: 1400 })` で画面を狭める。

Expected:
- `Rendered in` になる。
- `canvas.width` が `canvas.clientWidth`（約 468）と同じ。
- 画面を 500 幅にして開いたページで `+` を押し、描き終えた画像とハッシュが一致する。

- [ ] **Step 7: コミット**

```bash
git add www/src/hooks/useSimulatorCanvas.ts www/src/components/FractalSimulator.tsx www/src/components/SimulatorControls.tsx www/src/pages/FractalPage.tsx www/src/components/FractalCanvas.tsx www/public/css/template.css
git commit -m "Add the zoom simulator canvas with preview, quick and full passes, and zoom buttons"
```

---

### Task 5: 数値の入力欄、`Auto` の反復回数、Julia の c と数式の更新

**Files:**
- Modify: `www/src/components/SimulatorControls.tsx`（入力欄を足す）
- Modify: `www/src/components/FractalSimulator.tsx`
- Create: `www/src/components/MathBlock.tsx`
- Modify: `www/src/pages/FractalPage.tsx`（数式を `MathBlock` で表示する）
- Modify: `www/public/css/template.css`

**Interfaces:**
- Consumes:
  - Task 1: `rangeFromCenter`、`rangeCenter`、`clampManualMaxIter`、`formatCenter`、`formatZoom`、`parseNumber`
  - Task 2: `complexTeX`
  - Task 4 で作ったものすべて
- Produces:

```ts
// SimulatorControls.tsx（最終の props）
export interface ControlValues {
  centerRe: string; centerIm: string;  // formatCenter の結果
  zoom: string;                         // formatZoom の結果
  maxIter: string; auto: boolean;
  cRe?: string; cIm?: string;           // Julia のときだけ
}
// 変えた欄だけ数値、変えていない欄は null
export interface AppliedValues {
  centerRe: number | null; centerIm: number | null; zoom: number | null;
  maxIter: number | null; c: Complex | null;
}
interface SimulatorControlsProps {
  values: ControlValues; zoomLabel: string; status: string; showC: boolean;
  onZoomIn(): void; onZoomOut(): void; onReset(): void;
  onAutoChange(auto: boolean): void; onApply(v: AppliedValues): void;
}
// MathBlock.tsx（default export）: TeX を MathJax で一度表示する。key={tex} で使うと、文字列が変わったら作り直される
const MathBlock: React.FC<{ tex: string; className?: string }>;
```

- [ ] **Step 1: `SimulatorControls` に入力欄を足す**

- **フォームの組み方:**
  - `<form className="row g-2 mt-2 simulator-controls">` の中に、`col-6 col-sm-3` ごとに欄を置く。
  - ラベルは `form-label small mb-0`。
  - 入力欄は `form-control form-control-sm`、`type="text"`、`autoComplete="off"`、`spellCheck={false}` にする。
  - `Max iterations` の横に `Auto` のチェック（`form-check`）、最後に `Go` ボタンを置く。
- **下書き:** 各欄の下書きは state で持ち、`values` が変わったら下書きを `values` に戻し、赤い表示も消す。
- **送信（Enter または `Go`）:**
  1. 下書きが `values` と違う欄だけを `parseNumber` で読む。
  2. 読めない欄があれば `is-invalid` を付け、`onApply` は呼ばない。
  3. すべて読めたら、変えた欄だけ数値にした `AppliedValues` で `onApply` を呼ぶ。
- **`Auto` のチェック:** 変えたら `onAutoChange` を呼ぶ。

- [ ] **Step 2: `FractalSimulator` に入力の適用と `Auto` を足す**

- **state:** `auto`（初期値 true）と `manualMaxIter` を持つ。
- **使う反復回数:** `auto` なら `autoMaxIter(base, zoom)`、そうでなければ `manualMaxIter`。
- **`onApply(v)`:**
  - 中心と拡大率のどれかが null でなければ、`rangeFromCenter(v.centerRe ?? 今の中心.x, v.centerIm ?? 今の中心.y, v.zoom ?? 今の拡大率, w0, limits())` で範囲を作り、`preview` する。
  - `v.maxIter` が null でなければ、`auto = false` とし、`manualMaxIter = clampManualMaxIter(v.maxIter)` にする。
  - `v.c` が null でなければ、`onCChange(v.c)` を呼ぶ。
  - 最後に、新しい範囲、反復回数、c で `commit` を1回だけ呼ぶ。そのあと props の c が変わっても、`commit` が同じ scene と判断するので、二重には描かない。
- **`onAutoChange(true)`:** `auto = true` にして `commit`。
- **`onAutoChange(false)`:** `auto = false` とし、`manualMaxIter` を今の値にする（描き直さない）。
- **`Reset`:** `auto = true` に戻すことも足す。
- **表示する値 `values`:**
  - 中心: `formatCenter(中心, rangeWidth(range) / limits().pixels)`
  - 拡大率: `formatZoom(zoom)`
  - c: Julia（`fractal.type === 'julia'`）のときだけ `String(c.re)` と `String(c.im)`

- [ ] **Step 3: `MathBlock` を作り、`FractalPage` で使う**

- **`MathBlock`:** 今の `useMathJax` で ref を受け取り、`<div ref className>{tex}</div>` を返す。
- **`FractalPage`:**
  - 前置きの文（`A complex number …`）は、今の `useMathJax` の div のまま残す。
  - 数式は `<MathBlock key={tex} tex={tex} className="lead" />` にする。`tex` は今と同じ `\[ \begin{cases} \begin{align} … \end{align} \end{cases} \]` の形に、`fractal.formula(c)` の行を入れたもの。

- [ ] **Step 4: CSS を足す**

`.fractal-simulator .form-control { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }`

- [ ] **Step 5: 型とビルド**

Run: `cd www && node --test "src/**/*.test.ts" && npx tsc --noEmit && npm run build`
Expected: 21件 PASS、`tsc` は出力なし、`✓ built`。

- [ ] **Step 6: ブラウザで入力欄を確かめる（画面 900×1400、DPR 1。n はキャンバスの物理ピクセル数で、約 600。下の桁数は 590〜600 のどれでも同じになる）**

**Mandelbrot**
- **最初の表示:** `Center Re` が `-0.5000`、`Center Im` が `0.0000`、`Zoom` が `1`、`Max iterations` が `300`、`Auto` にチェックあり。
- **入力して移動:** `Center Re` に `-0.75`、`Center Im` に `0.1`、`Zoom` に `100` を入れて Enter を押す。
  - 表示が `×100`、`-0.750000`、`0.100000`、`798` になる。
  - 状態が `Rendered in` になる。
- **何も変えずに `Go`:** 描き直さない。キャンバスのハッシュと `Rendered in N ms` が変わらない。
- **読めない値:** `Zoom` に `abc` を入れて Enter を押すと、欄に `is-invalid` が付き、表示は `×100` のまま。

**極端な値（Review Focus 4）**
- `Zoom` に `1e30` を入れると、表示の末尾に `(max)` が付く。
- `Center Re` に `1e308` を入れると、`4.` で始まる値になる。
- `Zoom` に `0` を入れると、縮小の上限（`×0.375`）になる。
- `Max iterations` に `-5` を入れると `10` になり、`Auto` のチェックが外れる。
- `Auto` にチェックを入れると、その拡大率の自動の値に戻る。
- どの欄にも `NaN` や `Infinity` が出ない。

**Julia**
- `c Re` に `-0.4`、`c Im` に `0.6` を入れて `Go` を押す。
  - DOM に `c &= -0.4 + 0.6i` が現れる。
  - キャンバスのハッシュが変わる。
- `Reset` を押すと、`c &= -0.7269 + 0.1889i` と `×1` に戻る。

**全体**
- コンソールにエラーがない。

- [ ] **Step 7: コミット**

```bash
git add www/src/components/SimulatorControls.tsx www/src/components/FractalSimulator.tsx www/src/components/MathBlock.tsx www/src/pages/FractalPage.tsx www/public/css/template.css
git commit -m "Add numeric inputs, auto max iterations and an editable Julia constant to the simulator"
```

---

### Task 6: ホイール、ドラッグ、ピンチ、ダブルタップ

**Files:**
- Create: `www/src/hooks/useCanvasGestures.ts`
- Modify: `www/src/components/FractalSimulator.tsx`（操作をつなぎ、表示の更新を画面の更新1回につき1回にまとめる）
- Modify: `www/public/css/template.css`（`touch-action: none`、カーソル）

**Interfaces:**
- Consumes:
  - Task 1: `wheelZoomFactor`、`zoomAt`、`panBy`
  - Task 4 と 5 の `FractalSimulator`
- Produces:

```ts
export const WHEEL_IDLE_MS = 150;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_DISTANCE = 30;
export const TAP_SLOP = 6;
export interface GestureHandlers {
  onPan: (dx: number, dy: number) => void;                  // CSS px。画像がポインターと同じ向きに動く
  onZoom: (sx: number, sy: number, factor: number) => void; // キャンバス上の点 (sx, sy) を固定
  onGestureEnd: () => void;                                 // 全ポインターを離した、ダブルタップ、ホイールが 150 ms 止まった
}
export function useCanvasGestures(canvasRef: React.RefObject<HTMLCanvasElement>, handlers: GestureHandlers): void;
```

- [ ] **Step 1: `useCanvasGestures.ts` を実装する**

- **イベントの登録:**
  - `useEffect` でイベントを登録し、`handlers` は ref で最新を参照する。
  - 座標は `clientX/Y − getBoundingClientRect().left/top` で求める。
  - ポインターは `Map<pointerId, { x, y, startX, startY }>` で持つ。
- **`pointerdown`:**
  - マウスの左ボタン以外は無視する。
  - `setPointerCapture` して追加する。
  - 2本目なら、ピンチの基準（2点の距離と中点）を記録する。
- **`pointermove`:**
  - 1本なら、前の位置との差で `onPan` を呼ぶ。
  - 2本なら、`onZoom(前の中点, 今の距離 / 前の距離)` を呼んでから `onPan(中点の移動量)` を呼び、基準を更新する。
- **`pointerup` と `pointercancel`:**
  - **2本から1本に戻ったとき:** 残った指の今の位置を移動の基準にし直す（Review Focus 1）。
  - **タップの判定:** 1本だけの押下で、`startX/Y` から `TAP_SLOP` 未満しか動いていなければタップとみなす。
  - **ダブルタップ:** 前のタップから `DOUBLE_TAP_MS` 以内かつ `DOUBLE_TAP_DISTANCE` 以内なら、`onZoom(x, y, 2)` を呼んで、前のタップの記録を消す。そうでなければ、このタップを記録する。
  - ポインターが0本になったら `onGestureEnd()` を呼ぶ。
- **`wheel`（`{ passive: false }`）:**
  - `preventDefault()` してページのスクロールを止める。
  - `onZoom(sx, sy, wheelZoomFactor(deltaY, deltaMode, canvas.clientHeight))` を呼ぶ。
  - タイマーを `WHEEL_IDLE_MS` で掛け直し、時間切れで `onGestureEnd()` を呼ぶ。
- **片付け:** イベントの登録を外し、タイマーを止める。

- [ ] **Step 2: `FractalSimulator` につなぐ**

- **`onPan`:** `rangeRef = panBy(rangeRef, dx, dy, size, limits())` にして、`preview` する。
- **`onZoom`:** `rangeRef = zoomAt(…)` にして、`preview` する。
- **表示の更新:** `onPan` と `onZoom` のあとの `setRange` は、`requestAnimationFrame` で画面の更新1回につき1回にまとめる。
- **`onGestureEnd`:** まとめ待ちの表示の更新をその場で行い、`commit` する。

- [ ] **Step 3: CSS を足す**

`.fractal-simulator canvas { touch-action: none; cursor: grab; }` と、`.fractal-simulator canvas:active { cursor: grabbing; }`。

- [ ] **Step 4: 型とビルド**

Run: `cd www && node --test "src/**/*.test.ts" && npx tsc --noEmit && npm run build`
Expected: 21件 PASS、`tsc` は出力なし、`✓ built`。

- [ ] **Step 5: ブラウザで操作を確かめる**

確認のスクリプトは、`/home/user/wasm-fractal/www/src/utils/viewMath.ts` を読み込み、同じ操作を `zoomAt`、`panBy`、`wheelZoomFactor` に順にかけて期待値を作る。表示された中心は、`formatCenter` で同じ形にして比べる。

**PC（900×1400、DPR 1）の Mandelbrot**
- **ホイール:** キャンバス上の (150, 450) で `mouse.wheel(0, -100)` を1回。
  - 表示が `×1.16` になる。
  - 中心が期待値と一致する。
- **ドラッグ:** (300, 300) から (360, 270) まで、5段階で動かす。
  - 中心が `panBy(…, 60, −30)` の期待値と一致する。
- **ダブルクリック:** (150, 150) で `dblclick`。
  - 表示が2倍になる。
  - 中心が期待値と一致する。
- **速い操作と遅い操作で、最終的な画像が同じになる:**
  - 速い操作: ホイール5回と、ドラッグ1回を待たずに続ける。
  - 遅い操作: 読み込み直したページで、同じ操作を1回ごとに `Rendered in` を待ちながら行う。
  - 中心と拡大率の表示、キャンバスのハッシュがすべて一致する。

**タッチ（`devices['iPhone 13']`、`hasTouch`）**

CDP の `Input.dispatchTouchEvent` で操作する。

- **ピンチ:** 2本の指を (100, 200) と (200, 200) に置き、(50, 200) と (250, 200) まで3段階で広げる。
  - 表示が `×2` になる。
  - 中心が期待値と一致する。
- **2本から1本へ（Review Focus 1）:** 続けて1本目を離し、残った指を +40 px 動かして離す。
  - 中心が `panBy(…, 40, 0)` の期待値と一致する（飛ばない）。
- **ダブルタップ:** 同じ点を 150 ms 間隔で2回タップする。
  - 表示が2倍になる。
- **ページのスクロール:**
  - キャンバスの外を縦にスワイプすると `window.scrollY` が変わる。
  - キャンバスの上をスワイプしても、`window.scrollY` は変わらない。

**全体**
- コンソールにエラーがない。

- [ ] **Step 6: コミット**

```bash
git add www/src/hooks/useCanvasGestures.ts www/src/components/FractalSimulator.tsx www/public/css/template.css
git commit -m "Zoom and pan the simulator with the wheel, drag, pinch and double tap"
```

---

### Task 7: README、拡大の上限の調整、全体の確認

**Files:**
- Modify: `README.md`
- Modify（Step 2 で K を変えたときだけ）: `www/src/utils/viewMath.ts`、`www/src/utils/viewMath.test.ts`、`docs/superpowers/specs/2026-10-17-zoom-simulator-design.md`

**Interfaces:**
- Consumes: Task 1〜6 で作ったものすべて
- Produces: なし

- [ ] **Step 1: README を更新する**

- **Features:** 次の1行を足す。`**Zoomable Simulator**: Each fractal page can be zoomed and panned with the mouse wheel, drag, pinch and double tap, and jumped to by entering the center, zoom, max iterations and (for the Julia set) the constant c.`
- **ディレクトリ構成:** 新しいファイル（Task 1〜6）と `docs/superpowers/{plans,specs}` を足し、最後の「N directories, M files」の行を、書いた木の中身に合わせて数え直す。

- [ ] **Step 2: 拡大の上限 K を確かめる**

Mandelbrot で、`Center Re` に `-0.743643887037158`、`Center Im` に `0.131825904205311`、`Zoom` に `1e15` を入れ（上限で止まる）、描き終えたキャンバスを保存する。同じ場所の ×1/10 の画像と比べる。

Expected:
- 上限の画像に、同じ色のピクセルが2つ以上続く段差状のブロックが目立たない。
- 目立つ場合は、`PRECISION_K` を 16、32 の順に上げる。そのときは Task 1 のテストの期待値（`minWidthLimit` の値）と、設計書の4章の K の値も合わせて直す。

- [ ] **Step 3: 描画中のページの移動を確かめる（Review Focus 5）**

Julia で `Zoom` に `1e6`、`Max iterations` に `20000` を入れて描き始め、待たずにメニューから Mandelbrot、Burning Ship、Celtic Mandelbrot の順に移動する。

Expected:
- 最後のページの状態が `Rendered in` になる。
- コンソールにエラーがない。

- [ ] **Step 4: 描画時間を測る**

PC（600 px、DPR 1）と iPhone 13 の再現（DPR 3 で、上限の 2 が使われる）で、4つのフラクタルそれぞれを ×1、×1e3、×1e6 にして、2つの時間を測る。
- 粗い下描きの時間: 操作の終わりから、キャンバスのハッシュが最初に変わるまで
- 本描きの時間: `Rendered in N ms` の N

結果は PR の説明に表で書く。

- [ ] **Step 5: 全体の確認**

Run:
```bash
cd /home/user/wasm-fractal && cargo test --profile test-fast
cd www && node --test "src/**/*.test.ts" && npx tsc --noEmit && npm run build
```
Expected: Rust 20件、node 21件がすべて PASS、`tsc` は出力なし、`✓ built`。

ブラウザでは次を確かめる。
- ギャラリーの Burning Ship と Celtic のハッシュが基準値と同じ。
- 4つのページすべてで最初の描画が `Rendered in` になる。
- コンソールにエラーがない。

- [ ] **Step 6: コミットしてプッシュし、CI を確かめる**

```bash
git add README.md   # K を変えたときは viewMath.ts、viewMath.test.ts、設計書も
git commit -m "Document the zoom simulator"
git push -u origin feature/zoom-simulator
```

Expected: このブランチの `Test` ワークフロー（Rust と frontend のロジックのテスト）が成功する。
