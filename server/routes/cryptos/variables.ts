import path from "path";
import { getRoutes } from "@/config";
import { Cryptos, CryptoEvents, File, REPLACERS } from "@common";

export const cryptos = new Cryptos(500);
void cryptos.fetchDataBinance(true);

if (REPLACERS.isDev) {
  void cryptos.addEventListener(CryptoEvents.UPDATE, async (d) => {
    void new File(
      path.join(getRoutes("ROOT"), "dev", "cryptos.json"),
    ).writeFile(JSON.stringify(d), {
      encoding: "utf-8",
    });
  });
}
