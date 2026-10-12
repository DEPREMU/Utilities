import { Logger } from "../TOP_LEVEL";
import { PdfProps } from "react-native-pdf";
import { useResponsiveLayout } from "@context/LayoutContext";
import React, { useEffect, useRef } from "react";

const logger = new Logger("PDF.web");

const PDF: React.FC<PdfProps> = ({ source }) => {
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
      logger.error("PDF_RENDER_WEB", "Invalid PDF source:", source);
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

export default PDF;
