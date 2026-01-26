import * as pdfjs from "pdfjs-dist";
import { memoDeep } from "../functions";
import windowModule from "../modules/WindowModule";
import { PlatformData } from "./platform";
import type { PdfProps } from "react-native-pdf";
import React, { useEffect, useRef } from "react";

const DATA_PLATFORM: PlatformData = {
  isElectron: false,
  hasBattery: false,
  version: "",
};

windowModule.isElectronBuild().then((result) => {
  DATA_PLATFORM.isElectron = result;
});
windowModule.getNativeData("hasBattery").then((result) => {
  if (result === "unknown") return;

  DATA_PLATFORM.hasBattery = result as boolean;
});
windowModule.getNativeData("version").then((result) => {
  DATA_PLATFORM.version = result as string;
});

export { DATA_PLATFORM };

export const PDF: React.FC<PdfProps> = memoDeep(({ source }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uri = typeof source === "number" ? "" : source.uri || "";
    if (!uri) return;

    const renderPDF = async () => {
      const pdf = await pdfjs.getDocument(uri).promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        canvas.style.marginBottom = "16px";

        containerRef.current?.appendChild(canvas);

        await page.render({
          canvas,
          viewport,
          canvasContext,
        }).promise;
      }
    };

    renderPDF();
  }, [source]);

  return <div ref={containerRef} />;
});
