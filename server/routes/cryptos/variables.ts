import path from "path";
import { REPLACERS, serverPath } from "@/config.ts";
import { Cryptos, CryptoEvents, File } from "@common";

export const CRYPTOS_FILE_PATH = path.join(serverPath, "dev", "cryptos.json");

export const cryptos = new Cryptos(500);
void cryptos.fetchDataBinance(true);

if (REPLACERS.isDev) {
  void cryptos.addEventListener(CryptoEvents.UPDATE, async (d) => {
    void new File(CRYPTOS_FILE_PATH).writeFile(JSON.stringify(d), {
      encoding: "utf-8",
    });
  });
}
