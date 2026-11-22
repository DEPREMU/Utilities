/* eslint-disable @typescript-eslint/no-require-imports */
import NetInfo from "@react-native-community/netinfo";
import { REPLACERS, Network } from "@common";

NetInfo.configure({
  reachabilityUrl: Network.URL_GOOGLE_204,
  useNativeReachability: REPLACERS.isNative,
  //? Handled by deviceInfo service
  reachabilityShouldRun: () => false,
});

if (REPLACERS.isNative) require("./global.native");
else if (REPLACERS.isWeb) {
  const { windowModule } =
    require("../modules/WindowModule") as typeof import("../modules/WindowModule");
  (Network as { isOnline: () => Promise<boolean> }).isOnline =
    windowModule.network.hasInternetConnection;
}
