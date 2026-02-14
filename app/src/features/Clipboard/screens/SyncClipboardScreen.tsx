import Button from "@/common/components/Button/screens";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { View, TextInput } from "react-native";
import { useStylesSyncClipboard } from "@screens/Clipboard/styles";
import React, { useCallback, useState } from "react";
import { fetchToServer, storageManagement } from "@utils";

const SyncClipboardScreen: React.FC = () => {
  const { styles } = useStylesSyncClipboard();
  const { t, language } = useLanguage();
  const { openSnackBarRef } = useModal();
  const { userData, sessionToken } = useUserContext();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    if (!userData?.userId)
      return openSnackBarRef.current(t("youAreNotLoggedIn"));

    if (!inputText.trim())
      return openSnackBarRef.current(t("pleaseEnterSomeText"));
    if (!sessionToken) return openSnackBarRef.current(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await fetchToServer(
        "/database/insert",
        {
          lang: language,
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

      if (error) openSnackBarRef.current(t("errorOccurred", { error }));
      else {
        openSnackBarRef.current(t("textAddedToDatabase"));
        setInputText("");
      }
    } catch {
      openSnackBarRef.current(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, openSnackBarRef, t, userData?.userId, sessionToken, language]);

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
