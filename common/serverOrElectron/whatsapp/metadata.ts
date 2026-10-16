// @ts-expect-error - node-webpmux is not typed
import webpmux from "node-webpmux";

export interface StickerMetadataOptions {
  packId?: string;
  packName?: string;
  authorName?: string;
  emojis?: string[];
  androidPlayStoreLink?: string;
  iosAppStoreLink?: string;
}

/**
 * Builds a WhatsApp-compliant Exif metadata Buffer for WebP stickers.
 *
 * @param options - Sticker pack name, author, emojis, and store links
 * @returns Buffer containing the formatted Exif chunk
 */
export const buildStickerExif = (
  options: StickerMetadataOptions = {},
): Buffer => {
  const jsonPayload = {
    "sticker-pack-id": options.packId || "",
    "sticker-pack-name": options.packName || "Utilities",
    "sticker-pack-publisher": options.authorName || "Utilities Bot",
    emojis:
      options.emojis && options.emojis.length > 0 ? options.emojis : ["✨"],
    "ios-app-store-link": options.iosAppStoreLink || "",
    "android-app-store-link": options.androidPlayStoreLink || "",
  };

  const jsonBuffer = Buffer.from(JSON.stringify(jsonPayload), "utf-8");
  const jsonLength = jsonBuffer.length;

  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);

  header.writeUInt32LE(jsonLength, 14);

  return Buffer.concat([header, jsonBuffer]);
};

/**
 * Injects a raw Exif chunk or metadata options into a WebP buffer using node-webpmux.
 *
 * @param webpBuffer - Valid WebP image buffer
 * @param metadataOrExif - Valid Exif metadata buffer or StickerMetadataOptions
 * @returns Promise resolving to WebP buffer with embedded Exif chunk
 */
export const injectExifIntoWebp = async (
  webpBuffer: Buffer,
  metadataOrExif: Buffer | StickerMetadataOptions,
): Promise<Buffer> => {
  if (webpBuffer.length < 12) return webpBuffer;

  const exifBuffer = Buffer.isBuffer(metadataOrExif)
    ? metadataOrExif
    : buildStickerExif(metadataOrExif);

  const img = new webpmux.Image();
  await img.load(webpBuffer);
  img.exif = exifBuffer;
  return await img.save(null);
};
