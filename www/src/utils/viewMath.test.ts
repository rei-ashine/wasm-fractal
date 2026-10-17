import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  autoMaxIter,
  clampManualMaxIter,
  clampRange,
  formatCenter,
  formatZoom,
  isAtMaxZoom,
  limitsFor,
  minWidthLimit,
  panBy,
  parseNumber,
  previewTransform,
  rangeCenter,
  rangeFromCenter,
  rangesEqual,
  rangeWidth,
  ulp,
  wheelZoomFactor,
  zoomAt,
  zoomOf,
} from './viewMath.ts';

// Compare within a tolerance
function near(actual: number, expected: number, tol: number) {
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} is not within ${tol} of ${expected}`);
}

const M = { x_min: -2, x_max: 1, y_min: -1.5, y_max: 1.5 };   // The initial range of the Mandelbrot set
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
  // The limit is only about 10,000 float steps wide, so the width carries a relative error of about 1e-4
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
test('rangeFromCenter clamps extreme input', () => {            // Stays finite and within the limits
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
test('wheelZoomFactor normalizes deltaMode', () => {           // Pixel, line and page deltas
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
