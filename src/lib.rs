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