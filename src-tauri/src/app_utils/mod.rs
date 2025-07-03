use std::fs;
use std::path::PathBuf;

use zune_core::bit_depth::BitDepth;
use zune_core::colorspace::ColorSpace;
use zune_core::options::EncoderOptions;
use zune_jpegxl::JxlSimpleEncoder;

pub fn save_image_to_file(image: &image::DynamicImage, file_path: PathBuf) -> Result<(), String> {
    if file_path.ends_with(".jxl") {
        let image_data = image.to_rgb8();
        let encoder = JxlSimpleEncoder::new(
            image_data.as_raw(),
            EncoderOptions::new(
                image.width() as usize,
                image.height() as usize,
                ColorSpace::RGB,
                BitDepth::Eight,
            ),
        );
        let encoder_result = match encoder.encode() {
            Ok(encoder_result) => encoder_result,
            Err(_) => {
                return Err(format!(
                    "[save_image_to_file] Failed to encode image: {}",
                    file_path.display()
                ));
            }
        };

        return match fs::write(file_path.clone(), encoder_result) {
            Ok(_) => Ok(()),
            Err(_) => Err(format!(
                "[save_image_to_file] Failed to save image to file: {}",
                file_path.display()
            )),
        };
    } else {
        if image.save(file_path.clone()).is_err() {
            return Err(format!(
                "[save_image_to_file] Failed to save image to file: {}",
                file_path.display()
            ));
        }
    }

    return Ok(());
}
