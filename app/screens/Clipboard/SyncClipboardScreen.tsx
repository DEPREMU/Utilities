import Button from "@components/common/ButtonComponent";
import { Text } from "react-native-paper";
import { Tables } from "@types";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import React, { useCallback, useState } from "react";
import { insertIntoTable } from "@utils";
import { View, TextInput } from "react-native";
import useStylesSyncClipboard from "@styles/screens/clipboard/useStylesSyncClipboard";

const SyncClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useUserContext();
  const { openSnackBar } = useModal();
  const { styles } = useStylesSyncClipboard();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    if (!user?.id) return openSnackBar(t("youAreNotLoggedIn"));

    if (!inputText.trim()) return openSnackBar("Please enter some text");

    setIsLoading(true);
    try {
      const { error } = await insertIntoTable<Tables["ClipboardSync"]>(
        "ClipboardSync",
        {
          content: inputText,
          createdAt: new Date().toISOString(),
          deviceId: "local-device",
          userId: user?.id,
        },
      );
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
  }, [inputText, openSnackBar, t, user?.id]);

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
