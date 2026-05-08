import type RNPDF from "react-native-pdf";
import type PDFDocType from "pdf-lib";
import type { PdfCreateOptions, PdfCreateResult, PdfImageInput } from "@types";

export type PlatformData = {
  version: string;
  isElectron: boolean;
  hasBattery: boolean;
};

export declare const DATA_PLATFORM: PlatformData;

/**
 * @platform `native`
 */
export type DeleteDirectoryPickerFolder = () => void;

/**
 * @platform `native`
 */
export declare const deleteDirectoryPickerFolder: DeleteDirectoryPickerFolder;

/**
 * @platform `native`
 */
export type DeleteDirectoryImageManipulatorFolder = () => void;

export declare const deleteDirectoryImageManipulatorFolder: DeleteDirectoryImageManipulatorFolder;

export declare const PDF: typeof RNPDF;

export type GetRandomUUID = () => string;

export declare const getRandomUUID: GetRandomUUID;

export declare const PDFDoc: typeof PDFDocType;

export type CreatePdfFromImages = (
  images: PdfImageInput[],
  options: PdfCreateOptions,
  onProgress?: (progress: number) => void,
) => Promise<
  (PdfCreateResult & { cleanup: () => Promise<void> | void }) | null
>;

export declare const createPdfFromImages: CreatePdfFromImages;

type PdfCreateResultWithCleanup = PdfCreateResult & {
  cleanup?: () => Promise<void> | void;
};

export type CreatePdfFromImages = (
  images: PdfImageInput[],
  options: PdfCreateOptions,
  onProgress?: (progress: number) => void,
) => Promise<PdfCreateResultWithCleanup | null>;

export declare const createPDFFromImages: CreatePdfFromImages;

export declare const ready: () => Promise<void>;
