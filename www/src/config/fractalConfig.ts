import type { FractalType } from '../workers/fractalWorker';

// The region of the complex plane each fractal is first rendered with.
export interface FractalView {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  max_iter: number;
  // z_0 for the Mandelbrot set, c for the Julia set; unused by the other fractals
  real?: number;
  imaginary?: number;
}

export interface FractalDefinition {
  type: FractalType;
  // Route path, without the leading slash
  path: string;
  // Page heading and menu label
  title: string;
  // The page reads "A complex number \( variable \) is in {setName} if, ..."
  variable: string;
  setName: string;
  // Lines of the TeX align environment that defines the iteration
  formula: string[];
  view: FractalView;
}

// Every fractal on the site, in gallery and menu order. Adding an entry here adds its
// gallery card, menu link and page; its `type` must be a FractalKind of the wasm crate.
export const FRACTALS: readonly FractalDefinition[] = [
  {
    type: 'julia',
    path: 'julia',
    title: 'Julia Set',
    variable: 'z_0',
    setName: 'the filled-in Julia set',
    formula: [
      String.raw`z_{n+1} &= z_n^2 + c`,
      String.raw`c &= -0.7269 + 0.1889i`,
    ],
    view: {
      x_min: -2.0,
      x_max: 2.0,
      y_min: -1.5,
      y_max: 1.5,
      max_iter: 1000,
      real: -0.7269,
      imaginary: 0.1889,
    },
  },
  {
    type: 'mandelbrot',
    path: 'mandelbrot',
    title: 'Mandelbrot Set',
    variable: 'c',
    setName: 'the Mandelbrot set',
    formula: [
      String.raw`z_0 &= 0`,
      String.raw`z_{n+1} &= z_n^2 + c`,
    ],
    view: {
      x_min: -2.0,
      x_max: 1.0,
      y_min: -1.0,
      y_max: 1.0,
      max_iter: 300,
      real: 0.0,
      imaginary: 0.0,
    },
  },
  {
    type: 'burningShip',
    path: 'burning-ship',
    title: 'Burning Ship',
    variable: 'c',
    setName: 'the Burning Ship fractal',
    formula: [
      String.raw`z_0 &= 0`,
      String.raw`z_{n+1} &= \left( |\mathrm{Re}\,z_n| + i\,|\mathrm{Im}\,z_n| \right)^2 + c`,
    ],
    // 20x zoom around (-1.7, 0): the small "ship" left of the main body
    view: {
      x_min: -1.8,
      x_max: -1.6,
      y_min: -0.1,
      y_max: 0.1,
      max_iter: 300,
    },
  },
  {
    type: 'celticMandelbrot',
    path: 'celtic-mandelbrot',
    title: 'Celtic Mandelbrot',
    variable: 'c',
    setName: 'the Celtic Mandelbrot set',
    formula: [
      String.raw`z_0 &= 0`,
      String.raw`z_{n+1} &= \left| \mathrm{Re}\left( z_n^2 \right) \right| + i\,\mathrm{Im}\left( z_n^2 \right) + c`,
    ],
    view: {
      x_min: -2.0,
      x_max: 2.0,
      y_min: -2.0,
      y_max: 2.0,
      max_iter: 300,
    },
  },
];
