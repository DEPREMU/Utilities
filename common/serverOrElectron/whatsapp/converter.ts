import {
  buildStickerExif,
  injectExifIntoWebp,
  StickerMetadataOptions,
} from "./metadata";
import sharp from "sharp";

export interface StickerConversionOptions extends StickerMetadataOptions {
  quality?: number;
  isAnimated?: boolean;
}

export const TARGET_CANVAS_DIMENSION = 512;
export const DEFAULT_STATIC_QUALITY = 80;
export const DEFAULT_ANIMATED_QUALITY = 55;

/**
 * Converts a static or animated image input into a WhatsApp-compatible 512x512 WebP sticker.
 *
 * @param input - Buffer or filesystem path of the source image or animation
 * @param options - Conversion options including quality, animated flag, pack name, and author
 * @returns Promise resolving to the final WebP sticker buffer with embedded Exif metadata
 */
export const convertToSticker = async (
  input: Buffer | string,
  options: StickerConversionOptions = {},
): Promise<Buffer> => {
  const isAnimated = options.isAnimated ?? false;
  const quality =
    options.quality ??
    (isAnimated ? DEFAULT_ANIMATED_QUALITY : DEFAULT_STATIC_QUALITY);

  const sharpInstance = sharp(input, {
    animated: isAnimated,
  });

  const baseWebpBuffer = await sharpInstance
    .resize(TARGET_CANVAS_DIMENSION, TARGET_CANVAS_DIMENSION, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({
      quality,
      effort: 4,
      loop: 0,
      force: true,
    })
    .toBuffer();

  const exifBuffer = buildStickerExif({
    packName: options.packName,
    authorName: options.authorName,
    emojis: options.emojis,
  });

  return await injectExifIntoWebp(baseWebpBuffer, exifBuffer);
};

export const convertImageToStickerWebp = convertToSticker;
