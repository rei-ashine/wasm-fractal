import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRACTALS, initialC, complexTeX } from './fractalConfig.ts';

const byType = (t: string) => FRACTALS.find((f) => f.type === t)!;
const range = (t: string) => { const v = byType(t).view; return [v.x_min, v.x_max, v.y_min, v.y_max]; };

test('initial ranges', () => {
  assert.deepEqual(range('julia'), [-2, 2, -2, 2]);
  assert.deepEqual(range('mandelbrot'), [-2, 1, -1.5, 1.5]);
  assert.deepEqual(range('burningShip'), [-1.8, -1.6, -0.1, 0.1]);   // bit-for-bit the same as before
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
  assert.deepEqual(j.formula({ re: -0.4, im: -0.6 }), ['z_{n+1} &= z_n^2 + c', 'c &= -0.4 - 0.6i']);
  assert.equal(complexTeX({ re: -0.4, im: -0.6 }), '-0.4 - 0.6i');
  assert.equal(complexTeX({ re: 0.25, im: 0 }), '0.25 + 0i');
});
test('the other formulas do not depend on c', () => {
  for (const t of ['mandelbrot', 'burningShip', 'celticMandelbrot']) {
    assert.deepEqual(byType(t).formula({ re: 1, im: 1 }), byType(t).formula({ re: 0, im: 0 }));
  }
});
