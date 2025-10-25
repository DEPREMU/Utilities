import Markdown from "react-native-marked";
import { useLanguage } from "@context/LanguageContext";
import React, { useState } from "react";

import { View, Text, ScrollView } from "react-native";
import { useStylesMarkdownViewer } from "@styles/screens/markdown/MarkdownViewerStyles";
import { TextInput } from "react-native-paper";

const MarkdownViewer = () => {
  const { t } = useLanguage();
  const { styles } = useStylesMarkdownViewer();
  const [content, setContent] = useState<string>("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("markdownViewer")}</Text>
      <TextInput
        style={styles.input}
        contentStyle={styles.contentStyle}
        value={content}
        onChangeText={setContent}
        placeholder={t("markdownPlaceholder")}
        multiline
      />
      <ScrollView style={styles.scrollView}>
        <Markdown value={content} />
      </ScrollView>
    </View>
  );
};

export default MarkdownViewer;
