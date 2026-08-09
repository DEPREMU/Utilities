import {
  File,
  Cryptos,
  REPLACERS,
  CryptoEvents,
  ThirdPartyStateManager,
} from "@common";
import path from "path";
import { getRoutes } from "@/config";

export const cryptos = new Cryptos(500);
void cryptos.fetchDataBinance(true);

cryptos.addEventListener(CryptoEvents.REFRESH, (refreshing) => {
  if (refreshing) return;

  if (cryptos.prices !== null) ThirdPartyStateManager.setAvailable("cryptos");
  else ThirdPartyStateManager.setUnavailable("cryptos");
});

if (REPLACERS.isDev) {
  void cryptos.addEventListener(CryptoEvents.UPDATE, async (d) => {
    void new File(
      path.join(getRoutes("ROOT"), "dev", "cryptos.json"),
    ).writeFile(JSON.stringify(d), {
      encoding: "utf-8",
    });
  });
}
