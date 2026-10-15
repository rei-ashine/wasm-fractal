
use num_complex::Complex;
use crate::logic::{escape_time_periodic, render_fractal, square_step, View};


pub fn get_n_diverged_mandelbrot(z_0: Complex<f64>, c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell for the Mandelbrot set,
    z_{n+1} = z_n^2 + c, and returns the smoothed number of iterations up to the evaluation.
    */
    // The cardioid / bulb checks skip only part of the interior; the points in the other
    // bulbs and in the mini Mandelbrot sets are stopped early once their orbit cycles.
    escape_time_periodic(z_0, c, max_iter, square_step)
}

pub fn generate_mandelbrot_set(view: &View, z_0: Complex<f64>) -> Vec<u8> {
    /*
    This function stores color information about each cell.
    */
    let max_iter = view.max_iter;
    render_fractal(view, |x, y| {
        // Main cardioid check
        let q = (x - 0.25) * (x - 0.25) + y * y;
        if q * (q + (x - 0.25)) < 0.25 * y * y {
            return max_iter as f64;
        }

        // Period-2 bulb check
        if (x + 1.0) * (x + 1.0) + y * y < 0.0625 {
            return max_iter as f64;
        }

        let c = Complex { re: x, im: y };
        get_n_diverged_mandelbrot(z_0, c, max_iter)
    })
}


#[cfg(test)]
mod tests_mandelbrot {
    use super::*;
    use crate::logic::get_n_diverged;
    use crate::logic::periodicity_test_support::{assert_grid_matches, assert_near_cycle_points_match};

    // get_n_diverged_mandelbrot with z_0 = 0, the form the shared periodicity tests take
    fn get_n_from_zero(c: Complex<f64>, max_iter: usize) -> f64 {
        get_n_diverged_mandelbrot(Complex { re: 0.0, im: 0.0 }, c, max_iter)
    }

    #[test]
    fn test_periodicity_check_keeps_results() {
        // Stopping cycling orbits early must give exactly what iterating to max_iter gives.
        // get_n_diverged_mandelbrot has no cardioid / bulb shortcut, so this also covers
        // the interior those checks skip.
        let interior = assert_grid_matches(square_step, get_n_from_zero, (-2.0, 1.0), (-1.0, 1.0), 300, 300);
        assert!(interior > 300 * 300 / 20);

        // A region whose interior is a period-3 bulb, which the shortcuts do not cover
        let interior = assert_grid_matches(square_step, get_n_from_zero, (-0.3, 0.1), (0.55, 0.95), 600, 1000);
        assert!(interior > 600 * 600 / 5);
    }

    #[test]
    fn test_periodicity_check_near_cycles() {
        assert_near_cycle_points_match(square_step, get_n_from_zero);
    }

    #[test]
    fn test_get_n_diverged() {
        let z = Complex { re: 0.0, im: 0.0 };

        let c1= Complex { re: 0.0, im: 0.0 };
        let c2= Complex { re: 1.0, im: 0.0 };
        let c3= Complex { re: 0.0, im: 1.0 };
        let c4= Complex { re: -1.0, im: 0.0 };
        let c5= Complex { re: -1.0, im: 1.0 };

        let max_iter = 10;
        let m = max_iter as f64;

        // z: 0 -> 0 -> 0 -> 0 -> ... => Convergence
        assert_eq!(get_n_diverged(z, c1, max_iter), m);
        // z: 0 -> 1 -> 2 -> 5 => Divergence
        let div_c2 = get_n_diverged(z, c2, max_iter);
        assert!(div_c2 > 1.0 && div_c2 < m);
        // z: 0 -> i -> -1+i -> -i -> -1+i -> -i -> ... => Convergence
        assert_eq!(get_n_diverged(z, c3, max_iter), m);
        // z: 0 -> -1 -> 0 -> -1 -> ... => Convergence
        assert_eq!(get_n_diverged(z, c4, max_iter), m);
        // z: 0 -> -1+i -> -1-i -> -1+3i => Divergence
        let div_c5 = get_n_diverged(z, c5, max_iter);
        assert!(div_c5 > 1.0 && div_c5 < m);
    }

    use std::fs;
    use image::{ImageBuffer, Rgba};

    fn type_of<T>(_: T) -> String{
        let a = std::any::type_name::<T>();
        return a.to_string();
    }

    #[test]
    fn test_generate_mandelbrot_set() {
        let width = 4000;
        let height = 4000;
        //let width = 400;
        //let height = 400;

        let view = View {
            width, height,
            x_min: -2.0, x_max: 1.0,
            y_min: -1.0, y_max: 1.0,
            max_iter: 300,
            aa_level: 1,
        };

        // Initial value of z_0
        let z_0 = Complex { re: 0.0, im: 0.0 };

        let data = generate_mandelbrot_set(&view, z_0);
        assert_eq!(data.len() as u32, width * height * 4);
        assert_eq!(type_of(&data), "&alloc::vec::Vec<u8>");

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/mandelbrot.png").unwrap();
    }
}
