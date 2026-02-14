import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import useStylesTranslator from "@/features/Translator/styles/useStylesTranslator";
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

  const languageToLabel = useMemo(() => {
    const lang = languages.find((l) => l.value === languageTo);
    return lang ? lang.label : "";
  }, [languageTo, languages]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("translator")}</Text>
        {!!translatedText && (
          <Text style={styles.translatedText}>{translatedText}</Text>
        )}
      </View>

      <View style={styles.body}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          label={t("enterText")}
          style={styles.textInput}
        />

        <List.Accordion
          style={styles.list}
          title={languageToLabel || t("languageTarget")}
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
          label={t("translate")}
          handlePress={translateText}
          disabled={isFalsy(inputText)}
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
