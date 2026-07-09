use num_complex::Complex;

const LN_2: f64 = std::f64::consts::LN_2;

pub fn get_n_diverged(z: Complex<f64>, c: Complex<f64>, max_iter: usize) -> f64 {
    /*
    This function evaluates the divergence of a cell and
    returns the smoothed number of iterations up to the evaluation.
    */
    let mut zx = z.re;
    let mut zy = z.im;
    let cx = c.re;
    let cy = c.im;

    let mut zx2 = zx * zx;
    let mut zy2 = zy * zy;

    for i in 1..max_iter {
        // Optimized z = z * z + c
        zy = 2.0 * zx * zy + cy;
        zx = zx2 - zy2 + cx;

        zx2 = zx * zx;
        zy2 = zy * zy;

        let norm_sqr = zx2 + zy2;
        if norm_sqr > 256.0 {
            // Smooth coloring formula: i + 1 - ln(ln(|z|)) / ln(2)
            // |z| = sqrt(norm_sqr), ln(|z|) = 0.5 * ln(norm_sqr)
            let log_z = 0.5 * norm_sqr.ln();
            let nu = log_z.ln() / LN_2;
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

pub fn render_fractal<F>(
    width: u32,
    height: u32,
    x_min: f64,
    x_max: f64,
    y_min: f64,
    y_max: f64,
    max_iter: usize,
    aa_level: u32,
    calc_iter: F,
) -> Vec<u8>
where
    F: Fn(f64, f64) -> f64,
{
    let mut data = Vec::with_capacity((width * height * 4) as usize);
    
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

                    let iter_index = calc_iter(x, y);

                    if iter_index < min_iter { min_iter = iter_index; }
                    if iter_index > max_iter_val { max_iter_val = iter_index; }

                    let color = color_map(iter_index, max_iter);
                    r_total += color.0 as f64;
                    g_total += color.1 as f64;
                    b_total += color.2 as f64;
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

                        let iter_index = calc_iter(x, y);

                        let color = color_map(iter_index, max_iter);
                        fine_r += color.0 as f64;
                        fine_g += color.1 as f64;
                        fine_b += color.2 as f64;
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