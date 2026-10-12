import NetInfo from "@react-native-community/netinfo";
import { REPLACERS, Network } from "@common";

NetInfo.configure({
  reachabilityUrl: Network.URL_GOOGLE_204,
  useNativeReachability: REPLACERS.isNative,
  //? Handled by deviceInfo service
  reachabilityShouldRun: () => false,
});

if (REPLACERS.isNative) import("./global.native");
else if (REPLACERS.isWeb)
  import("../modules/WindowModule").then(({ windowModule }) => {
    (Network as { isOnline: () => Promise<boolean> }).isOnline =
      windowModule.network.hasInternetConnection;
  });
