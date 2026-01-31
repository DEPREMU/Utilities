import { ScreensAvailable } from "@types";
import { AppStateStatus } from "react-native";

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
