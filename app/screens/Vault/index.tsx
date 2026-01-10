import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Divider,
  IconButton,
  List,
  ProgressBar,
  Text,
  TextInput,
} from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useLanguage } from "@context/LanguageContext";
import useStylesVaultScreen from "@styles/screens/useStylesVaultScreen";
import windowModule from "@/utils/modules/WindowModule";
import VaultCryptoModule, {
  onVaultProgress as onVaultProgressAndroid,
} from "@/utils/modules/VaultCryptoModule";
import { getRandomId, isFalsy, logError } from "@utils";
import { loadDataStorage, saveDataStorage } from "@utils";
import type { ProgressEvent, VaultFolder, VaultIndex, VaultItem } from "@types";

const getDefaultSettings = () => ({
  authMethod: "password" as const,
  autoLockSeconds: 60,
  failedAttemptsLimit: 5,
  cooldownSeconds: 60,
  integrityCheckOnImport: true,
  integrityCheckOnAccess: true,
  compressionThresholdBytes: 100 * 1024 * 1024,
  autoCompressLargeFiles: true,
  incognitoModeEnabled: false,
  secretModeEnabled: false,
  backupPolicy: {
    allowExport: true,
    allowSameKeyExport: true,
    requireLongPasswordForReencrypt: true,
  },
});

const makeDefaultFolder = (keyId: string): VaultFolder => {
  const now = new Date().toISOString();
  return {
    id: "default",
    displayName: "Default",
    createdAt: now,
    encryptionPolicy: "inheritMaster",
    keyId,
    flags: {
      readOnly: false,
      secretHidden: false,
    },
    accessTTLSeconds: 60,
  };
};

const makeEmptyIndex = (keyId: string): VaultIndex => {
  const folder = makeDefaultFolder(keyId);
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    foldersById: { [folder.id]: folder },
    itemsByFolderId: { [folder.id]: [] },
  };
};

const getExtension = (name: string) => {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
};

const normalizeFileUri = (absolutePathOrUri: string): string => {
  if (absolutePathOrUri.startsWith("file://")) return absolutePathOrUri;
  if (absolutePathOrUri.startsWith("content://")) return absolutePathOrUri;
  return `file://${absolutePathOrUri}`;
};

const VaultScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen();

  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const [vaultRootPath, setVaultRootPath] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");

  const [index, setIndex] = useState<VaultIndex | null>(null);
  const [foldersElectron, setFoldersElectron] = useState<VaultFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("default");
  const [items, setItems] = useState<VaultItem[]>([]);

  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const loadAndroidIndex = useCallback(async (): Promise<VaultIndex | null> => {
    const stored = await loadDataStorage("VAULT_INDEX");
    return stored;
  }, []);

  const saveAndroidIndex = useCallback(async (next: VaultIndex) => {
    next.updatedAt = new Date().toISOString();
    await saveDataStorage("VAULT_INDEX", next);
    setIndex(next);
  }, []);

  const ensureInitialized = useCallback(async () => {
    const electron =
      Platform.OS === "web" ? await windowModule.isElectronBuild() : false;
    setIsElectron(electron);

    if (electron) {
      const res = await windowModule.vaultEnsureInitialized();
      if (!res.ok) {
        Alert.alert(t("dearUser"), res.error);
        return;
      }
      setIsReady(true);
      return;
    }

    if (Platform.OS === "android") {
      const res = await VaultCryptoModule.ensureInitialized();
      if (!res.ok) {
        Alert.alert(t("dearUser"), res.error);
        return;
      }
      setVaultRootPath(res.vaultRootPath);
      setIsReady(true);
      return;
    }

    Alert.alert(t("dearUser"), "Vault is not supported on this platform");
  }, [t]);

  const refresh = useCallback(async () => {
    if (!isReady) return;

    if (isElectron) {
      const folders = await windowModule.vaultListFolders();
      setFoldersElectron(folders);

      const folderId = folders[0]?.id || "default";
      if (folderId && folderId !== selectedFolderId)
        setSelectedFolderId(folderId);

      if (selectedFolderId) {
        const nextItems = await windowModule.vaultListItems(selectedFolderId);
        setItems(nextItems);
      }
      return;
    }

    if (Platform.OS === "android") {
      const currentIndex = await loadAndroidIndex();
      setIndex(currentIndex);

      const folderIds = currentIndex
        ? Object.keys(currentIndex.foldersById)
        : [];
      const effectiveFolderId = folderIds.includes(selectedFolderId)
        ? selectedFolderId
        : folderIds[0];
      if (effectiveFolderId && effectiveFolderId !== selectedFolderId)
        setSelectedFolderId(effectiveFolderId);

      const folderItems =
        (effectiveFolderId &&
          currentIndex?.itemsByFolderId?.[effectiveFolderId]) ||
        [];
      setItems(folderItems);
    }
  }, [isElectron, isReady, loadAndroidIndex, selectedFolderId]);

  refreshRef.current = refresh;

  useEffect(() => {
    ensureInitialized();
  }, [ensureInitialized]);

  useEffect(() => {
    if (!isReady) return;

    const unsub = isElectron
      ? windowModule.onVaultProgress((e) => setProgress(e))
      : onVaultProgressAndroid((e) => setProgress(e));

    return () => {
      unsub?.();
    };
  }, [isElectron, isReady]);

  useEffect(() => {
    if (!isReady) return;

    (async () => {
      if (isElectron) {
        await refresh();
        return;
      }

      const storedIndex = await loadAndroidIndex();
      setIndex(storedIndex);
      await refresh();
    })();
  }, [isElectron, isReady, loadAndroidIndex, refresh]);

  const folders = useMemo(() => {
    if (isElectron) return foldersElectron;
    return index ? Object.values(index.foldersById) : [];
  }, [foldersElectron, index, isElectron]);

  const unlock = useCallback(async () => {
    if (isFalsy(password)) return;

    try {
      if (isElectron) {
        const res = await windowModule.vaultUnlock(password);
        if (!res.ok) {
          Alert.alert(t("dearUser"), res.error);
          return;
        }

        setIsUnlocked(true);
        await refreshRef.current?.();
        return;
      }

      if (Platform.OS !== "android") return;

      const settings =
        (await loadDataStorage("VAULT_SETTINGS")) || getDefaultSettings();

      const [wrapped, verifier] = await Promise.all([
        loadDataStorage("VAULT_MASTER_KEY_WRAPPED"),
        loadDataStorage("VAULT_AUTH_VERIFIER"),
      ]);

      const res = await VaultCryptoModule.unlock(
        password,
        wrapped ? JSON.stringify(wrapped) : null,
        verifier ? JSON.stringify(verifier) : null,
        settings.autoLockSeconds,
      );

      if (!res.ok) {
        Alert.alert(t("dearUser"), res.error);
        return;
      }

      if (res.created) {
        if (res.wrappedMasterKeyJson) {
          await saveDataStorage(
            "VAULT_MASTER_KEY_WRAPPED",
            JSON.parse(res.wrappedMasterKeyJson),
          );
        }
        if (res.authVerifierJson) {
          await saveDataStorage(
            "VAULT_AUTH_VERIFIER",
            JSON.parse(res.authVerifierJson),
          );
        }

        const existingIndex = await loadAndroidIndex();
        if (!existingIndex) {
          await saveAndroidIndex(makeEmptyIndex(res.keyId));
        }
      }

      setIsUnlocked(true);
      await refreshRef.current?.();
    } catch (e) {
      logError("Vault unlock failed", e);
      Alert.alert(t("dearUser"), String(e));
    }
  }, [isElectron, loadAndroidIndex, password, saveAndroidIndex, t]);

  const lock = useCallback(async () => {
    if (isElectron) {
      windowModule.vaultLock();
      setIsUnlocked(false);
      return;
    }

    if (Platform.OS === "android") {
      VaultCryptoModule.lock();
      setIsUnlocked(false);
    }
  }, [isElectron]);

  const pickFiles = useCallback(async (): Promise<string[] | null> => {
    if (isElectron) {
      const res = await windowModule.vaultPickFiles();
      if (res.canceled) return null;
      return res.paths;
    }

    if (Platform.OS !== "android") return null;

    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: false,
      type: "*/*",
    });

    if (result.canceled) return null;
    return result.assets.map((a) => a.uri);
  }, [isElectron]);

  const importFiles = useCallback(async () => {
    if (!isUnlocked) {
      Alert.alert(t("dearUser"), t("vault.unlock"));
      return;
    }

    const picked = await pickFiles();
    if (!picked || picked.length === 0) return;

    const folderId = selectedFolderId || "default";

    const jobId = getRandomId();
    currentJobIdRef.current = jobId;
    setProgress({ jobId, phase: "scan", writtenBytes: 0 });

    if (isElectron) {
      const res = await windowModule.vaultEncryptPaths(jobId, folderId, picked);
      if (!res.ok) {
        Alert.alert(t("dearUser"), res.error);
        return;
      }
      await refreshRef.current?.();
      return;
    }

    if (Platform.OS !== "android") return;

    const res = await VaultCryptoModule.encryptUris(jobId, folderId, picked);
    if (!res.ok) {
      Alert.alert(t("dearUser"), res.error);
      return;
    }

    const currentIndex = (await loadAndroidIndex()) || makeEmptyIndex("master");
    const folder =
      currentIndex.foldersById[folderId] || makeDefaultFolder("master");

    currentIndex.foldersById[folderId] = folder;
    currentIndex.itemsByFolderId[folderId] =
      currentIndex.itemsByFolderId[folderId] || [];

    const nextItems: VaultItem[] = res.results.map((r) => {
      const extension = getExtension(r.originalName);
      const nowIso = new Date().toISOString();

      return {
        id: r.fileId,
        folderId,
        displayName: r.originalName,
        originalName: r.originalName,
        extension,
        mimeType: "application/octet-stream",
        sizePlainBytes: r.sizePlainBytes >= 0 ? r.sizePlainBytes : null,
        sizeCipherBytes: r.sizeCipherBytes,
        importedAt: nowIso,
        modifiedAt: null,
        encryption: {
          schemaVersion: 1,
          algorithm: "AES-256-GCM",
          keyId: r.keyId,
          nonceBase64: r.nonceBase64,
          tagLength: 16,
        },
        integrity: {
          hashAlg: "SHA-256",
          hashCipherHex: r.hashCipherHex,
        },
        flags: {
          readOnly: false,
          incognito: false,
          secretHidden: false,
        },
        accessControl: {
          requiresAuth: true,
          accessTTLSeconds: 60,
          lastAuthAt: nowIso,
          lockedUntil: null,
        },
        audit: {
          failedAttempts: 0,
          lastFailedAt: null,
        },
      };
    });

    currentIndex.itemsByFolderId[folderId] = [
      ...nextItems,
      ...(currentIndex.itemsByFolderId[folderId] || []),
    ];

    await saveAndroidIndex(currentIndex);
    await refreshRef.current?.();
  }, [
    isElectron,
    isUnlocked,
    loadAndroidIndex,
    pickFiles,
    selectedFolderId,
    saveAndroidIndex,
    t,
  ]);

  const decryptToTemp = useCallback(
    async (item: VaultItem) => {
      if (!isUnlocked) {
        Alert.alert(t("dearUser"), t("vault.unlock"));
        return;
      }

      const folderId = item.folderId;
      const sessionId = getRandomId();
      const jobId = getRandomId();
      currentJobIdRef.current = jobId;
      setProgress({ jobId, phase: "decrypt", writtenBytes: 0 });

      if (isElectron) {
        const res = await windowModule.vaultDecryptToTemp(
          jobId,
          folderId,
          item.id,
          sessionId,
        );
        if (!res.ok) {
          Alert.alert(t("dearUser"), res.error);
          return;
        }

        await windowModule.setClipboard(res.tempPath);
        Alert.alert(t("success"), res.tempPath);
        return;
      }

      if (Platform.OS !== "android") return;

      const res = await VaultCryptoModule.decryptToTemp(
        jobId,
        folderId,
        item.id,
        item.encryption.nonceBase64,
        item.originalName,
        sessionId,
      );

      if (!res.ok) {
        Alert.alert(t("dearUser"), res.error);
        return;
      }

      const uri = normalizeFileUri(res.tempPath);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(t("success"), uri);
      }

      await VaultCryptoModule.cleanTempSession(sessionId);
    },
    [isElectron, isUnlocked, t],
  );

  const deleteItem = useCallback(
    async (item: VaultItem) => {
      const folderId = item.folderId;

      if (isElectron) {
        const ok = await windowModule.vaultDeleteItem(folderId, item.id);
        if (!ok) Alert.alert(t("dearUser"), "Failed to delete item");
        await refreshRef.current?.();
        return;
      }

      if (Platform.OS !== "android") return;

      const currentIndex = await loadAndroidIndex();
      if (!currentIndex) return;

      const nextItems = (currentIndex.itemsByFolderId[folderId] || []).filter(
        (i) => i.id !== item.id,
      );
      currentIndex.itemsByFolderId[folderId] = nextItems;
      await saveAndroidIndex(currentIndex);
      await refreshRef.current?.();
    },
    [isElectron, loadAndroidIndex, saveAndroidIndex, t],
  );

  const cancelJob = useCallback(async () => {
    const jobId = currentJobIdRef.current;
    if (!jobId) return;

    if (isElectron) {
      await windowModule.vaultCancelJob(jobId);
      return;
    }

    if (Platform.OS === "android") {
      await VaultCryptoModule.cancelJob(jobId);
    }
  }, [isElectron]);

  const progressValue = useMemo(() => {
    if (!progress?.totalBytes || progress.totalBytes <= 0) return 0;
    return Math.max(
      0,
      Math.min(1, progress.writtenBytes / progress.totalBytes),
    );
  }, [progress]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium">{t("vault.title")}</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t("vault.subtitle")}
      </Text>

      {!isReady ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : null}

      <View style={styles.section}>
        <TextInput
          label={t("vault.password")}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.row}>
          <IconButton
            icon="lock-open-variant"
            onPress={unlock}
            disabled={!isReady || isFalsy(password)}
          />
          <Text>{t("vault.unlock")}</Text>

          <View style={styles.spacer} />

          <IconButton icon="lock" onPress={lock} disabled={!isReady} />
          <Text>{t("vault.lock")}</Text>
        </View>
      </View>

      <Divider />

      {progress ? (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <Text variant="titleSmall">
              {`Job ${progress.jobId} • ${progress.phase}`}
            </Text>
            <IconButton icon="cancel" onPress={cancelJob} />
          </View>
          <ProgressBar progress={progressValue} />
        </View>
      ) : null}

      <List.Section>
        <List.Subheader>{t("vault.folders")}</List.Subheader>
        {folders.length === 0 ? (
          <Text>{t("vault.noFolders")}</Text>
        ) : (
          folders.map((f) => (
            <List.Item
              key={f.id}
              title={f.displayName}
              description={f.id}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={f.id === selectedFolderId ? "folder" : "folder-outline"}
                />
              )}
              onPress={() => setSelectedFolderId(f.id)}
            />
          ))
        )}
      </List.Section>

      <View style={styles.itemActions}>
        <IconButton
          icon="file-import"
          onPress={importFiles}
          disabled={!isReady || !isUnlocked}
        />
        <Text>{t("vault.importFiles")}</Text>
      </View>

      <List.Section>
        <List.Subheader>{t("vault.items")}</List.Subheader>
        {items.length === 0 ? (
          <Text>{t("vault.noItems")}</Text>
        ) : (
          items.map((it) => (
            <List.Item
              key={it.id}
              title={it.displayName}
              description={`${it.sizeCipherBytes} bytes`}
              right={() => (
                <View style={styles.itemActions}>
                  <IconButton
                    icon="file-lock-open"
                    onPress={() => decryptToTemp(it)}
                    disabled={!isUnlocked}
                  />
                  <IconButton icon="delete" onPress={() => deleteItem(it)} />
                </View>
              )}
            />
          ))
        )}
      </List.Section>

      {Platform.OS === "android" && vaultRootPath ? (
        <Text variant="bodySmall" style={styles.muted}>
          {vaultRootPath}
        </Text>
      ) : null}
    </ScrollView>
  );
};

export default VaultScreen;
