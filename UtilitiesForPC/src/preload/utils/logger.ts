import { Helper } from "@common";

export const sendLog = (
  level: "log" | "warn" | "error",
  ...args: unknown[]
): void => {
  void fetch("http://localhost:3005/log", {
    body: JSON.stringify({
      level,
      message: Helper.getMessage(...args),
    }),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
};
