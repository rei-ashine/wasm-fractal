use crate::logic::*;
use num_complex::Complex;


pub fn generate_mandelbrot_set(
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

    // Initial value of z_0
    let z = Complex {re: real, im: imaginary};

    // Threshold for coloring the periphery
    let threshold = max_iter as f64 * 0.9;
    
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
            
            let mut min_iter = f64::MAX;
            let mut max_iter_val = f64::MIN;

            for sy in 0..base_level {
                for sx in 0..base_level {
                    let dx = (sx as f64 + 0.5) / base_level as f64;
                    let dy = (sy as f64 + 0.5) / base_level as f64;
                    let y = y_min + (y_max - y_min) * (i as f64 + dy) / (height as f64);
                    let x = x_min + (x_max - x_min) * (j as f64 + dx) / (width as f64);

                    let c = Complex { re: x, im: y };
                    let iter_index = get_n_diverged(z, c, max_iter);

                    if iter_index < min_iter { min_iter = iter_index; }
                    if iter_index > max_iter_val { max_iter_val = iter_index; }

                    if iter_index < threshold {
                        let color = color_map(iter_index, max_iter);
                        r_total += color.0 as f64;
                        g_total += color.1 as f64;
                        b_total += color.2 as f64;
                    }
                }
            }

            let mut final_r = r_total / base_sq;
            let mut final_g = g_total / base_sq;
            let mut final_b = b_total / base_sq;

            // Adaptive refinement
            if fine_level > base_level && (max_iter_val - min_iter > 0.05) {
                let mut fine_r = 0.0;
                let mut fine_g = 0.0;
                let mut fine_b = 0.0;

                for sy in 0..fine_level {
                    for sx in 0..fine_level {
                        let dx = (sx as f64 + 0.5) / fine_level as f64;
                        let dy = (sy as f64 + 0.5) / fine_level as f64;
                        let y = y_min + (y_max - y_min) * (i as f64 + dy) / (height as f64);
                        let x = x_min + (x_max - x_min) * (j as f64 + dx) / (width as f64);

                        let c = Complex { re: x, im: y };
                        let iter_index = get_n_diverged(z, c, max_iter);

                        if iter_index < threshold {
                            let color = color_map(iter_index, max_iter);
                            fine_r += color.0 as f64;
                            fine_g += color.1 as f64;
                            fine_b += color.2 as f64;
                        }
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

        let x_min = -2.0;
        let x_max = 1.0;
        let y_min = -1.0;
        let y_max = 1.0;
        let max_iter = 300;
        let aa_level = 1;

        // Initial value of z_0
        let real = 0.0;
        let imaginary = 0.0;

        let data = generate_mandelbrot_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, aa_level);
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
