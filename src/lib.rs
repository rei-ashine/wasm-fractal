mod utils;
mod logic;
mod julia;
mod mandelbrot;
mod burning_ship;
mod celtic_mandelbrot;
use logic::View;
use num_complex::Complex;
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

/// The fractals this crate can render. On the JS side this is the string union
/// "mandelbrot" | "julia" | "burningShip" | "celticMandelbrot".
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub enum FractalKind {
    Mandelbrot = "mandelbrot",
    Julia = "julia",
    BurningShip = "burningShip",
    CelticMandelbrot = "celticMandelbrot",
}

/// Renders one fractal over [x_min, x_max] x [y_min, y_max] as RGBA bytes.
///
/// `real` and `imaginary` are z_0 for the Mandelbrot set and c for the Julia set;
/// the Burning Ship and the Celtic Mandelbrot set always start from z_0 = 0 and ignore them.
#[wasm_bindgen]
pub fn generate_fractal(
    kind: FractalKind,
    width: u32,
    height: u32,
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
    let view = View { width, height, x_min, x_max, y_min, y_max, max_iter, aa_level };
    let param = Complex { re: real, im: imaginary };
    let data = match kind {
        FractalKind::Mandelbrot => mandelbrot::generate_mandelbrot_set(&view, param),
        FractalKind::Julia => julia::generate_julia_set(&view, param),
        FractalKind::BurningShip => burning_ship::generate_burning_ship(&view),
        FractalKind::CelticMandelbrot => celtic_mandelbrot::generate_celtic_mandelbrot(&view),
        // wasm-bindgen maps a string that is not one of the variants above to this
        // hidden variant. Matching it by name (not with `_`) keeps the match exhaustive,
        // so a new variant without an arm fails to compile.
        FractalKind::__Invalid => wasm_bindgen::throw_str("Unknown fractal kind"),
    };
    FractalData { data }
}

#[cfg(test)]
mod tests {
    use crate::logic::View;
    use num_complex::Complex;

    #[test]
    fn test_verify_adaptive_ssaa() {
        let width = 400;
        let height = 400;
        let view = View {
            width, height,
            x_min: -0.75, x_max: -0.73,
            y_min: 0.1, y_max: 0.12,
            max_iter: 500,
            aa_level: 0,
        };
        let z_0 = Complex { re: 0.0, im: 0.0 };
        let with_aa = |aa_level| crate::mandelbrot::generate_mandelbrot_set(&View { aa_level, ..view }, z_0);

        let img_base = with_aa(2);
        let img_adaptive = with_aa(3);
        let img_ultra = with_aa(4);

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