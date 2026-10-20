use num_complex::Complex;

const LN_2: f64 = std::f64::consts::LN_2;

/// The rectangle of the complex plane to render and how finely to sample it.
#[derive(Clone, Copy, Debug)]
pub struct View {
    pub width: u32,
    pub height: u32,
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
    pub max_iter: usize,
    pub aa_level: u32,
}

/// Iterates z_{n+1} = step(z_n) + c from z_0 = z and returns the smoothed number of
/// iterations until |z| escapes, or max_iter if it never does.
///
/// `step` receives (Re z, Im z, (Re z)^2, (Im z)^2) and returns the real and imaginary
/// parts of the degree-2 term that c is added to. The squares are passed in because the
/// escape test needs them anyway.
#[inline(always)]
pub fn escape_time<S>(z: Complex<f64>, c: Complex<f64>, max_iter: usize, step: S) -> f64
where
    S: Fn(f64, f64, f64, f64) -> (f64, f64),
{
    iterate::<S, false>(z, c, max_iter, step)
}

/// Like `escape_time`, but stops early with max_iter once the computed orbit repeats, and
/// always returns exactly what `escape_time` returns.
///
/// z is compared with a point saved at doubling intervals (Brent-style). Only a bit-for-bit
/// match counts: each iterate depends on nothing but the previous one, so after an exact
/// repeat the orbit runs through the same non-escaping points forever. Being merely close
/// to a saved point proves nothing, since an orbit can linger near a repelling or neutral
/// cycle and still escape later. Orbits pulled into an attracting cycle settle into an
/// exact repeat once they converge to the last bit.
///
/// It only pays off when many points never escape. The Julia set at the site's c has
/// almost no interior points, so it uses plain `escape_time`.
#[inline(always)]
pub fn escape_time_periodic<S>(z: Complex<f64>, c: Complex<f64>, max_iter: usize, step: S) -> f64
where
    S: Fn(f64, f64, f64, f64) -> (f64, f64),
{
    iterate::<S, true>(z, c, max_iter, step)
}

#[inline(always)]
fn iterate<S, const CHECK_PERIOD: bool>(z: Complex<f64>, c: Complex<f64>, max_iter: usize, step: S) -> f64
where
    S: Fn(f64, f64, f64, f64) -> (f64, f64),
{
    let mut zx = z.re;
    let mut zy = z.im;
    let mut zx2 = zx * zx;
    let mut zy2 = zy * zy;

    // The orbit point saved last; z_0 first, then z_1, z_3, z_7, ... (see below)
    let mut saved_x = zx;
    let mut saved_y = zy;

    for i in 1..=max_iter {
        let (re, im) = step(zx, zy, zx2, zy2);
        zx = re + c.re;
        zy = im + c.im;

        zx2 = zx * zx;
        zy2 = zy * zy;

        let norm_sqr = zx2 + zy2;
        if norm_sqr > 256.0 {
            // Smooth coloring formula: i + 1 - ln(ln(|z|)) / ln(2)
            // |z| = sqrt(norm_sqr), ln(|z|) = 0.5 * ln(norm_sqr)
            // Every step is of degree 2, so the same formula applies to all of them.
            let log_z = 0.5 * norm_sqr.ln();
            let nu = log_z.ln() / LN_2;
            return (i as f64) + 1.0 - nu;
        }

        if CHECK_PERIOD {
            // Exactly back at the saved point: every later iterate repeats one already
            // checked above, so the orbit never escapes
            if zx.to_bits() == saved_x.to_bits() && zy.to_bits() == saved_y.to_bits() {
                return max_iter as f64;
            }
            // Save at i = 2^k - 1: once the orbit is on a cycle of length p and 2^k >= p,
            // the cycle brings z back to the saved point within the next 2^k iterations
            if (i + 1).is_power_of_two() {
                saved_x = zx;
                saved_y = zy;
            }
        }
    }
    max_iter as f64
}

pub fn get_n_diverged(z: Complex<f64>, c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell for z_{n+1} = z_n^2 + c and
    returns the smoothed number of iterations up to the evaluation.
    */
    escape_time(z, c, max_iter, square_step)
}

/// z^2 = x^2 - y^2 + 2ixy, the step of the Julia and Mandelbrot sets.
#[inline(always)]
pub fn square_step(x: f64, y: f64, x2: f64, y2: f64) -> (f64, f64) {
    (x2 - y2, 2.0 * x * y)
}

pub fn color_map(iter_index: f64, max_iter: usize) -> (u8, u8, u8) {
    let t = iter_index / (max_iter as f64);
    let r = (15.0 * (1.0 - t) * t * t * t * 255.0) as u8;
    let g = (20.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0) as u8;
    let b = (15.0 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0) as u8;
    (r, g, b)
}

/// A pixel whose base samples differ by more than this in any channel (of 0..=255) is sampled
/// again on the fine grid. The colors, not the iteration counts, decide: deep in a zoom
/// neighbouring samples differ by whole iterations almost everywhere, while their colors,
/// spread over thousands of iterations, barely change.
pub const REFINE_COLOR_RANGE: u8 = 4;

/// Whether the colors of a pixel's base samples spread over more than REFINE_COLOR_RANGE
fn needs_refinement(min: [u8; 3], max: [u8; 3]) -> bool {
    (0..3).any(|k| max[k] - min[k] > REFINE_COLOR_RANGE)
}

pub fn render_fractal<F>(view: &View, calc_iter: F) -> Vec<u8>
where
    F: Fn(f64, f64) -> f64,
{
    let View { width, height, x_min, x_max, y_min, y_max, max_iter, aa_level } = *view;
    let mut data = Vec::with_capacity((width * height * 4) as usize);
    
    let (base_level, fine_level) = match aa_level {
        1 => (1, 1),
        2 => (2, 2),
        3 => (2, 4), // Adaptive 4x4
        4 => (2, 8), // Adaptive 8x8
        _ => if aa_level == 0 { (1, 1) } else { (2, aa_level) },
    };
    let base_sq = (base_level * base_level) as f64;
    let fine_sq = (fine_level * fine_level) as f64;

    for i in 0..height {
        for j in 0..width {
            let mut r_total = 0.0;
            let mut g_total = 0.0;
            let mut b_total = 0.0;
            
            let mut min_color = [u8::MAX; 3];
            let mut max_color = [u8::MIN; 3];

            for sy in 0..base_level {
                for sx in 0..base_level {
                    let dx = (sx as f64 + 0.5) / base_level as f64;
                    let dy = (sy as f64 + 0.5) / base_level as f64;
                    let y = y_min + (y_max - y_min) * (i as f64 + dy) / (height as f64);
                    let x = x_min + (x_max - x_min) * (j as f64 + dx) / (width as f64);

                    let iter_index = calc_iter(x, y);

                    let color = color_map(iter_index, max_iter);
                    for (k, value) in [color.0, color.1, color.2].into_iter().enumerate() {
                        min_color[k] = min_color[k].min(value);
                        max_color[k] = max_color[k].max(value);
                    }
                    r_total += color.0 as f64;
                    g_total += color.1 as f64;
                    b_total += color.2 as f64;
                }
            }

            let mut final_r = r_total / base_sq;
            let mut final_g = g_total / base_sq;
            let mut final_b = b_total / base_sq;

            // Adaptive refinement
            if fine_level > base_level && needs_refinement(min_color, max_color) {
                let mut fine_r = 0.0;
                let mut fine_g = 0.0;
                let mut fine_b = 0.0;

                for sy in 0..fine_level {
                    for sx in 0..fine_level {
                        let dx = (sx as f64 + 0.5) / fine_level as f64;
                        let dy = (sy as f64 + 0.5) / fine_level as f64;
                        let y = y_min + (y_max - y_min) * (i as f64 + dy) / (height as f64);
                        let x = x_min + (x_max - x_min) * (j as f64 + dx) / (width as f64);

                        let iter_index = calc_iter(x, y);

                        let color = color_map(iter_index, max_iter);
                        fine_r += color.0 as f64;
                        fine_g += color.1 as f64;
                        fine_b += color.2 as f64;
                    }
                }
                
                final_r = fine_r / fine_sq;
                final_g = fine_g / fine_sq;
                final_b = fine_b / fine_sq;
            }

            data.push(final_r as u8);
            data.push(final_g as u8);
            data.push(final_b as u8);
            data.push(255);
        }
    }
    data
}

#[cfg(test)]
mod tests_refinement {
    use super::*;

    #[test]
    fn refines_where_the_colors_differ() {
        assert!(!needs_refinement([10, 20, 30], [10, 20, 30]));
        assert!(!needs_refinement([10, 20, 30], [14, 24, 34]));
        assert!(needs_refinement([10, 20, 30], [10, 25, 30]));
        assert!(needs_refinement([0, 0, 0], [255, 0, 0]));
    }

    #[test]
    fn deep_zoom_refines_only_where_colors_vary() {
        // Seahorse valley at zoom 10^4, with the site's max_iter for it. Neighbouring samples
        // differ by whole iterations almost everywhere there, which once refined about 95% of
        // the pixels: 2x2 + 4x4 samples, close to 20 a pixel
        let (cx, cy, w) = (-0.743643887037151, 0.131825904205330, 3.0e-4);
        let size = 120;
        let view = View {
            width: size, height: size,
            x_min: cx - w / 2.0, x_max: cx + w / 2.0,
            y_min: cy - w / 2.0, y_max: cy + w / 2.0,
            max_iter: 1297,
            aa_level: 3,
        };
        let samples = std::cell::Cell::new(0usize);
        render_fractal(&view, |x, y| {
            samples.set(samples.get() + 1);
            escape_time_periodic(Complex::new(0.0, 0.0), Complex::new(x, y), view.max_iter, square_step)
        });
        let per_pixel = samples.get() as f64 / (size * size) as f64;
        println!("{per_pixel:.2} samples a pixel");
        assert!(per_pixel < 14.0, "{per_pixel} samples a pixel");
    }
}

/// Helpers that check escape_time_periodic against plain escape_time, shared by the tests
/// of every fractal that uses the periodicity check.
#[cfg(test)]
pub(crate) mod periodicity_test_support {
    use super::*;

    pub type Step = fn(f64, f64, f64, f64) -> (f64, f64);
    pub type GetN = fn(Complex<f64>, usize) -> f64;

    /// Asserts that `get_n` (z_0 = 0, with the periodicity check) returns exactly what
    /// iterating `step` to max_iter returns at c.
    pub fn assert_point_matches(step: Step, get_n: GetN, c: Complex<f64>, max_iter: usize) {
        let full = escape_time(Complex::new(0.0, 0.0), c, max_iter, step);
        assert_eq!(get_n(c, max_iter), full, "c = {c}, max_iter = {max_iter}");
    }

    /// Runs assert_point_matches over an n x n grid of cell centers covering the rectangle,
    /// and returns how many of the points never escape.
    pub fn assert_grid_matches(
        step: Step,
        get_n: GetN,
        (x_min, x_max): (f64, f64),
        (y_min, y_max): (f64, f64),
        n: usize,
        max_iter: usize,
    ) -> usize {
        let mut interior = 0;
        for i in 0..n {
            for j in 0..n {
                let c = Complex {
                    re: x_min + (x_max - x_min) * (j as f64 + 0.5) / n as f64,
                    im: y_min + (y_max - y_min) * (i as f64 + 0.5) / n as f64,
                };
                assert_point_matches(step, get_n, c, max_iter);
                if get_n(c, max_iter) == max_iter as f64 {
                    interior += 1;
                }
            }
        }
        interior
    }

    /// Points where an orbit stays close to a cycle for a while and then escapes anyway, so a
    /// check that only asks "is z near a saved point?" wrongly reports them as never escaping.
    /// They lie on the real axis, where the Burning Ship, the Celtic Mandelbrot set and the
    /// Mandelbrot set all iterate z^2 + c.
    pub fn assert_near_cycle_points_match(step: Step, get_n: GetN) {
        // c slightly left of -2: 0 -> c -> ~2, and the orbit lingers near the repelling
        // fixed point z = 2 before escaping after about 20 iterations
        for d in [1e-11, 1e-12, 1e-13] {
            assert_point_matches(step, get_n, Complex::new(-2.0 - d, 0.0), 300);
        }
        // c slightly right of 1/4: the orbit crawls past z = 1/2 in steps far below 1e-9
        // and escapes after about 140000 iterations
        assert_point_matches(step, get_n, Complex::new(0.25 + 5e-10, 0.0), 400_000);
    }
}
