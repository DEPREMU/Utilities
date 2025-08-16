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
  | "teal"
  | "lightTeal"
  | "mediumTeal"
  | "darkTeal"
  | "lightBlue"
  | "lightGray"
  | "mediumGray"
  | "darkGray"
  | "white"
  | "black"
  | "red"
  | "lightRed"
  | "transparent";

export const colors: Record<Colors, string> = {
  // Original colors
  primary: "#3498DB",
  secondary: "#2ecc71",
  accent: "#e74c3c",
  background: "#ecf0f1",
  text: "#2c3e50",
  border: "#bdc3c7",
  error: "#e74c3c",
  warning: "#f39c12",
  success: "#2ecc71",
  info: "#3498db",

  // App-specific colors
  teal: "#00a69d", // Primary teal color
  lightTeal: "#7cced4", // Light teal variant
  mediumTeal: "#60c4b4", // Medium teal variant
  darkTeal: "#21aae1", // Dark teal variant
  lightBlue: "#21aae1", // Light blue
  lightGray: "#ecebea", // Light gray background
  mediumGray: "#666", // Medium gray text
  darkGray: "#333", // Dark gray text
  white: "#fff", // White
  black: "black", // Black
  red: "#d93025", // Error red
  lightRed: "#fce8e6", // Light red background
  transparent: "transparent", // Transparent
};
