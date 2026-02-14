import { AppStateStatus } from "react-native";
import { ScreensAvailable } from "@types";

export const functionsToExecute: {
  current: {
    "AppState-change": {
      [key: string]: (nextState: AppStateStatus) => void | Promise<void>;
    };
    "Screen-change": {
      [key: string]: (newScreen: ScreensAvailable) => void | Promise<void>;
    };
  };
} = {
  current: {
    "AppState-change": {},
    "Screen-change": {},
  },
};

export * from "./platform";
