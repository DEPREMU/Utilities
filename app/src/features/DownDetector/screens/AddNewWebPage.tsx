import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { Tables } from "@types";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import useStylesAddNewWebPage from "@screens/DownDetector/styles/useStylesAddNewWebPage";
import { Switch, Text, TextInput } from "react-native-paper";
import React, { useCallback, useRef, useState } from "react";
import { fetchToServer, sessionManager, storageManagement } from "@utils";

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
  const { openSnackBarRef } = useModal();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);

  const handleNewSendNotificationRef = useRef(() => {
    setSendNotification((prev) => !prev);
  });

  const handleAddToDatabase = useCallback(async () => {
    const { sessionToken, userData } = sessionManager.getSessionData();

    if (!userData?.userId)
      return openSnackBarRef.current(t("youAreNotLoggedIn"));

    if (!inputText.trim())
      return openSnackBarRef.current(t("pleaseEnterWebPageURL"));
    if (!inputText.trim().startsWith("http"))
      return openSnackBarRef.current(t("webPageMustStartWithHTTP"));

    if (!sessionToken) return openSnackBarRef.current(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await fetchToServer(
        "/database/insert",
        {
          lang: language,
          table: tableName,
          deviceId,
          values: {
            createdAt: new Date().toISOString(),
            userId: userData?.userId,
            url: inputText.trim(),
            sendNotification,
          },
        },
        sessionToken,
      );
      const { data, error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) openSnackBarRef.current(t("errorOccurred", { error }));
      else {
        openSnackBarRef.current(t("webPageAddedSuccessfully"));
        setInputText("");
        if (!data) return;
        if (Array.isArray(data)) data.forEach((item) => addNewItem(item));
        else addNewItem(data);
      }
    } catch {
      openSnackBarRef.current(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [t, language, inputText, addNewItem, openSnackBarRef, sendNotification]);

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
        handlePress={handleNewSendNotificationRef.current}
        replaceStyles={{ button: styles.switchContainer, textButton: {} }}
      >
        <Text style={styles.switchLabel}>{t("sendNotification")}</Text>
        <Switch
          value={sendNotification}
          onValueChange={handleNewSendNotificationRef.current}
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
