export const fileCalled = process.argv[1].split("/").pop();

export const isUpdate = fileCalled?.includes("update");
export const isAppLint = fileCalled?.includes("app-lint");
export const isAppStart = fileCalled?.includes("app-start");
export const isBuildWeb = fileCalled?.includes("build-web");
export const isBuildAndroid = fileCalled?.includes("build-android");
export const isUploadElectron = fileCalled?.includes("build-upload-electron");
export const isBuildUploadAndroid = fileCalled?.includes(
  "build-upload-android",
);
export const isBuildAppElectron = fileCalled?.includes("build-app-electron");
export const isBuildResourcesElectron = fileCalled?.includes(
  "build-resources-electron",
);
export const isAppBuildDev = fileCalled?.includes("app-build-dev");
export const isAndroidPrebuild = fileCalled?.includes("app-prebuild");
