import {
  convertToSticker,
  StickerConversionOptions,
} from "@commonSrc/serverOrElectron/whatsapp/converter";
import { validateImagePayload } from "@commonSrc/serverOrElectron/whatsapp/validator";

export interface LocalStickerProcessResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

/**
 * Validates and converts an image or animation buffer into a WebP sticker locally.
 *
 * @param inputBuffer - Raw media Buffer downloaded from WhatsApp
 * @param options - Customization options (packName, author, emojis, quality)
 * @returns Promise resolving to conversion success status and rendered buffer
 */
export const processLocalSticker = async (
  inputBuffer: Buffer,
  options?: StickerConversionOptions,
): Promise<LocalStickerProcessResult> => {
  const validation = await validateImagePayload(inputBuffer);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "unsupportedMedia",
    };
  }

  try {
    const stickerBuffer = await convertToSticker(inputBuffer, {
      ...options,
      isAnimated: validation.isAnimated,
    });

    return {
      success: true,
      buffer: stickerBuffer,
    };
  } catch {
    return {
      success: false,
      error: "processingError",
    };
  }
};
