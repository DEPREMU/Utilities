import Button from "@/common/components/Button/screens";
import { Text } from "react-native-paper";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { View, TextInput } from "react-native";
import { useStylesSyncClipboard } from "@screens/Clipboard/styles";
import React, { useCallback, useState } from "react";
import { fetchToServer, sessionManager, storageManagement } from "@utils";

const SyncClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesSyncClipboard();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId)
      return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

    if (!inputText.trim())
      return modalRef.openSnackBar?.(t("pleaseEnterSomeText"));
    if (!sessionToken) return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await fetchToServer(
        "/database/insert",
        {
          lang: storageManagement.get("LANGUAGE"),
          table: "ClipboardSync",
          deviceId,
          values: {
            userId: userData?.userId,
            content: inputText,
            deviceId,
            createdAt: new Date().toISOString(),
          },
        },
        sessionToken,
      );
      const { error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) modalRef.openSnackBar?.(t("errorOccurred", { error }));
      else {
        modalRef.openSnackBar?.(t("textAddedToDatabase"));
        setInputText("");
      }
    } catch {
      modalRef.openSnackBar?.(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("addTextToClipboard")}</Text>

      <TextInput
        style={styles.textInput}
        placeholder={t("enterYourTextHere")}
        value={inputText}
        onChangeText={setInputText}
        multiline
      />

      <Button
        replaceStyles={{ button: styles.button, textButton: {} }}
        handlePress={handleAddToDatabase}
        disabled={isLoading}
      >
        <Text style={styles.textButton}>
          {t(isLoading ? "adding" : "addToDatabase")}
        </Text>
      </Button>
    </View>
  );
};

export default SyncClipboardScreen;
