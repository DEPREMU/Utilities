import dataApp from "./utils/vars/variables.ts";

dataApp.waitUntilInitialized().then(async () => {
  try {
    const { nativeData } = await import("@/utils/nativeData/index.ts");

    await nativeData.waitUntilInitialized();

    import("./app.ts");
  } catch (error) {
    try {
      import("@/utils/logger.ts").then(({ Logger }) => {
        new Logger("MAIN").error("Error importing app module:", error);
      });
    } catch {
      // Ignore error
    }
  }
});
