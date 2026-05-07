import Markdown from "react-native-marked";
import { Screens } from "@types";
import { TextInput } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";

import { View, Text, ScrollView } from "react-native";
import { useStylesMarkdownViewer } from "@screens/Markdown/styles/useStylesMarkdownViewer";
import React, { useEffect, useState } from "react";

const MarkdownViewer: React.FC<Screens["MarkdownViewer"]> = ({ route }) => {
  const { content } = route?.params || {};

  const { t } = useLanguage();
  const { styles } = useStylesMarkdownViewer();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (content) setValue(content);
  }, [content]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("markdown.title")}</Text>
      <TextInput
        multiline
        value={value}
        style={styles.input}
        placeholder={t("markdown.placeholder")}
        contentStyle={styles.contentStyle}
        onChangeText={setValue}
      />

      <ScrollView style={styles.scrollView}>
        <Markdown value={value} />
      </ScrollView>
    </View>
  );
};

export default MarkdownViewer;
