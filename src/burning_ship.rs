use num_complex::Complex;


pub fn generate_burning_ship(
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
    // The Mandelbrot cardioid / bulb checks do not apply to the Burning Ship.
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
            crate::logic::get_n_diverged_burning_ship(c, max_iter)
        },
    )
}


#[cfg(test)]
mod tests_burning_ship {
    use super::*;
    use crate::logic::{get_n_diverged, get_n_diverged_burning_ship};

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

        let x_min = -2.1;
        let x_max = 1.2;
        let y_min = -2.3;
        let y_max = 1.0;
        let max_iter = 300;
        let aa_level = 1;

        let data = generate_burning_ship(width, height, x_min, x_max, y_min, y_max, max_iter, aa_level);
        assert_eq!(data.len() as u32, width * height * 4);

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/burning_ship.png").unwrap();
    }
}
