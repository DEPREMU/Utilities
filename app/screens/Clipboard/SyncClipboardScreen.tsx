import Button from "@components/common/ButtonComponent";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { View, TextInput } from "react-native";
import useStylesSyncClipboard from "@styles/screens/clipboard/useStylesSyncClipboard";
import React, { useCallback, useState } from "react";
import { fetchToServer, loadDataStorage } from "@utils";

const SyncClipboardScreen: React.FC = () => {
  const { styles } = useStylesSyncClipboard();
  const { t, language } = useLanguage();
  const { openSnackBar } = useModal();
  const { userData, sessionToken } = useUserContext();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    if (!userData?.userId) return openSnackBar(t("youAreNotLoggedIn"));

    if (!inputText.trim()) return openSnackBar(t("pleaseEnterSomeText"));
    if (!sessionToken) return openSnackBar(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = await loadDataStorage("DEVICE_ID");

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

      if (error) openSnackBar(t("errorOccurred", { error }));
      else {
        openSnackBar(t("textAddedToDatabase"));
        setInputText("");
      }
    } catch {
      openSnackBar(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, openSnackBar, t, userData?.userId, sessionToken, language]);

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
