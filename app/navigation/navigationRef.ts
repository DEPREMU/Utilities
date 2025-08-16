import { RootStackParamList } from "./AppNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = (
  name: keyof RootStackParamList,
  params?: undefined,
) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(name, params);
};

export const navigateReplace = (
  name: keyof RootStackParamList,
  params?: undefined,
) => {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name, params }],
  });
};
