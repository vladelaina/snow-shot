use fast_image_resize::{FilterType, IntoImageView, ResizeAlg, ResizeOptions};
use fast_image_resize::{PixelType, Resizer, images::Image};
use hora::core::ann_index::ANNIndex;
use hora::core::metrics::Metric;
use hora::index::{hnsw_idx::HNSWIndex, hnsw_params::HNSWParams};
use image::{DynamicImage, GenericImageView, GrayImage};
use imageproc::corners;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(PartialEq, Serialize, Deserialize)]
pub enum ScrollDirection {
    /// 垂直滚动
    Vertical = 0,
    /// 水平滚动
    Horizontal = 1,
}

#[derive(PartialEq, Serialize, Deserialize)]
pub enum ScrollImageList {
    /// 上图片列表
    Top = 0,
    /// 下图片列表
    Bottom = 1,
}

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq)]
pub struct ScrollOffset {
    pub x: i32,
    pub y: i32,
}

impl ScrollOffset {
    pub fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }

    pub fn recovery_scale(&self, scale: f32) -> Self {
        Self {
            x: (self.x as f32 / scale) as i32,
            y: (self.y as f32 / scale) as i32,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CropRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl CropRegion {
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }
}

pub struct ScrollScreenshotService {
    /// 滚动截图列表（上或左）
    pub top_image_list: Vec<image::DynamicImage>,
    /// 滚动截图列表（下或右）
    pub bottom_image_list: Vec<image::DynamicImage>,
    /// 图片特征点列表
    pub image_corners: Vec<ScrollOffset>,
    /// 图片描述符列表
    pub image_corners_descriptors: Vec<Vec<f32>>,
    /// 当前方向
    pub current_direction: ScrollDirection,
    /// 图片宽度
    pub image_width: u32,
    /// 图片高度
    pub image_height: u32,
    /// 上图片尺寸（方向边）
    pub top_image_size: i32,
    /// 下图片尺寸（方向边）
    pub bottom_image_size: i32,
    /// 图片缩放
    pub image_scale: f32,
    /// 图片缩放器
    pub image_resizer: Resizer,
    /// 特征点阈值
    pub corner_threshold: u8,
    /// 描述符块大小
    pub descriptor_patch_size: usize,
    /// 特征点索引
    pub ann_index: HNSWIndex<f32, usize>,
    /// 最小变化量
    pub min_size_delta: i32,
}

impl ScrollScreenshotService {
    fn compute_descriptor(&self, img: &image::GrayImage, corner: &ScrollOffset) -> Vec<f32> {
        let mut descriptor =
            Vec::with_capacity((self.descriptor_patch_size * self.descriptor_patch_size) as usize);
        let half_size = self.descriptor_patch_size as i32 / 2;

        let corner_x = corner.x;
        let corner_y = corner.y;
        let width = img.width() as i32;
        let height = img.height() as i32;
        for y in -half_size..half_size {
            for x in -half_size..half_size {
                let px = corner_x + x;
                let py = corner_y + y;

                if px >= 0 && px < width && py >= 0 && py < height {
                    let pixel = unsafe { img.unsafe_get_pixel(px as u32, py as u32) };
                    descriptor.push(pixel[0] as f32 / 255.0);
                } else {
                    descriptor.push(0.0);
                }
            }
        }

        descriptor
    }

    fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
        a.iter()
            .zip(b.iter())
            .map(|(x, y)| (x - y).powi(2))
            .sum::<f32>()
            .sqrt()
    }

    pub fn new() -> Self {
        Self {
            top_image_list: vec![],
            bottom_image_list: vec![],
            image_corners: vec![],
            image_corners_descriptors: vec![],
            current_direction: ScrollDirection::Vertical,
            image_width: 0,
            image_height: 0,
            top_image_size: 0,
            bottom_image_size: 0,
            image_scale: 1.0,
            image_resizer: Resizer::new(),
            corner_threshold: 64,
            descriptor_patch_size: 9,
            min_size_delta: 64,
            ann_index: HNSWIndex::<f32, usize>::new(0, &HNSWParams::<f32>::default()),
        }
    }

    pub fn init(
        &mut self,
        direction: ScrollDirection,
        image_width: u32,
        image_height: u32,
        sample_rate: f32,
        min_sample_size: u32,
        max_sample_size: u32,
        corner_threshold: u8,
        descriptor_patch_size: usize,
        min_size_delta: i32,
    ) {
        self.top_image_list.clear();
        self.bottom_image_list.clear();
        self.image_corners.clear();
        self.image_corners_descriptors.clear();
        self.current_direction = direction;
        self.image_width = image_width;
        self.image_height = image_height;
        self.top_image_size = 0;
        self.bottom_image_size = 0;
        self.corner_threshold = corner_threshold;
        self.descriptor_patch_size = descriptor_patch_size;
        self.min_size_delta = min_size_delta;
        self.ann_index = HNSWIndex::<f32, usize>::new(
            (descriptor_patch_size & !1).pow(2),
            &HNSWParams::<f32>::default(),
        );

        let scale_side_size;
        if self.current_direction == ScrollDirection::Vertical {
            scale_side_size = image_width as f32;
        } else {
            scale_side_size = image_height as f32;
        }

        let target_side_size = (scale_side_size * sample_rate)
            .min(max_sample_size as f32)
            .max(min_sample_size as f32);

        let width_scale = target_side_size / scale_side_size;

        self.image_scale = width_scale.min(1.0);
    }

    fn get_descriptors(
        &self,
        image: &image::ImageBuffer<image::Luma<u8>, Vec<u8>>,
        corners: &[ScrollOffset],
    ) -> Vec<Vec<f32>> {
        corners
            .par_iter()
            .map(|corner| self.compute_descriptor(image, corner))
            .collect()
    }

    fn get_gray_image(&mut self, image: &DynamicImage) -> GrayImage {
        let image_width = image.width();
        let image_height = image.height();

        // 先转为灰度图再缩放，效率更高
        let mut gray_image = image.to_luma8();

        if self.image_scale >= 1.0 {
            return gray_image;
        }

        let src_image = Image::from_slice_u8(
            image_width,
            image_height,
            gray_image.as_mut(),
            PixelType::U8,
        )
        .unwrap();

        let mut dst_image = Image::new(
            (image_width as f32 * self.image_scale) as u32,
            (image_height as f32 * self.image_scale) as u32,
            PixelType::U8,
        );

        self.image_resizer
            .resize(
                &src_image,
                &mut dst_image,
                &ResizeOptions::new().resize_alg(ResizeAlg::Convolution(FilterType::CatmullRom)),
            )
            .unwrap();

        GrayImage::from_vec(
            (image_width as f32 * self.image_scale) as u32,
            (image_height as f32 * self.image_scale) as u32,
            dst_image.into_vec(),
        )
        .unwrap()
    }

    fn get_crop_region(&self, delta_size: i32) -> CropRegion {
        let image_width = self.image_width;
        let image_height = self.image_height;
        let region: CropRegion;

        if self.current_direction == ScrollDirection::Vertical {
            let start_position = image_height - delta_size.abs() as u32;
            if delta_size > 0 {
                region = CropRegion::new(
                    0,
                    start_position,
                    image_width,
                    image_height - start_position,
                );
            } else {
                region = CropRegion::new(0, 0, image_width, image_height - start_position);
            }
        } else {
            let start_position = image_width - delta_size.abs() as u32;
            if start_position > 0 {
                region = CropRegion::new(
                    start_position,
                    0,
                    image_width - start_position,
                    image_height,
                );
            } else {
                region = CropRegion::new(0, 0, image_width - start_position, image_height);
            }
        }

        region
    }

    fn get_corners_with_region(
        &self,
        image: &image::GrayImage,
        region: &CropRegion,
    ) -> Vec<ScrollOffset> {
        let corners = self.get_corners(image);

        let min_x = region.x as i32 - 10;
        let max_x = (region.x + region.width) as i32 + 10;
        let min_y = region.y as i32 - 10;
        let max_y = (region.y + region.height) as i32 + 10;

        corners
            .par_iter()
            .filter_map(|corner| {
                if corner.x >= min_x && corner.x < max_x && corner.y >= min_y && corner.y < max_y {
                    Some(*corner)
                } else {
                    None
                }
            })
            .collect()
    }

    fn get_corners(&self, image: &image::GrayImage) -> Vec<ScrollOffset> {
        let corners = corners::corners_fast9(image, self.corner_threshold);
        corners
            .par_iter()
            .map(|corner| {
                return ScrollOffset {
                    x: corner.x as i32,
                    y: corner.y as i32,
                };
            })
            .collect()
    }

    fn add_index(&mut self, image: image::DynamicImage, delta_size: i32) -> image::DynamicImage {
        let region = self.get_crop_region(delta_size);
        let gray_region = CropRegion::new(
            (region.x as f32 * self.image_scale) as u32,
            (region.y as f32 * self.image_scale) as u32,
            (region.width as f32 * self.image_scale) as u32,
            (region.height as f32 * self.image_scale) as u32,
        );

        let gray_image = self.get_gray_image(&image);

        let base_index = self.image_corners.len();
        let corners: Vec<ScrollOffset> = self.get_corners_with_region(&gray_image, &gray_region);

        let descriptors = self.get_descriptors(&gray_image, &corners);
        let bottom_image_size = (self.bottom_image_size as f32 * self.image_scale) as i32;
        let top_image_size = (self.top_image_size as f32 * self.image_scale) as i32;

        let min_x = gray_region.x as i32;
        let min_y = gray_region.y as i32;
        self.image_corners.extend(corners.iter().map(|item| {
            let (x, y) = if self.current_direction == ScrollDirection::Vertical {
                (
                    item.x,
                    if delta_size > 0 {
                        bottom_image_size + item.y - min_y
                    } else {
                        -top_image_size - gray_region.height as i32 + item.y
                    },
                )
            } else {
                (
                    if delta_size > 0 {
                        bottom_image_size + item.x - min_x
                    } else {
                        -top_image_size - gray_region.width as i32 + item.x
                    },
                    item.y,
                )
            };
            ScrollOffset { x, y }
        }));

        descriptors.iter().enumerate().for_each(|(i, descriptor)| {
            self.ann_index.add(descriptor, i + base_index).unwrap();
        });

        self.image_corners_descriptors.extend(descriptors);

        self.ann_index.build(Metric::Euclidean).unwrap();

        image.crop_imm(region.x, region.y, region.width, region.height)
    }

    fn push_image(
        &mut self,
        image: image::DynamicImage,
        origin_position: ScrollOffset,
        new_position: ScrollOffset,
    ) -> (i32, Option<ScrollImageList>) {
        let top_side_position = ScrollOffset {
            x: origin_position.x - new_position.x,
            y: origin_position.y - new_position.y,
        }
        .recovery_scale(self.image_scale);

        // 计算边缘位置
        let edge_position = if self.current_direction == ScrollDirection::Vertical {
            if top_side_position.y >= 0 {
                top_side_position.y + image.height() as i32
            } else {
                top_side_position.y
            }
        } else {
            if top_side_position.x >= 0 {
                top_side_position.x + image.width() as i32
            } else {
                top_side_position.x
            }
        };

        // 处理新增区域
        let (delta_size, is_bottom) = if edge_position > 0 && edge_position > self.bottom_image_size
        {
            (edge_position - self.bottom_image_size, true)
        } else if edge_position <= 0 && edge_position.abs() > self.top_image_size {
            (edge_position + self.top_image_size, false)
        } else {
            return (edge_position, None); // 没有新增区域或变化太小
        };

        // 变化量小于最小阈值，直接返回
        if delta_size.abs() < self.min_size_delta {
            return (edge_position, None);
        }

        let cropped_image = self.add_index(image, if is_bottom { delta_size } else { delta_size });

        if is_bottom {
            self.bottom_image_list.push(cropped_image.clone());
            self.bottom_image_size += delta_size;

            (edge_position, Some(ScrollImageList::Bottom))
        } else {
            self.top_image_list.push(cropped_image.clone());
            self.top_image_size -= delta_size;

            (edge_position, Some(ScrollImageList::Top))
        }
    }

    pub fn handle_image(&mut self, image: DynamicImage) -> Option<(i32, Option<ScrollImageList>)> {
        let image_width = image.width();
        let image_height = image.height();

        if image_width != self.image_width || image_height != self.image_height {
            return None;
        }

        let gray_image = self.get_gray_image(&image);

        // 提取当前图片的特征点
        let image_corners = self.get_corners(&gray_image);

        let current_descriptors = self.get_descriptors(&gray_image, &image_corners);

        if self.top_image_list.is_empty() && self.bottom_image_list.is_empty() {
            return Some(self.push_image(
                image,
                ScrollOffset { x: 0, y: 0 },
                ScrollOffset { x: 0, y: 0 },
            ));
        }

        let max_dist = self.descriptor_patch_size as f32 / 8.0;
        let offsets: Vec<(ScrollOffset, usize, usize)> = current_descriptors
            .par_iter()
            .enumerate()
            .filter_map(|(i, descriptor)| {
                let search_result = self.ann_index.search(descriptor, 1);
                if search_result.is_empty() {
                    return None;
                }

                let idx1 = search_result[0];
                let dist =
                    Self::euclidean_distance(&self.image_corners_descriptors[idx1], descriptor);

                if dist < max_dist {
                    let point1 = &self.image_corners[idx1];
                    let point2 = &image_corners[i];
                    let dx = point2.x - point1.x;
                    let dy = point2.y - point1.y;
                    Some((ScrollOffset { x: dx, y: dy }, idx1, i))
                } else {
                    None
                }
            })
            .collect();

        let offset_count = offsets.len();
        if (offset_count as f32 / current_descriptors.len() as f32) < 0.1 {
            return None;
        }

        // 寻找频率最高的偏移作为主要偏移模式
        let mut offset_counts: std::collections::HashMap<ScrollOffset, (i32, usize, usize)> =
            std::collections::HashMap::new();
        for (offset, origin_position_index, new_position_index) in offsets {
            if let Some(value) = offset_counts.get_mut(&offset) {
                value.0 += 1;
            } else {
                offset_counts.insert(
                    ScrollOffset {
                        x: offset.x,
                        y: offset.y,
                    },
                    (1, origin_position_index, new_position_index),
                );
            }
        }

        let mut sorted_offsets: Vec<_> = offset_counts.iter().collect();
        sorted_offsets.sort_by_key(|(_, (count, _, _))| -count);

        let Some((
            _,
            (dominant_count, dominant_origin_position_index, dominant_new_position_index),
        )) = offset_counts.iter().max_by_key(|(_, (count, _, _))| count)
        else {
            return None;
        };

        // 统计偏移分布，计算平均值和标准差
        let mean_count = offset_counts
            .values()
            .map(|(count, _, _)| count)
            .sum::<i32>() as f32
            / offset_counts.len() as f32;
        let std_dev = (offset_counts
            .values()
            .map(|(count, _, _)| (*count as f32 - mean_count).powi(2))
            .sum::<f32>()
            / offset_counts.len() as f32)
            .sqrt();

        let z_score = (*dominant_count as f32 - mean_count) / std_dev;

        // 如果主导偏移不够显著，则返回 None
        if z_score < 2.0 {
            return None;
        }

        // 将偏移的图片推到列表中
        Some(self.push_image(
            image,
            self.image_corners[*dominant_origin_position_index],
            image_corners[*dominant_new_position_index],
        ))
    }

    pub fn export(&self) -> Option<image::DynamicImage> {
        if self.top_image_list.is_empty() && self.bottom_image_list.is_empty() {
            return None;
        }

        // 计算最终图片尺寸
        let (total_width, total_height) = if self.current_direction == ScrollDirection::Vertical {
            (
                self.image_width,
                (self.top_image_size + self.bottom_image_size) as u32,
            )
        } else {
            (
                (self.top_image_size + self.bottom_image_size) as u32,
                self.image_height,
            )
        };

        // 创建最终大小的图片
        let mut final_image = image::DynamicImage::new_rgb8(total_width, total_height);

        // 当前位置偏移量
        let mut offset_x = 0;
        let mut offset_y = 0;

        // 先处理top_image_list（从尾部开始，即倒序）
        if self.current_direction == ScrollDirection::Vertical {
            // 垂直方向，从顶部开始
            offset_y = 0;
        } else {
            // 水平方向，从左侧开始
            offset_x = 0;
        }

        for img in self.top_image_list.iter().rev() {
            if self.current_direction == ScrollDirection::Vertical {
                // 垂直拼接
                image::imageops::overlay(&mut final_image, img, 0, offset_y as i64);
                offset_y += img.height();
            } else {
                // 水平拼接
                image::imageops::overlay(&mut final_image, img, offset_x as i64, 0);
                offset_x += img.width();
            }
        }

        // 再处理bottom_image_list（从头部开始，即正序）
        for img in &self.bottom_image_list {
            if self.current_direction == ScrollDirection::Vertical {
                // 垂直拼接
                image::imageops::overlay(&mut final_image, img, 0, offset_y as i64);
                offset_y += img.height();
            } else {
                // 水平拼接
                image::imageops::overlay(&mut final_image, img, offset_x as i64, 0);
                offset_x += img.width();
            }
        }

        Some(final_image)
    }
}
