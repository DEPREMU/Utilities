import { cloneDeep } from "lodash";
import { PERMISSIONS, PermissionsData } from "@common";

const defaultData = {
  enabled: false,
  lastAsked: null,
  doNotAskAgain: false,
};

const defaultPermissionsData: PermissionsData = PERMISSIONS.reduce(
  (acc, permission) => {
    acc[permission] = { ...defaultData };
    return acc;
  },
  {} as PermissionsData,
);

export type PermissionsDataState = {
  existsAlert: boolean;
  initialized: boolean;
  permissions: PermissionsData;
  initializing: null | Promise<void>;
  hasOverlayPermission: boolean;
};

export const permissionsData: PermissionsDataState = {
  existsAlert: false,
  initialized: false,
  permissions: defaultPermissionsData,
  initializing: null,
  hasOverlayPermission: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureDataIntegrity = (data: any): PermissionsData => {
  const result: PermissionsData = {} as PermissionsData;
  let allKeysValid = true;

  for (const permission of PERMISSIONS) {
    if (data[permission]) {
      result[permission] = {
        enabled: Boolean(data[permission].enabled),
        lastAsked:
          typeof data[permission].lastAsked === "number"
            ? data[permission].lastAsked
            : null,
        doNotAskAgain: Boolean(data[permission].doNotAskAgain),
      };
    } else {
      result[permission] = cloneDeep(defaultData);
      allKeysValid = false;
    }
  }

  if (!allKeysValid) {
    import("@utils").then(({ logger, storageManagement }) => {
      logger.warn(
        "PERMISSIONS",
        "Data integrity issues found in permissions data. Resetting to default values.",
      );
      storageManagement.save("PERMISSIONS_DATA", result);
    });
  }
  return result;
};

export const initPermissionsData = async () => {
  if (permissionsData.initialized) return;
  if (permissionsData.initializing) return permissionsData.initializing;

  const { storageManagement, logger } = await import("@utils");
  const { NativeFunctionsModule } = await import("@modules");

  try {
    await storageManagement.waitUntilLoaded();
    const storedData = storageManagement.get("PERMISSIONS_DATA");
    if (!storedData) {
      storageManagement.save("PERMISSIONS_DATA", permissionsData.permissions);
    } else {
      permissionsData.permissions = ensureDataIntegrity(storedData);
    }

    permissionsData.hasOverlayPermission =
      await NativeFunctionsModule.checkOverlayPermission();
  } catch (error) {
    logger.error(
      "PERMISSIONS",
      "Failed to initialize permissions data",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    permissionsData.initialized = true;
    permissionsData.initializing = null;
  }
};
permissionsData.initializing = initPermissionsData();
