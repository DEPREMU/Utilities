export type Colors =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "text"
  | "border"
  | "error"
  | "warning"
  | "success"
  | "info"
  | "overlay"
  | "shadow";

export const colors: Record<"dark" | "light", Record<Colors, string>> = {
  light: {
    primary: "#d49eff", // buttons / elementos principales
    secondary: "#ff9cf2", // inputs / elementos secundarios
    accent: "#ffafdb", // resaltados / detalles
    background: "#ffcccc", // fondo principal
    text: "#ffe3c0", // texto
    border: "#d49eff", // bordes
    error: "#e95858ff", // errores
    warning: "#ffafdb", // advertencias
    success: "#ffcccc", // confirmaciones
    info: "#ffe3c0", // info sutil
    overlay: "rgba(0, 0, 0, 0.5)", // overlays
    shadow: "#000000", // sombras
  },
  dark: {
    background: "#2d2f51", // fondo principal
    secondary: "#51416c", // inputs / secundarios
    accent: "#875a91", // resaltados
    primary: "#d47dbd", // botones / elementos principales
    text: "#ffaaed", // texto
    border: "#2d2f51", // bordes
    error: "#a13232ff", // errores
    warning: "#875a91", // advertencias
    success: "#d47dbd", // confirmaciones
    info: "#ffaaed", // info sutil
    overlay: "rgba(255, 255, 255, 0.3)", // overlays
    shadow: "#ffffff", // sombras claras
  },
} as const;
