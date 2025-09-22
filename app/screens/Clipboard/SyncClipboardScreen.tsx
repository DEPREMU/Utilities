import Button from "@components/common/ButtonComponent";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { View, TextInput } from "react-native";
import useStylesSyncClipboard from "@styles/screens/clipboard/useStylesSyncClipboard";
import { fetchOptions, getRouteAPI } from "@utils";
import React, { useCallback, useState } from "react";
import { RequestSupabaseInsert, ResponseSupabaseInsert } from "@types";

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
      const res = await fetch(
        await getRouteAPI("/supabase/insert"),
        fetchOptions<RequestSupabaseInsert>(
          "POST",
          {
            lang: language,
            table: "ClipboardSync",
            values: {
              content: inputText,
              createdAt: new Date().toISOString(),
              deviceId: "local-device",
              userId: userData?.userId,
            },
          },
          sessionToken,
        ),
      );
      const { error } = (await res.json()) as ResponseSupabaseInsert;

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
