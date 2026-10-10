
use num_complex::Complex;
use crate::logic::{get_n_diverged, render_fractal, View};


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
        get_n_diverged(z_0, c, max_iter)
    })
}


#[cfg(test)]
mod tests_mandelbrot {
    use super::*;

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
