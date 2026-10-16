import sharp from "sharp";

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  isAnimated?: boolean;
  format?: string;
  width?: number;
  height?: number;
}

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ANIMATED_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_DIMENSION_PIXELS = 4096;

export const SUPPORTED_IMAGE_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "webp",
  "gif",
] as const;

/**
 * Validates an image buffer or file for size, dimensions, format, and animated frames.
 *
 * @param input - Buffer or file path of the image to validate
 * @param bufferSizeBytes - Optional known size in bytes if passing path
 * @returns Promise resolving to the image validation result
 */
export const validateImagePayload = async (
  input: Buffer | string,
  bufferSizeBytes?: number,
): Promise<ImageValidationResult> => {
  try {
    const size = Buffer.isBuffer(input) ? input.length : (bufferSizeBytes ?? 0);

    const imageInstance = sharp(input, { animated: true });
    const metadata = await imageInstance.metadata();

    if (!metadata.format) {
      return {
        valid: false,
        error: "unsupportedMedia",
      };
    }

    const format = metadata.format.toLowerCase();
    const isSupported = SUPPORTED_IMAGE_FORMATS.includes(
      format as (typeof SUPPORTED_IMAGE_FORMATS)[number],
    );

    if (!isSupported) {
      return {
        valid: false,
        error: "unsupportedMedia",
      };
    }

    const pages = metadata.pages ?? 1;
    const isAnimated = pages > 1 || format === "gif";

    const maxSize = isAnimated ? MAX_ANIMATED_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

    if (size > 0 && size > maxSize) {
      return {
        valid: false,
        error: "sizeExceeded",
        format,
        isAnimated,
      };
    }

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width > MAX_DIMENSION_PIXELS || height > MAX_DIMENSION_PIXELS) {
      return {
        width,
        format,
        height,
        isAnimated,

        valid: false,
        error: "dimensionsExceeded",
      };
    }

    return {
      valid: true,
      isAnimated,
      format,
      width,
      height,
    };
  } catch {
    return {
      valid: false,
      error: "processingError",
    };
  }
};
