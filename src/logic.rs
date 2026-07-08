use num_complex::Complex;


pub fn get_n_diverged(z: Complex<f64>, c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell and
    returns the smoothed number of iterations up to the evaluation.
    */
    let mut z = z;

    for i in 1..max_iter {
        z = z * z + c;
        let norm_sqr = z.norm_sqr();
        if norm_sqr > 256.0 {
            // Smooth coloring formula: i + 1 - ln(ln(|z|)) / ln(2)
            // |z| = sqrt(norm_sqr), ln(|z|) = 0.5 * ln(norm_sqr)
            let log_z = 0.5 * norm_sqr.ln();
            let nu = log_z.ln() / 2.0_f64.ln();
            return (i as f64) + 1.0 - nu;
        }
    }
    max_iter as f64
}

pub fn color_map(iter_index: f64, max_iter: usize) -> (u8, u8, u8) {
    let t = iter_index / (max_iter as f64);
    let r = (15.0 * (1.0 - t) * t * t * t * 255.0) as u8;
    let g = (20.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0) as u8;
    let b = (15.0 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0) as u8;
    (r, g, b)
}