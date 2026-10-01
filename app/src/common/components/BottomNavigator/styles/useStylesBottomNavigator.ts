import { useAppBehavior } from "@context/AppBehaviorContext";

export const useStylesBottomNavigator = () => {
  const { colors } = useAppBehavior();

  return { colors };
};
