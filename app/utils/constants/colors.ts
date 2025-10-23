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
    primary: "#d49eff", // buttons / main elements
    secondary: "#ff9cf2", // inputs / secondary elements
    accent: "#ffafdb", // highlights / details
    background: "#ffcccc", // main background
    text: "#ffe3c0", // text
    border: "#d49eff", // borders
    error: "#e95858ff", // errors
    warning: "#ffafdb", // warnings
    success: "#ffcccc", // confirmations
    info: "#ffe3c0", // subtle info
    overlay: "rgba(0, 0, 0, 0.5)", // overlays
    shadow: "#000000", // shadows
  },
  dark: {
    background: "#2d2f51", // main background
    secondary: "#51416c", // inputs / secondary
    accent: "#875a91", // highlights
    primary: "#d47dbd", // buttons / main elements
    text: "#ffaaed", // text
    border: "#2d2f51", // borders
    error: "#a13232ff", // errors
    warning: "#875a91", // warnings
    success: "#d47dbd", // confirmations
    info: "#ffaaed", // subtle info
    overlay: "rgba(255, 255, 255, 0.3)", // overlays
    shadow: "#ffffff", // light shadows
  },
} as const;
