use num_complex::Complex;
use crate::logic::{escape_time, render_fractal, View};


pub fn get_n_diverged_burning_ship(c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell for the Burning Ship
    fractal, z_{n+1} = (|Re z_n| + i|Im z_n|)^2 + c with z_0 = 0, and
    returns the smoothed number of iterations up to the evaluation.
    */
    // (|x| + i|y|)^2 = x^2 - y^2 + 2i|xy|
    escape_time(Complex::new(0.0, 0.0), c, max_iter, |x, y, x2, y2| (x2 - y2, 2.0 * (x * y).abs()))
}

pub fn generate_burning_ship(view: &View) -> Vec<u8> {
    /*
    This function stores color information about each cell.
    */
    // The Mandelbrot cardioid / bulb checks do not apply to the Burning Ship.
    let max_iter = view.max_iter;
    render_fractal(view, |x, y| get_n_diverged_burning_ship(Complex { re: x, im: y }, max_iter))
}


#[cfg(test)]
mod tests_burning_ship {
    use super::*;
    use crate::logic::{color_map, get_n_diverged};

    #[test]
    fn test_get_n_diverged_burning_ship() {
        let max_iter = 10;
        let m = max_iter as f64;

        // z: 0 -> 0 -> 0 -> ... => Convergence
        assert_eq!(get_n_diverged_burning_ship(Complex { re: 0.0, im: 0.0 }, max_iter), m);
        // z: 0 -> -1 -> 0 -> -1 -> ... => Convergence
        assert_eq!(get_n_diverged_burning_ship(Complex { re: -1.0, im: 0.0 }, max_iter), m);
        // z: 0 -> 1 -> 2 -> 5 => Divergence
        let div = get_n_diverged_burning_ship(Complex { re: 1.0, im: 0.0 }, max_iter);
        assert!(div > 1.0 && div < m);
    }

    #[test]
    fn test_differs_from_mandelbrot() {
        // c = 0.2 - 1.0i
        // Mandelbrot:   0 -> 0.2-1.0i -> -0.76-1.4i -> ...
        // Burning Ship: 0 -> 0.2-1.0i -> -0.76-0.6i -> ...
        let z0 = Complex { re: 0.0, im: 0.0 };
        let c = Complex { re: 0.2, im: -1.0 };
        let max_iter = 100;
        assert_ne!(
            get_n_diverged(z0, c, max_iter),
            get_n_diverged_burning_ship(c, max_iter)
        );
    }

    #[test]
    fn test_not_symmetric_about_real_axis() {
        // The Burning Ship is NOT symmetric about the real axis, unlike the Mandelbrot set.
        let max_iter = 200;
        let upper = get_n_diverged_burning_ship(Complex { re: -1.75, im: 0.03 }, max_iter);
        let lower = get_n_diverged_burning_ship(Complex { re: -1.75, im: -0.03 }, max_iter);
        assert_ne!(upper, lower);
    }

    use std::fs;
    use image::{ImageBuffer, Rgba};

    #[test]
    fn test_generate_burning_ship() {
        let width = 400;
        let height = 400;

        let view = View {
            width, height,
            x_min: -1.8, x_max: -1.6,
            y_min: -0.1, y_max: 0.1,
            max_iter: 300,
            aa_level: 1,
        };

        let data = generate_burning_ship(&view);
        assert_eq!(data.len() as u32, width * height * 4);

        // With aa_level 1 each pixel is one sample at its center, so it must have the
        // color of get_n_diverged_burning_ship there.
        for (i, j) in [(0, 0), (123, 45), (200, 200), (399, 399)] {
            let x = view.x_min + (view.x_max - view.x_min) * (j as f64 + 0.5) / width as f64;
            let y = view.y_min + (view.y_max - view.y_min) * (i as f64 + 0.5) / height as f64;
            let (r, g, b) = color_map(get_n_diverged_burning_ship(Complex { re: x, im: y }, view.max_iter), view.max_iter);
            let idx = ((i * width + j) * 4) as usize;
            assert_eq!(&data[idx..idx + 4], &[r, g, b, 255]);
        }

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/burning_ship.png").unwrap();
    }
}
