use num_complex::Complex;


pub fn generate_celtic_mandelbrot(
    /*
    This function stores color information about each cell.
    */
    width: u32,
    height:u32,
    x_min: f64,
    x_max: f64,
    y_min: f64,
    y_max: f64,
    max_iter: usize,
    aa_level: u32,
) -> Vec<u8> {
    // The Mandelbrot cardioid / bulb checks do not apply to the Celtic Mandelbrot set.
    crate::logic::render_fractal(
        width,
        height,
        x_min,
        x_max,
        y_min,
        y_max,
        max_iter,
        aa_level,
        |x, y| {
            let c = Complex { re: x, im: y };
            crate::logic::get_n_diverged_celtic(c, max_iter)
        },
    )
}


#[cfg(test)]
mod tests_celtic_mandelbrot {
    use super::*;
    use crate::logic::{get_n_diverged, get_n_diverged_celtic};

    #[test]
    fn test_get_n_diverged_celtic() {
        let max_iter = 10;
        let m = max_iter as f64;

        // z: 0 -> 0 -> 0 -> ... => Convergence
        assert_eq!(get_n_diverged_celtic(Complex { re: 0.0, im: 0.0 }, max_iter), m);
        // z: 0 -> -1 -> 0 -> -1 -> ... => Convergence
        assert_eq!(get_n_diverged_celtic(Complex { re: -1.0, im: 0.0 }, max_iter), m);
        // z: 0 -> 1 -> 2 -> 5 => Divergence
        let div = get_n_diverged_celtic(Complex { re: 1.0, im: 0.0 }, max_iter);
        assert!(div > 1.0 && div < m);
    }

    #[test]
    fn test_differs_from_mandelbrot() {
        // c = i
        // Mandelbrot: 0 -> i -> -1+i -> -i -> -1+i -> ... => Convergence
        // Celtic:     0 -> i -> 1+i -> 3i -> 9+i -> ... => Divergence
        let z0 = Complex { re: 0.0, im: 0.0 };
        let c = Complex { re: 0.0, im: 1.0 };
        let max_iter = 100;
        assert_eq!(get_n_diverged(z0, c, max_iter), max_iter as f64);
        assert!(get_n_diverged_celtic(c, max_iter) < max_iter as f64);
    }

    #[test]
    fn test_symmetric_about_real_axis() {
        // Unlike the Burning Ship, Im(z^2) = 2xy keeps its sign, so the set is
        // symmetric about the real axis: c and conj(c) have mirrored orbits.
        let max_iter = 200;
        for (re, im) in [(-1.75, 0.03), (0.2, 0.7), (-0.5, 1.1)] {
            let upper = get_n_diverged_celtic(Complex { re, im }, max_iter);
            let lower = get_n_diverged_celtic(Complex { re, im: -im }, max_iter);
            assert_eq!(upper, lower);
        }
    }

    use std::fs;
    use image::{ImageBuffer, Rgba};

    #[test]
    fn test_generate_celtic_mandelbrot() {
        let width = 400;
        let height = 400;

        let x_min = -2.0;
        let x_max = 2.0;
        let y_min = -2.0;
        let y_max = 2.0;
        let max_iter = 300;
        let aa_level = 1;

        let data = generate_celtic_mandelbrot(width, height, x_min, x_max, y_min, y_max, max_iter, aa_level);
        assert_eq!(data.len() as u32, width * height * 4);

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/celtic_mandelbrot.png").unwrap();
    }
}
