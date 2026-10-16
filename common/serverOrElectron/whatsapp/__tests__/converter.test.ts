import sharp from "sharp";
import { convertToSticker } from "../converter";
import { validateImagePayload } from "../validator";
import { describe, expect, it } from "@jest/globals";
import { buildStickerExif, injectExifIntoWebp } from "../metadata";

describe("WhatsApp Sticker Converter & Metadata Unit Tests", () => {
  it("should convert a non-square image into a 512x512 transparently padded WebP sticker", async () => {
    const inputBuffer = await sharp({
      create: {
        width: 300,
        height: 150,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const stickerBuffer = await convertToSticker(inputBuffer, {
      isAnimated: false,
      quality: 80,
    });

    expect(Buffer.isBuffer(stickerBuffer)).toBe(true);
    expect(stickerBuffer.length).toBeGreaterThan(0);

    const meta = await sharp(stickerBuffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("should build WhatsApp-compliant Exif chunk containing custom pack and author", () => {
    const exif = buildStickerExif({
      packName: "Utilities Test Pack",
      authorName: "Antigravity",
      emojis: ["🚀", "✨"],
    });

    expect(Buffer.isBuffer(exif)).toBe(true);
    expect(exif.length).toBeGreaterThan(30);

    const exifString = exif.toString("utf-8");
    expect(exifString).toContain("Utilities Test Pack");
    expect(exifString).toContain("Antigravity");
  });

  it("should inject Exif metadata into a RIFF WebP container without corrupting the image", async () => {
    const sampleWebp = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 150, b: 255, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const withExif = await injectExifIntoWebp(sampleWebp, {
      packName: "Injected Pack",
      authorName: "Test Bot",
      emojis: ["🎉"],
    });

    expect(Buffer.isBuffer(withExif)).toBe(true);
    expect(withExif.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(withExif.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(withExif.includes(Buffer.from("EXIF"))).toBe(true);
    expect(withExif.toString("utf-8")).toContain("Injected Pack");

    const parsed = await sharp(withExif).metadata();
    expect(parsed.format).toBe("webp");
    expect(parsed.width).toBe(512);
    expect(parsed.height).toBe(512);
  });

  it("should validate supported image buffers correctly", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await validateImagePayload(pngBuffer);
    expect(result.valid).toBe(true);
    expect(result.isAnimated).toBe(false);
    expect(result.format).toBe("png");
  });
});
