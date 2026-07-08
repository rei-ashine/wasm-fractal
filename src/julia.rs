use crate::logic::*;
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
    // To create a Uint8ClampedArray type that is an array of 8-bit unsigned integers in JavaScript,
    // set color information with Vec<u8>.
    let mut data = Vec::with_capacity((width * height * 4) as usize);

    // Initial value of c
    let c = Complex {re: real, im: imaginary};

    // Threshold for coloring the periphery
    let threshold = max_iter as f64 * 0.9;
    let aa_sq = (aa_level * aa_level) as f64;

    for i in 0..height {
        for j in 0..width {
            let mut r_total = 0.0;
            let mut g_total = 0.0;
            let mut b_total = 0.0;

            for sy in 0..aa_level {
                for sx in 0..aa_level {
                    let dx = (sx as f64 + 0.5) / aa_level as f64;
                    let dy = (sy as f64 + 0.5) / aa_level as f64;
                    let y = y_min + (y_max - y_min) * (i as f64 + dy) / (height as f64);
                    let x = x_min + (x_max - x_min) * (j as f64 + dx) / (width as f64);

                    let z = Complex { re: x, im: y };
                    let iter_index = get_n_diverged(z, c, max_iter);

                    if iter_index < threshold {
                        let color = color_map(iter_index, max_iter);
                        r_total += color.0 as f64;
                        g_total += color.1 as f64;
                        b_total += color.2 as f64;
                    }
                }
            }

            data.push((r_total / aa_sq) as u8);
            data.push((g_total / aa_sq) as u8);
            data.push((b_total / aa_sq) as u8);
            data.push(255);
        }
    }
    data
}


#[cfg(test)]
mod tests_julia{
    use super::*;

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