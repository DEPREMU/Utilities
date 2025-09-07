import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesTranslator from "@styles/screens/Translator/useStylesTranslator";
import { isFalsy, translate } from "@utils";
import { List, TextInput, Text } from "react-native-paper";
import React, { useCallback, useMemo, useState } from "react";

const Translator: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesTranslator();

  const languages = useMemo(
    () => [
      { label: t("English"), value: "EN" },
      { label: t("Spanish"), value: "ES" },
      { label: t("French"), value: "FR" },
      { label: t("German"), value: "DE" },
      { label: t("Italian"), value: "IT" },
      { label: t("Japanese"), value: "JA" },
      { label: t("Chinese"), value: "ZH" },
    ],
    [t],
  );

  const [inputText, setInputText] = useState<string>("");
  const [languageTo, setLanguageTo] = useState<string>("ES");
  const [translatedText, setTranslatedText] = useState<string>("");

  const translateText = useCallback(async () => {
    if (isFalsy(inputText)) return;
    const response = await translate(inputText, languageTo);
    setTranslatedText(response);
  }, [inputText, languageTo]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("translator")}</Text>
      <Text style={styles.translateText}>{t("translation")}</Text>
      <Text style={styles.translatedText}>{translatedText}</Text>

      <TextInput
        value={inputText}
        onChangeText={setInputText}
        label={t("enterText")}
        style={styles.textInput}
      />

      <List.Accordion title={t("languageTarget")} style={styles.list}>
        {languages.map((lang) => (
          <List.Item
            key={lang.value}
            style={styles.listItem}
            title={lang.label}
            onPress={() => setLanguageTo(lang.value)}
          />
        ))}
      </List.Accordion>

      <Button
        label={t("translate")}
        handlePress={translateText}
        disabled={inputText === ""}
        touchableOpacity
        replaceStyles={{
          button: styles.buttonTranslate,
          textButton: styles.textTranslate,
        }}
      />
    </View>
  );
};

export default Translator;
