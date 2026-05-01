import { useEffect } from "react";
import { navigation } from "@utils";
import { useUserContext } from "@context/UserContext";

export const useIsLoggedIn = () => {
  const { isLoggedIn, loggingIn } = useUserContext();

  useEffect(() => {
    if (isLoggedIn || loggingIn) return;

    navigation.replace("Home");
  }, [isLoggedIn, loggingIn]);

  return isLoggedIn;
};
