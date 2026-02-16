import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { Tables } from "@types";
import { modalRef } from "@refs";
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

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);

  const handleNewSendNotificationRef = useRef(() => {
    setSendNotification((prev) => !prev);
  });

  const handleAddToDatabase = useCallback(async () => {
    const { sessionToken, userData } = sessionManager.getSessionData();

    if (!userData?.userId)
      return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

    if (!inputText.trim())
      return modalRef.openSnackBar?.(t("pleaseEnterWebPageURL"));
    if (!inputText.trim().startsWith("http"))
      return modalRef.openSnackBar?.(t("webPageMustStartWithHTTP"));

    if (!sessionToken) return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

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

      if (error) modalRef.openSnackBar?.(t("errorOccurred", { error }));
      else {
        modalRef.openSnackBar?.(t("webPageAddedSuccessfully"));
        setInputText("");
        if (!data) return;
        if (Array.isArray(data)) data.forEach((item) => addNewItem(item));
        else addNewItem(data);
      }
    } catch {
      modalRef.openSnackBar?.(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [t, language, inputText, addNewItem, sendNotification]);

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
