export const FRACTAL_CONFIG = {
  julia: {
    x_min: -2.0,
    x_max: 2.0,
    y_min: -1.5,
    y_max: 1.5,
    max_iter: 1000,
    real: -0.7269,
    imaginary: 0.1889
  },
  mandelbrot: {
    x_min: -2.0,
    x_max: 1.0,
    y_min: -1.0,
    y_max: 1.0,
    max_iter: 300,
    real: 0.0,
    imaginary: 0.0
  }
} as const;
