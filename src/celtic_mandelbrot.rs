use num_complex::Complex;
use crate::logic::{escape_time, render_fractal, View};


pub fn get_n_diverged_celtic(c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell for the Celtic Mandelbrot
    set, z_{n+1} = |Re(z_n^2)| + i Im(z_n^2) + c with z_0 = 0, and
    returns the smoothed number of iterations up to the evaluation.
    */
    // |Re(z^2)| + i Im(z^2) = |x^2 - y^2| + 2ixy
    escape_time(Complex::new(0.0, 0.0), c, max_iter, |x, y, x2, y2| ((x2 - y2).abs(), 2.0 * x * y))
}

pub fn generate_celtic_mandelbrot(view: &View) -> Vec<u8> {
    /*
    This function stores color information about each cell.
    */
    // The Mandelbrot cardioid / bulb checks do not apply to the Celtic Mandelbrot set.
    let max_iter = view.max_iter;
    render_fractal(view, |x, y| get_n_diverged_celtic(Complex { re: x, im: y }, max_iter))
}


#[cfg(test)]
mod tests_celtic_mandelbrot {
    use super::*;
    use crate::logic::{color_map, get_n_diverged};

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
            // Compare escaping orbits, so the test cannot pass just because both are max_iter
            assert!(upper < max_iter as f64);
            assert_eq!(upper, lower);
        }
    }

    use std::fs;
    use image::{ImageBuffer, Rgba};

    #[test]
    fn test_generate_celtic_mandelbrot() {
        let width = 400;
        let height = 400;

        let view = View {
            width, height,
            x_min: -2.0, x_max: 2.0,
            y_min: -2.0, y_max: 2.0,
            max_iter: 300,
            aa_level: 1,
        };

        let data = generate_celtic_mandelbrot(&view);
        assert_eq!(data.len() as u32, width * height * 4);

        // c = 0 (the center) is in the set, so its pixel is black
        let center = ((200 * width + 200) * 4) as usize;
        assert_eq!(&data[center..center + 4], &[0, 0, 0, 255]);

        // With aa_level 1 each pixel is one sample at its center, so it must have the
        // color of get_n_diverged_celtic there.
        for (i, j) in [(0, 0), (150, 350), (300, 200), (399, 399)] {
            let x = view.x_min + (view.x_max - view.x_min) * (j as f64 + 0.5) / width as f64;
            let y = view.y_min + (view.y_max - view.y_min) * (i as f64 + 0.5) / height as f64;
            let (r, g, b) = color_map(get_n_diverged_celtic(Complex { re: x, im: y }, view.max_iter), view.max_iter);
            let idx = ((i * width + j) * 4) as usize;
            assert_eq!(&data[idx..idx + 4], &[r, g, b, 255]);
        }

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/celtic_mandelbrot.png").unwrap();
    }
}
