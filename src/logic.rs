use num_complex::Complex;


pub fn get_n_diverged(z: Complex<f64>, c: Complex<f64>, max_iter: usize) -> u32 {
    /*
    This function evaluates the divergence of a cell and
    returns the number of iterations up to the evaluation.
    */
    let mut z = z;

    for i in 1..max_iter {
        z = z * z + c;
        if z.norm_sqr() > 4.0 {
            // If the absolute value of a complex number (|z_i|) exceeds 2,
            // it is considered divergent.
            return i as u32
        }
    }
    max_iter as u32
}

pub fn color_map(iter_index: usize, max_iter: usize) -> (u8, u8, u8) {
    let t = iter_index as f64 / max_iter as f64;
    let r = (15.0 * (1.0 - t) * t * t * t * 255.0) as u8;
    let g = (20.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0) as u8;
    let b = (15.0 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0) as u8;
    (r, g, b)
}