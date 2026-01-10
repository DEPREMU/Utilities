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
    primary: "#7c3aed",
    secondary: "#f5f3ff",
    accent: "#a855f7",
    background: "#f8fafc",
    text: "#0f172a",
    border: "#e2e8f0",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#0ea5e9",
    overlay: "rgba(0, 0, 0, 0.45)",
    shadow: "#000000",
  },
  dark: {
    background: "#0f172a",
    secondary: "#111827",
    accent: "#1e293b",
    primary: "#a855f7",
    text: "#e2e8f0",
    border: "#1f2937",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#34d399",
    info: "#38bdf8",
    overlay: "rgba(0, 0, 0, 0.6)",
    shadow: "#000000",
  },
} as const;
