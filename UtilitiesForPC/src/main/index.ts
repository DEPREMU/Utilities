import dataApp from "@/utils/vars/variables";

await dataApp.waitUntilInitialized();
try {
  const { nativeData } = await import("@/utils/nativeData");

  await nativeData.waitUntilInitialized();

  await import("./app");
} catch (error) {
  import("@/utils/logger")
    .then(({ Logger }) => {
      new Logger("MAIN").error("Error importing app module:", error);
    })
    .catch(() => {});
}
