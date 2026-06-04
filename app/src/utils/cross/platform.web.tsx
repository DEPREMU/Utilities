import { v4 } from "uuid";
import { Timers } from "@common";
import { windowModule } from "@modules";
import type { PdfProps } from "react-native-pdf";
import { useResponsiveLayout } from "@context/LayoutContext";
import React, { useEffect, useRef } from "react";
import { CreatePdfFromImages, PlatformData } from "./platform";

const PDF_PAGE_SIZES = {
  "4A0": [4767.87, 6740.79],
  "2A0": [3370.39, 4767.87],
  A0: [2383.94, 3370.39],
  A1: [1683.78, 2383.94],
  A2: [1190.55, 1683.78],
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  A7: [209.76, 297.64],
  A8: [147.4, 209.76],
  A9: [104.88, 147.4],
  A10: [73.7, 104.88],
  B0: [2834.65, 4008.19],
  B1: [2004.09, 2834.65],
  B2: [1417.32, 2004.09],
  B3: [1000.63, 1417.32],
  B4: [708.66, 1000.63],
  B5: [498.9, 708.66],
  B6: [354.33, 498.9],
  B7: [249.45, 354.33],
  B8: [175.75, 249.45],
  B9: [124.72, 175.75],
  B10: [87.87, 124.72],
  C0: [2599.37, 3676.54],
  C1: [1836.85, 2599.37],
  C2: [1298.27, 1836.85],
  C3: [918.43, 1298.27],
  C4: [649.13, 918.43],
  C5: [459.21, 649.13],
  C6: [323.15, 459.21],
  C7: [229.61, 323.15],
  C8: [161.57, 229.61],
  C9: [113.39, 161.57],
  C10: [79.37, 113.39],
  RA0: [2437.8, 3458.27],
  RA1: [1729.13, 2437.8],
  RA2: [1218.9, 1729.13],
  RA3: [864.57, 1218.9],
  RA4: [609.45, 864.57],
  SRA0: [2551.18, 3628.35],
  SRA1: [1814.17, 2551.18],
  SRA2: [1275.59, 1814.17],
  SRA3: [907.09, 1275.59],
  SRA4: [637.8, 907.09],
  Executive: [521.86, 756],
  Folio: [612, 936],
  Legal: [612, 1008],
  Letter: [612, 792],
  Tabloid: [792, 1224],
} as const;

let i = 0;
export const ready = async () => {
  while (i < 3) await Timers.sleep(100);
};

const DATA_PLATFORM: PlatformData = {
  isElectron: false,
  hasBattery: false,
  version: "",
};

windowModule.isElectronBuild().then((result) => {
  i++;
  DATA_PLATFORM.isElectron = result;
});
windowModule.getNativeData("hasBattery").then((result) => {
  i++;
  if (result === "unknown") return;

  DATA_PLATFORM.hasBattery = result as boolean;
});
windowModule.getNativeData("version").then((result) => {
  i++;
  DATA_PLATFORM.version = result as string;
});

export const PDF: React.FC<PdfProps> = ({ source }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { height } = useResponsiveLayout();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    let uri: string;
    let heightPX = "400px";
    if (typeof source === "string") uri = source;
    else if (typeof source === "object" && source.uri) uri = source.uri;
    else {
      import("../functions/debug").then(({ logger }) => {
        logger.error("PDF_RENDER_WEB", "Invalid PDF source:", source);
      });
      return;
    }
    if (height) heightPX = `${height - 200}px`;

    const iframe = document.createElement("iframe");
    iframe.src = uri;
    iframe.width = "100%";
    iframe.height = heightPX;
    iframe.style.border = "none";

    container.appendChild(iframe);

    return () => {
      container.innerHTML = "";
    };
  }, [source, height]);

  return <div ref={containerRef} />;
};

export const getRandomUUID = () => v4();

export const PDFDoc = {
  PageSizes: PDF_PAGE_SIZES,
};

export { DATA_PLATFORM };

export const createPdfFromImages: CreatePdfFromImages = async (
  images,
  options,
  onProgress?,
) => {
  const result = await windowModule.createPdf({ images, options }, onProgress);
  if (!result) return null;

  return {
    ...result,
    cleanup: async () => {
      await windowModule.removeFile(result.uri);
    },
  };
};
