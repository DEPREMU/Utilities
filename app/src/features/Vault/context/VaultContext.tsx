import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import {
  VaultData,
  VaultFunctions,
  FilesSelected,
  VaultDomainState,
  DEFAULT_VAULT_DATA,
  vaultDomainServiceManager,
} from "@screens/Vault/services/vaultDomain";
import { ActivityIndicator } from "react-native-paper";
import { vaultServiceManager } from "@screens/Vault/services/vault";
import { deviceInfo, EventsDeviceInfo } from "@utils";
import { PickedFile, FolderFiles, VaultSettings } from "@types";

export type StatesObj = {
  data: VaultData | null;
  files: PickedFile[];
  service: ReturnType<typeof vaultServiceManager.getService>;
  folders: Record<string, FolderFiles | "locked">;
  settings: VaultSettings;
  filesSelected: FilesSelected;
  currentFolderId: string;
  filesUploading: Record<string, number>;
};

type VaultContextProps = {
  data: StatesObj["data"];
  files: StatesObj["files"];
  folders: StatesObj["folders"];
  functionsRef: React.RefObject<VaultFunctions>;
  statesRef: React.RefObject<StatesObj>;
  currentFolderId: StatesObj["currentFolderId"];
  setCurrentFolderId: React.Dispatch<
    React.SetStateAction<StatesObj["currentFolderId"]>
  >;
  settings: StatesObj["settings"];
  setSettings: React.Dispatch<React.SetStateAction<StatesObj["settings"]>>;
  filesSelected: StatesObj["filesSelected"];
  filesUploading: StatesObj["filesUploading"];
  setFilesSelected: React.Dispatch<
    React.SetStateAction<StatesObj["filesSelected"]>
  >;
};

const VaultContext = createContext<VaultContextProps | undefined>(undefined);

export { DEFAULT_VAULT_DATA };

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const service = useMemo(() => vaultDomainServiceManager.getService(), []);
  const [vaultState, setVaultState] = useState<VaultDomainState>(
    service.getState(),
  );

  const functionsRef = useRef<VaultFunctions>(service.getFunctions());

  const statesRef = useRef<StatesObj>({
    ...vaultState,
    service: vaultServiceManager.getService(),
  });

  statesRef.current = {
    ...vaultState,
    service: statesRef.current.service,
  };

  const setCurrentFolderId = useCallback<
    React.Dispatch<React.SetStateAction<StatesObj["currentFolderId"]>>
  >(
    (value) => {
      service.setCurrentFolderId(value);
    },
    [service],
  );

  const setSettings = useCallback<
    React.Dispatch<React.SetStateAction<StatesObj["settings"]>>
  >(
    (value) => {
      service.setSettings(value);
    },
    [service],
  );

  const setFilesSelected = useCallback<
    React.Dispatch<React.SetStateAction<StatesObj["filesSelected"]>>
  >(
    (value) => {
      service.setFilesSelected(value);
    },
    [service],
  );

  useEffect(() => {
    const unsubscribe = service.subscribe((nextState) => {
      setVaultState(nextState);
    });

    const removeListenerAppState = deviceInfo.addEventListener(
      EventsDeviceInfo.appStateChange,
      (newState) => {
        if (newState !== "active") {
          functionsRef.current.lock();
        }
      },
    );

    const removeListenerScreen = deviceInfo.addEventListener(
      EventsDeviceInfo.screenChange,
      (screenName) => {
        if (screenName !== "Vault") {
          functionsRef.current.lock();
        }
      },
    );

    void service.initialize().finally(() => {
      setLoading(false);
    });

    return () => {
      unsubscribe();
      removeListenerScreen();
      removeListenerAppState();
      vaultDomainServiceManager.cleanUp();
    };
  }, [service]);

  const value: VaultContextProps = useMemo(
    () => ({
      data: vaultState.data,
      files: vaultState.files,
      folders: vaultState.folders,
      settings: vaultState.settings,
      functionsRef,
      statesRef,
      filesSelected: vaultState.filesSelected,
      filesUploading: vaultState.filesUploading,
      currentFolderId: vaultState.currentFolderId,
      setFilesSelected,
      setSettings,
      setCurrentFolderId,
    }),
    [
      vaultState,
      setFilesSelected,
      setSettings,
      setCurrentFolderId,
      statesRef,
      functionsRef,
    ],
  );

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
};

export const useVault = (): VaultContextProps => {
  const context = useContext(VaultContext);

  if (!context) throw new Error("useVault must be used within a VaultProvider");

  return context;
};
