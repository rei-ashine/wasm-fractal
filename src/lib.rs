mod utils;
mod logic;
mod julia;
mod mandelbrot;
use utils::set_panic_hook;
use wasm_bindgen::prelude::*;


#[wasm_bindgen]
pub struct FractalData {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl FractalData {
    pub fn get_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }
    pub fn get_len(&self) -> usize {
        self.data.len()
    }
}

#[wasm_bindgen]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[wasm_bindgen]
pub fn generate_julia_set(
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
) -> FractalData {
    set_panic_hook();
    let data = julia::generate_julia_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, aa_level);
    FractalData { data }
}

#[wasm_bindgen]
pub fn generate_mandelbrot_set(
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
) -> FractalData {
    set_panic_hook();
    let data = mandelbrot::generate_mandelbrot_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, aa_level);
    FractalData { data }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_adaptive_ssaa() {
        let width = 400;
        let height = 400;
        let x_min = -0.75;
        let x_max = -0.73;
        let y_min = 0.1;
        let y_max = 0.12;
        let max_iter = 500;
        let real = 0.0;
        let imaginary = 0.0;

        let img_base = crate::mandelbrot::generate_mandelbrot_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, 2);
        let img_adaptive = crate::mandelbrot::generate_mandelbrot_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, 3);
        let img_ultra = crate::mandelbrot::generate_mandelbrot_set(width, height, x_min, x_max, y_min, y_max, max_iter, real, imaginary, 4);

        let mut diff_pixels_3 = 0;
        let mut diff_pixels_4 = 0;
        
        for i in 0..(width * height) as usize {
            let idx = i * 4;
            let r1 = img_base[idx];
            let g1 = img_base[idx+1];
            let b1 = img_base[idx+2];

            let r2 = img_adaptive[idx];
            let g2 = img_adaptive[idx+1];
            let b2 = img_adaptive[idx+2];

            let r3 = img_ultra[idx];
            let g3 = img_ultra[idx+1];
            let b3 = img_ultra[idx+2];

            if r1 != r2 || g1 != g2 || b1 != b2 {
                diff_pixels_3 += 1;
            }
            if r1 != r3 || g1 != g3 || b1 != b3 {
                diff_pixels_4 += 1;
            }
        }

        let total = width * height;
        println!("=== Adaptive SSAA Verification ===");
        println!("Total Pixels: {}", total);
        println!("Pixels Refined by 4x4 (aa_level=3): {} ({:.2}%)", diff_pixels_3, (diff_pixels_3 as f64 / total as f64) * 100.0);
        println!("Pixels Refined by 8x8 (aa_level=4): {} ({:.2}%)", diff_pixels_4, (diff_pixels_4 as f64 / total as f64) * 100.0);
        println!("==================================");
        
        // Assert that at least some pixels were refined, but not all of them
        assert!(diff_pixels_3 > 0);
        assert!((diff_pixels_3 as f64 / total as f64) < 0.5);
    }
}