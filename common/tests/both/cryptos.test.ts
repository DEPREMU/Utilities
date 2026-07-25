import { Cryptos } from "../../both/cryptos";
import { describe, expect, it } from "@jest/globals";

describe("Cryptos", () => {
  it("should fetch prices from Binance API", async () => {
    const cryptos = new Cryptos(5000);
    const prices = await cryptos.fetchDataBinance(true);
    expect(prices).toBeInstanceOf(Array);

    cryptos.destroy();
  });

  it("should get crypto by symbol", async () => {
    const cryptos = new Cryptos(5000);
    await cryptos.fetchDataBinance(true);
    const btcPrice = cryptos.getCryptoBySymbol("BTCUSDT");
    expect(btcPrice).toBeDefined();
    expect(btcPrice?.symbol).toBe("BTCUSDT");

    cryptos.destroy();
  });

  it("should get crypto by base and quote", async () => {
    const cryptos = new Cryptos(5000);
    await cryptos.fetchDataBinance(true);
    const btcPrice = cryptos.getCryptoByBase("BTC", "USDT");
    expect(btcPrice).toBeDefined();
    expect(btcPrice?.baseCoin).toBe("BTC");
    expect(btcPrice?.quoteCoin).toBe("USDT");

    cryptos.destroy();
  });

  it("should return null for non-existing crypto by symbol", async () => {
    const cryptos = new Cryptos(5000);
    await cryptos.fetchDataBinance(true);
    const nonExistingCrypto = cryptos.getCryptoBySymbol("NONEXISTENT");
    expect(nonExistingCrypto).toBeNull();

    cryptos.destroy();
  });

  it("should return null for non-existing crypto by base and quote", async () => {
    const cryptos = new Cryptos(5000);
    await cryptos.fetchDataBinance(true);
    const nonExistingCrypto = cryptos.getCryptoByBase("NONEXISTENT", "USDT");
    expect(nonExistingCrypto).toBeNull();

    cryptos.destroy();
  });

  it("should start auto update and fetch data", async () => {
    const cryptos = new Cryptos(1000);
    cryptos.startAutoUpdate(1000);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const prices = await cryptos.fetchDataBinance();
    expect(prices).toBeInstanceOf(Array);
    cryptos.stopAutoUpdate();

    cryptos.destroy();
  });

  it("should handle errors gracefully when fetching data", async () => {
    const cryptos = new Cryptos(5000);

    // Simulate an error by overriding the fetchDataBinance method
    (cryptos as unknown as Record<string, unknown>).fetchDataBinance =
      async () => {
        throw new Error("Simulated fetch error");
      };

    await expect(cryptos.fetchDataBinance()).rejects.toThrow(
      "Simulated fetch error",
    );

    cryptos.destroy();
  });
});
