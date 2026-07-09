
use num_complex::Complex;


pub fn generate_julia_set(
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
    real: f64,
    imaginary: f64,
    aa_level: u32,
) -> Vec<u8> {
    // Initial value of c
    let c = Complex { re: real, im: imaginary };

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
            let z = Complex { re: x, im: y };
            crate::logic::get_n_diverged(z, c, max_iter)
        },
    )
}


#[cfg(test)]
mod tests_julia{
    use super::*;
    use crate::logic::get_n_diverged;

    #[test]
    fn test_get_n_diverged() {
        let c = Complex { re: 0.0, im: 0.0 };

        let z1= Complex { re: 0.0, im: 0.0 };
        let z2= Complex { re: 1.0, im: 0.0 };
        let z3= Complex { re: 0.0, im: 1.0 };
        let z4= Complex { re: -1.0, im: 0.0 };
        let z5= Complex { re: -1.0, im: 1.0 };

        let max_iter = 10;
        let m = max_iter as f64;

        // z: 0 -> 0 -> 0 -> 0 -> ... => Convergence
        assert_eq!(get_n_diverged(z1, c, max_iter), m);
        // z: 1 -> 1 -> 1 -> 1 -> ... => Convergence
        assert_eq!(get_n_diverged(z2, c, max_iter), m);
        // z: i -> -1 -> 1 -> 1 -> ... => Convergence
        assert_eq!(get_n_diverged(z3, c, max_iter), m);
        // z: -1 -> 1 -> 1 -> 1 -> ... => Convergence
        assert_eq!(get_n_diverged(z4, c, max_iter), m);
        // z: -1+i -> -2i -> -4 => Divergence
        let div_z5 = get_n_diverged(z5, c, max_iter);
        assert!(div_z5 > 1.0 && div_z5 < m);
    }

    #[test]
    fn test_smooth_coloring_continuity() {
        let c = Complex { re: 0.0, im: 0.0 };
        let max_iter = 100;
        
        let z_a = Complex { re: 16.0, im: 0.0 }; // Just escaped
        let z_b = Complex { re: 16.1, im: 0.0 }; // Slightly further
        let val_a = get_n_diverged(z_a, c, max_iter);
        let val_b = get_n_diverged(z_b, c, max_iter);
        
        // Both should diverge
        assert!(val_a < max_iter as f64);
        assert!(val_b < max_iter as f64);
        // The further point should escape "faster" (lower iteration index)
        assert!(val_b < val_a);
        // Difference should be continuous, not a discrete integer jump
        let diff = val_a - val_b;
        assert!(diff > 0.0 && diff < 1.0);
    }

    use std::fs;
    use image::{ImageBuffer, Rgba};

    fn type_of<T>(_: T) -> String{
        let a = std::any::type_name::<T>();
        return a.to_string();
    }

    #[test]
    fn test_generate_julia_set() {
        let width = 4000;
        let height = 4000;
        //let width = 400;
        //let height = 400;

        let x_min = -2.0;
        let x_max = 2.0;
        let y_min = -1.5;
        let y_max = 1.5;
        let max_iter = 1000;
        let aa_level = 1;

        // Initial value of c
        let real = -0.7269;
        let imaginary = 0.1889;
        //let real = -0.4;
        //let imaginary = 0.6;

        let data = generate_julia_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, aa_level);
        assert_eq!(data.len() as u32, width * height * 4);
        assert_eq!(type_of(&data), "&alloc::vec::Vec<u8>");

        // Create an ImageBuffer from the data
        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, data).unwrap();
        match fs::create_dir_all("target/tmp") {
            Err(why) => println!("! {:?}", why.kind()),
            Ok(_) => {},
        }
        img.save("target/tmp/julia.png").unwrap();
    }
}