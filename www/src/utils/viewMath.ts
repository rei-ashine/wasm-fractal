// View math for the zoom simulator: pure functions on the visible region of the complex plane.
// A view is the range itself, not a center and a width, so the initial range of a fractal keeps
// exactly the values of its config. Ranges stay square: x and y share one scale and movement.

export interface Range {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
}

export interface Limits {
  // The widest width, and how far the center may be from the origin on each axis
  maxWidth: number;
  maxCenter: number;
  // Side of the canvas in physical pixels
  pixels: number;
}

export const MAX_WIDTH = 8;
export const MAX_CENTER = 4;
// A pixel must stay at least K times wider than the spacing of doubles at the center
export const PRECISION_K = 8;
export const AUTO_MAX_ITER_CAP = 50000;
export const MANUAL_MAX_ITER_MIN = 10;
export const MANUAL_MAX_ITER_MAX = 100000;
// A wheel zoom is exp(-deltaY * WHEEL_ZOOM_SPEED), with deltaY in CSS px
export const WHEEL_ZOOM_SPEED = 0.0015;
// CSS px per line for wheel events with deltaMode 1
export const WHEEL_LINE_HEIGHT = 16;

export function limitsFor(pixels: number): Limits {
  return { maxWidth: MAX_WIDTH, maxCenter: MAX_CENTER, pixels };
}

export function rangeWidth(r: Range): number {
  return r.x_max - r.x_min;
}

// Computed as min + half the span so that very large values do not overflow
export function rangeCenter(r: Range): { x: number; y: number } {
  return {
    x: r.x_min + (r.x_max - r.x_min) / 2,
    y: r.y_min + (r.y_max - r.y_min) / 2,
  };
}

// w0 is the width of the initial range, so a fresh page is at zoom 1
export function zoomOf(r: Range, w0: number): number {
  return w0 / rangeWidth(r);
}

export function rangesEqual(a: Range, b: Range): boolean {
  return a.x_min === b.x_min && a.x_max === b.x_max && a.y_min === b.y_min && a.y_max === b.y_max;
}

// Spacing of the doubles around m, for m >= 1. Math.log2 is exact for m < 8, which covers
// every center within MAX_CENTER (above that it can round up just below a power of two).
export function ulp(m: number): number {
  return 2 ** (Math.floor(Math.log2(m)) - 52);
}

// The narrowest width allowed at this center, where one pixel is PRECISION_K ulps wide
export function minWidthLimit(cx: number, cy: number, pixels: number): number {
  return PRECISION_K * ulp(Math.max(Math.abs(cx), Math.abs(cy), 1)) * pixels;
}

export function isAtMaxZoom(r: Range, limits: Limits): boolean {
  const c = rangeCenter(r);
  // The tolerance absorbs the rounding of the edges
  return rangeWidth(r) <= minWidthLimit(c.x, c.y, limits.pixels) * (1 + 1e-9);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Square range of width w around (cx, cy), with the center and the width kept within the limits
function squareWithin(cx: number, cy: number, w: number, limits: Limits): Range {
  const x = clamp(cx, -limits.maxCenter, limits.maxCenter);
  const y = clamp(cy, -limits.maxCenter, limits.maxCenter);
  const width = clamp(w, minWidthLimit(x, y, limits.pixels), limits.maxWidth);
  return { x_min: x - width / 2, x_max: x + width / 2, y_min: y - width / 2, y_max: y + width / 2 };
}

// A range within the limits is returned as it is, so an initial range keeps its exact values
export function clampRange(r: Range, limits: Limits): Range {
  const w = rangeWidth(r);
  const c = rangeCenter(r);
  const within = Math.abs(c.x) <= limits.maxCenter && Math.abs(c.y) <= limits.maxCenter
    && w <= limits.maxWidth && w >= minWidthLimit(c.x, c.y, limits.pixels);
  return within ? r : squareWithin(c.x, c.y, w, limits);
}

// The range for values typed in the inputs. Extreme values (a center of 1e308, a zoom of 0)
// end up within the limits too.
export function rangeFromCenter(cx: number, cy: number, zoom: number, w0: number, limits: Limits): Range {
  return squareWithin(cx, cy, zoom > 0 ? w0 / zoom : limits.maxWidth, limits);
}

// Zoom in by `factor` (out if below 1) keeping the point (sx, sy) of the canvas fixed.
// sx, sy and size share one unit. A factor beyond the limits is weakened to land on the limit.
export function zoomAt(r: Range, sx: number, sy: number, factor: number, size: number, limits: Limits): Range {
  const w = rangeWidth(r);
  const c = rangeCenter(r);
  const fx = sx / size;
  const fy = sy / size;
  // The point of the plane under the cursor
  const px = r.x_min + fx * w;
  const py = r.y_min + fy * w;
  const nw = clamp(w / factor, minWidthLimit(c.x, c.y, limits.pixels), limits.maxWidth);
  return clampRange({
    x_min: px - fx * nw,
    x_max: px + (1 - fx) * nw,
    y_min: py - fy * nw,
    y_max: py + (1 - fy) * nw,
  }, limits);
}

// Drag the image by (dx, dy), in the unit of size: the image follows the pointer,
// so the range moves the other way
export function panBy(r: Range, dx: number, dy: number, size: number, limits: Limits): Range {
  const w = rangeWidth(r);
  const mx = dx / size * w;
  const my = dy / size * w;
  return clampRange({
    x_min: r.x_min - mx,
    x_max: r.x_max - mx,
    y_min: r.y_min - my,
    y_max: r.y_max - my,
  }, limits);
}

// Deeper views need more iterations: +25% of base for every doubling of the zoom
export function autoMaxIter(base: number, zoom: number): number {
  return Math.min(AUTO_MAX_ITER_CAP, Math.round(base * (1 + Math.max(0, Math.log2(zoom)) / 4)));
}

export function clampManualMaxIter(n: number): number {
  return clamp(Math.round(n), MANUAL_MAX_ITER_MIN, MANUAL_MAX_ITER_MAX);
}

// Zoom factor of one wheel event. deltaMode 0 counts pixels, 1 lines and 2 pages
// (a page is pageHeight), so every kind of device gives a factor of the same size.
export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const unit = deltaMode === 1 ? WHEEL_LINE_HEIGHT : deltaMode === 2 ? pageHeight : 1;
  return Math.exp(-deltaY * unit * WHEEL_ZOOM_SPEED);
}

// Where to draw an image rendered for `from` on a canvas that shows `to`:
// its top left corner and its side length, in the unit of size
export function previewTransform(from: Range, to: Range, size: number): { x: number; y: number; size: number } {
  const w = rangeWidth(to);
  return {
    x: (from.x_min - to.x_min) / w * size,
    y: (from.y_min - to.y_min) / w * size,
    size: rangeWidth(from) / w * size,
  };
}

// As many decimals as the width of one pixel needs, plus one
export function formatCenter(value: number, pixelWidth: number): string {
  const digits = clamp(Math.ceil(-Math.log10(pixelWidth)) + 1, 0, 20);
  const text = value.toFixed(digits);
  // No "-0.000" for a tiny negative value
  return Number(text) === 0 ? text.replace('-', '') : text;
}

// Without the leading "×" and the trailing " (max)"
export function formatZoom(zoom: number): string {
  // 999,600 rounds to 1,000,000 at 3 significant digits: exponential from there, as from 1e6
  const p = Number(zoom.toPrecision(3));
  if (p >= 1e6) return zoom.toExponential(2);
  return p.toLocaleString('en-US', { maximumFractionDigits: 20 });
}

// Reads a number typed in an input: spaces around it and commas in it are ignored
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(/,/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
