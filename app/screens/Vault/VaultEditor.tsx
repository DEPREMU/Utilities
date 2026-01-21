import {
  View,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import Markdown from "react-native-marked";
import { typeT } from "@types";
import React, { useEffect, useState } from "react";
import { SegmentedButtons, TextInput } from "react-native-paper";

type VaultEditorProps = {
  mode: "text" | "markdown";
  value: string;
  onChangeText: (text: string) => void;
  readOnly: boolean;
  t: typeT;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

const VaultEditor: React.FC<VaultEditorProps> = ({
  t,
  mode,
  value,
  readOnly,
  inputStyle,
  onChangeText,
  containerStyle,
}) => {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (mode !== "markdown") setTab("edit");
  }, [mode]);

  const isMarkdownPreview = mode === "markdown" && tab === "preview";

  return (
    <View style={[styles.container, containerStyle]}>
      {mode === "markdown" ? (
        <>
          <SegmentedButtons
            style={styles.tabBar}
            value={tab}
            onValueChange={(next) =>
              setTab(next === "preview" ? "preview" : "edit")
            }
            buttons={[
              { value: "edit", label: t("common.edit") },
              { value: "preview", label: t("common.preview") },
            ]}
          />
          {isMarkdownPreview ? (
            <Markdown value={value || ""} />
          ) : (
            <TextInput
              style={[styles.input, inputStyle]}
              multiline
              value={value}
              onChangeText={onChangeText}
              disabled={readOnly}
            />
          )}
        </>
      ) : (
        <TextInput
          style={[styles.input, inputStyle]}
          multiline
          value={value}
          onChangeText={onChangeText}
          disabled={readOnly}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { maxHeight: 320, gap: 8 },
  tabBar: { alignSelf: "flex-start" },
  input: { minHeight: 240 },
});

export default VaultEditor;
