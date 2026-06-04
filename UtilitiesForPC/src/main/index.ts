import dataApp from "./utils/variables.ts";

dataApp.waitUntilInitialized().then(async () => {
  try {
    const { nativeData } = await import("@/utils/nativeData/index.ts");

    await nativeData.waitUntilInitialized();

    import("./app.ts");
  } catch (error) {
    try {
      import("@/utils/logger.ts").then(({ Logger }) => {
        Logger.error("Error importing app module:", error);
      });
    } catch {
      // Ignore error
    }
  }
});
