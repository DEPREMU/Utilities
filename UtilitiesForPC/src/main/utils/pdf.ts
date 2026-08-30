import path from "path";
import sharp from "sharp";
import { app } from "electron";
import { Logger } from "./logger";
import PDFDocument from "pdfkit";
import { Directory, File, URI_EXTENSION } from "@common";
import type { PdfCreateRequest, PdfCreateResult } from "@types";

const getFilePathFromUri = (uri: string) => {
  if (!uri) return "";
  if (uri.startsWith(URI_EXTENSION)) return uri.replace(URI_EXTENSION, "");
  if (uri.startsWith(URI_EXTENSION.slice(0, -1)))
    return uri.replace(URI_EXTENSION.slice(0, -1), "");
  return uri;
};

const getPdfFileName = (fileName: string) =>
  fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;

export const createPDFWithImages = async (
  request: PdfCreateRequest,
  onProgress?: (progress: number) => void,
): Promise<PdfCreateResult> => {
  const { images, options } = request;
  const fileName = getPdfFileName(options.filename);

  const outputDir = path.join(app.getPath("temp"), "UtilitiesForPC", "pdf");
  const dir = new Directory(outputDir);
  await dir.mkdir({ recursive: true });
  const outputPath = path.join(outputDir, fileName);

  const maxSizePdfInBytes = options.maxSizePdf * 1024 * 1024 + 1024 * 100;
  let totalSize = 0;

  await Promise.all(
    images.map(async (img) => {
      const imagePath = getFilePathFromUri(img.uri);
      if (!imagePath) return;

      const file = new File(imagePath);
      const stats = await file.stats();
      if (!stats || !(await file.exists())) return;

      totalSize += Number(stats.size);
    }),
  );

  const isLargerThanMaxSize = (multiply?: number) =>
    options.maxSizePdf !== -1 &&
    totalSize > maxSizePdfInBytes * (multiply ?? 1);

  const doc = new PDFDocument({ autoFirstPage: false });
  const writeStream = dir.createStream.write();
  doc.pipe(writeStream);

  let i = 0;
  const len = images.length;

  for (const image of images) {
    try {
      onProgress?.(++i / len);

      const imagePath = getFilePathFromUri(image.uri);
      if (!imagePath) continue;

      const stats = await new File(imagePath).stats();
      const originalSize = Number(stats?.size ?? 0);

      let pageWidth = 0;
      let pageHeight = 0;

      if (options.sizePdf === "CUSTOM") {
        pageWidth = options.customSize.width;
        pageHeight = options.customSize.height;
        doc.addPage({ size: [pageWidth, pageHeight] });
      } else if (options.sizePdf === "GET_FROM_IMAGE") {
        const metadata = await sharp(imagePath).metadata();
        pageWidth = metadata.width ?? 0;
        pageHeight = metadata.height ?? 0;
        if (!pageWidth || !pageHeight) continue;
        doc.addPage({ size: [pageWidth, pageHeight] });
      } else {
        doc.addPage({ size: options.sizePdf as unknown as string });
        pageWidth = doc.page.width;
        pageHeight = doc.page.height;
      }

      if (!pageWidth || !pageHeight) continue;

      let compress = 1;
      if (isLargerThanMaxSize(5)) compress = 0;
      else if (isLargerThanMaxSize(4)) compress = 0.2;
      else if (isLargerThanMaxSize(3)) compress = 0.4;
      else if (isLargerThanMaxSize(2)) compress = 0.6;
      else if (isLargerThanMaxSize()) compress = 0.8;

      const quality = Math.max(1, Math.round(compress * 100));
      const resizedImage = await sharp(imagePath)
        .resize(Math.round(pageWidth), Math.round(pageHeight), {
          fit: "fill",
        })
        .jpeg({ quality })
        .toBuffer();

      totalSize = totalSize - resizedImage.length + originalSize;

      doc.image(resizedImage, 0, 0, {
        width: pageWidth,
        height: pageHeight,
      });
    } catch (error) {
      Logger.error("Error processing image for PDF:", error);
    }
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", (err: Error) => reject(err));
  });

  return {
    uri: `${URI_EXTENSION}${outputPath}`,
    fileName,
  };
};
