import Button from "@components/Button/screens";
import { View } from "react-native";
import { Screens } from "@types";
import { translate } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import useStylesTranslator from "@screens/Translator/styles/useStylesTranslator";
import { List, TextInput, Text } from "react-native-paper";
import React, { useCallback, useMemo, useState } from "react";

const Translator: React.FC<Screens["Translator"]> = () => {
  const { t } = useLanguage();
  const { styles } = useStylesTranslator();

  const languages = useMemo(
    () => [
      { label: t("languages.English"), value: "EN" },
      { label: t("languages.Spanish"), value: "ES" },
      { label: t("languages.French"), value: "FR" },
      { label: t("languages.German"), value: "DE" },
      { label: t("languages.Italian"), value: "IT" },
      { label: t("languages.Japanese"), value: "JA" },
      { label: t("languages.Chinese"), value: "ZH" },
    ],
    [t],
  );

  const [inputText, setInputText] = useState<string>("");
  const [languageTo, setLanguageTo] = useState<string>("ES");
  const [translatedText, setTranslatedText] = useState<string>("");

  const translateText = useCallback(async () => {
    if (!inputText) return;

    const response = await translate(inputText, languageTo);
    setTranslatedText(response);
  }, [inputText, languageTo]);

  const languageToLabel = useMemo(() => {
    const lang = languages.find((l) => l.value === languageTo);
    return lang ? lang.label : "";
  }, [languageTo, languages]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("translator.title")}</Text>
        {!!translatedText && (
          <Text style={styles.translatedText}>{translatedText}</Text>
        )}
      </View>

      <View style={styles.body}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          label={t("translator.enterText")}
          style={styles.textInput}
        />

        <List.Accordion
          style={styles.list}
          title={languageToLabel || t("translator.languageTarget")}
          left={() => <List.Icon icon="translate" />}
        >
          {languages.map((lang) => {
            if (lang.label === languageToLabel) return null;

            return (
              <List.Item
                key={lang.value}
                style={styles.listItem}
                left={() => <List.Icon icon="translate" />}
                title={lang.label}
                onPress={() => setLanguageTo(lang.value)}
              />
            );
          })}
        </List.Accordion>

        <Button
          label={t("translator.translate")}
          handlePress={translateText}
          disabled={!inputText}
          touchableOpacity
          replaceStyles={{
            button: styles.buttonTranslate,
            textButton: styles.textTranslate,
          }}
        />
      </View>
    </View>
  );
};

export default Translator;
