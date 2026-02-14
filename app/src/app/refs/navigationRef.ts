import { ScreensAvailable } from "@types";
import { RootStackParamList } from "../AppNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = (
  name: keyof RootStackParamList,
  params?: undefined,
) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(name, params);
};

export const navigateReplace = async (
  name: keyof RootStackParamList,
  params?: object,
) => {
  let attempts = 0;
  while (true) {
    attempts++;
    if (navigationRef.isReady() || attempts > 100) break;
    await new Promise((resolve) => {
      import("@utils").then(({ setTimeoutPolyfill }) =>
        setTimeoutPolyfill(resolve, 50),
      );
    });
  }

  navigationRef.reset({
    index: 0,
    routes: [{ name, params }],
  });
};

export const getCurrentScreen = async (): Promise<ScreensAvailable> => {
  let attempts = 0;
  while (true) {
    if (navigationRef.isReady() || attempts > 100) break;
    attempts++;
    await new Promise((resolve) => {
      import("@utils").then(({ setTimeoutPolyfill }) =>
        setTimeoutPolyfill(resolve, 50),
      );
    });
  }
  return navigationRef.getCurrentRoute()?.name ?? "Home";
};
