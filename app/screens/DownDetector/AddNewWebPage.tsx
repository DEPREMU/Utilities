import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import useStylesAddNewWebPage from "@styles/screens/downDetector/useStylesAddNewWebPage";
import { Switch, Text, TextInput } from "react-native-paper";
import { fetchOptions, getRouteAPI } from "@utils";
import React, { useCallback, useState } from "react";
import { RequestDatabaseInsert, ResponseDatabaseInsert, Tables } from "@types";

interface AddNewWebPageScreenProps {
  addNewItem: (item: Tables["DownDetector"]) => void;
  downDetectorData: Tables["DownDetector"][] | null;
}

const tableName: keyof Tables = "DownDetector";
const AddNewWebPageScreen: React.FC<AddNewWebPageScreenProps> = ({
  addNewItem,
  downDetectorData,
}) => {
  const { styles } = useStylesAddNewWebPage();
  const { t, language } = useLanguage();
  const { openSnackBar } = useModal();
  const { userData, sessionToken } = useUserContext();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);

  const handleAddToDatabase = useCallback(async () => {
    if (!userData?.userId) return openSnackBar(t("youAreNotLoggedIn"));

    if (!inputText.trim()) return openSnackBar(t("pleaseEnterWebPageURL"));
    if (!inputText.trim().startsWith("http"))
      return openSnackBar(t("webPageMustStartWithHTTP"));

    if (!sessionToken) return openSnackBar(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const url = await getRouteAPI("/database/insert");

      const res = await fetch(
        url,
        fetchOptions<RequestDatabaseInsert<typeof tableName>>(
          "POST",
          {
            lang: language,
            table: tableName,
            values: {
              createdAt: new Date().toISOString(),
              userId: userData?.userId,
              url: inputText.trim(),
              sendNotification,
            },
          },
          sessionToken,
        ),
      );
      const { data, error } = (await res.json()) as ResponseDatabaseInsert<
        typeof tableName
      >;

      if (error) openSnackBar(t("errorOccurred", { error }));
      else {
        openSnackBar(t("webPageAddedSuccessfully"));
        setInputText("");
        setInterval("");
        if (!data) return;
        if (Array.isArray(data)) data.forEach((item) => addNewItem(item));
        else addNewItem(data);
      }
    } catch {
      openSnackBar(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [
    t,
    language,
    inputText,
    addNewItem,
    openSnackBar,
    sessionToken,
    sendNotification,
    userData?.userId,
  ]);

  const handleNewSendNotification = useCallback(() => {
    setSendNotification((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("addNewWebPage")}</Text>

      <TextInput
        style={styles.textInput}
        label={t("placeholderNewWebPage")}
        value={inputText}
        onChangeText={setInputText}
      />

      <Button
        handlePress={handleNewSendNotification}
        replaceStyles={{ button: styles.switchContainer, textButton: {} }}
      >
        <Text style={styles.switchLabel}>{t("sendNotification")}</Text>
        <Switch
          value={sendNotification}
          onValueChange={handleNewSendNotification}
          style={styles.switch}
        />
      </Button>

      <Button
        replaceStyles={{ button: styles.button, textButton: {} }}
        handlePress={handleAddToDatabase}
        disabled={
          isLoading ||
          JSON.stringify(downDetectorData || [])?.includes(inputText.trim())
        }
      >
        <Text style={styles.textButton}>
          {t(isLoading ? "adding" : "addToDatabase")}
        </Text>
      </Button>
    </View>
  );
};

export default AddNewWebPageScreen;
