import { v4 } from "uuid";
import windowModule from "../modules/WindowModule";
import type PDFDocType from "pdf-lib";
import { PlatformData } from "./platform";
import type { PdfProps } from "react-native-pdf";
import { useResponsiveLayout } from "@context/LayoutContext";
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
  PageSizes: {} as typeof PDFDocType.PageSizes,
};

export const RNFSModule = null;

export { DATA_PLATFORM };
