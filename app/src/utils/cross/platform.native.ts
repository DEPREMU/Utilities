import PDF from "react-native-pdf";
import { Image } from "react-native";
import * as PDFLib from "pdf-lib";
import { randomUUID } from "react-native-quick-crypto";
import { Directories } from "./Directories";
import * as ExpoFileSystem from "expo-file-system";
import { ImageManipulator } from "expo-image-manipulator";
import { REPLACERS, Timers } from "@common";
import { CreatePdfFromImages, PlatformData } from "./platform";

export const ready = async () => {};

export const DATA_PLATFORM: PlatformData = {
  version: "",
  hasBattery: true,
  isElectron: false,
};

export const deleteDirectoryPickerFolder = () => {
  Timers.setTimeout(() => {
    try {
      new ExpoFileSystem.Directory(
        ExpoFileSystem.Paths.cache,
        Directories.DIRECTORY_PICKER,
      ).delete();
    } catch {
      // Ignore errors
    }
  }, 1000);
};

export const deleteDirectoryImageManipulatorFolder = () => {
  Timers.setTimeout(() => {
    try {
      new ExpoFileSystem.Directory(
        ExpoFileSystem.Paths.cache,
        Directories.IMAGE_MANIPULATOR,
      ).delete();
    } catch {
      // Ignore errors
    }
  }, 1000);
};

export { PDF };

export const getRandomUUID = () => randomUUID();

export const PDFDoc = PDFLib;

export const createPdfFromImages: CreatePdfFromImages = async (
  images,
  options,
  onProgress?,
) => {
  if (!images.length) return null;

  const { sizePdf, customSize, maxSizePdf, filename } = options;

  const maxSizePdfInBytes = maxSizePdf * 1024 * 1024 + 1024 * 100;
  let totalSize = images.reduce(
    (acc, img) => acc + new ExpoFileSystem.File(img.uri).size,
    0,
  );

  const doc = await PDFDoc.PDFDocument.create();
  let size: [number, number] = [0, 0];

  if (sizePdf === "CUSTOM") size = [customSize.width, customSize.height];
  else if (sizePdf !== "GET_FROM_IMAGE")
    size = PDFDoc.PageSizes[sizePdf as keyof typeof PDFDoc.PageSizes];

  const isLargerThanMaxSize = (multiply?: number) =>
    maxSizePdf !== -1 && totalSize > maxSizePdfInBytes * (multiply ?? 1);

  let i = 0;
  const len = images.length;

  for (const img of images) {
    try {
      if (onProgress) onProgress(++i / len);

      if (!img.uri) continue;
      const image = new ExpoFileSystem.File(img.uri);

      let compress = 1;
      if (isLargerThanMaxSize(5)) compress = 0;
      else if (isLargerThanMaxSize(4)) compress = 0.2;
      else if (isLargerThanMaxSize(3)) compress = 0.4;
      else if (isLargerThanMaxSize(2)) compress = 0.6;
      else if (isLargerThanMaxSize()) compress = 0.8;

      const manipulatedImage = ImageManipulator.manipulate(img.uri);
      if (size[0] <= 0 || size[1] <= 0) {
        const dimensions = await Image.getSize(img.uri);
        size = [dimensions.width, dimensions.height];
      }
      manipulatedImage.resize({
        width: size[0],
        height: size[1],
      });

      const newImage = await manipulatedImage.renderAsync();
      const savedImage = await newImage.saveAsync({
        compress,
      });
      const uri = savedImage.uri;
      const newFile = new ExpoFileSystem.File(uri);
      totalSize = totalSize - newFile.size + image.size;

      const newPage = doc.addPage(size);
      const imagePdf = await doc.embedJpg(await newFile.bytes());
      newPage.drawImage(imagePdf);
    } catch (error) {
      REPLACERS.Logger.error("PDF", "error processing image for PDF", error);
    }
  }

  const pdfBytes = await doc.save();
  const fileName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const file = new ExpoFileSystem.File(ExpoFileSystem.Paths.cache, fileName);
  file.write(pdfBytes);

  return {
    uri: file.uri,
    fileName,
    cleanup: async () => {
      deleteDirectoryPickerFolder();
      deleteDirectoryImageManipulatorFolder();
      file.delete();
    },
  };
};
