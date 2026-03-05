import { ScreensAvailable } from "@types";
import { RootStackParamList } from "../AppNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const waitForNavigationReady = async () => {
  if (navigationRef.isReady()) return;

  let attempts = 0;
  const { waitForTime } = await import("@utils");
  while (!navigationRef.isReady() && attempts <= 100) {
    attempts++;
    await waitForTime(50);
  }
};

export const navigate = async (
  name: keyof RootStackParamList,
  params?: object,
) => {
  await waitForNavigationReady();
  navigationRef.navigate(...([name, params] as never));
};

export const navigateReplace = async (
  name: keyof RootStackParamList,
  params?: object,
) => {
  await waitForNavigationReady();

  navigationRef.reset({
    index: 0,
    routes: [{ name, params }],
  });
};

export const getCurrentScreen = async (): Promise<ScreensAvailable> => {
  await waitForNavigationReady();

  return navigationRef.getCurrentRoute()?.name ?? "Home";
};
