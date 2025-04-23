import React, { useEffect, useState } from "react";
import { Modal, Text } from "react-native-paper";
import {
  ColorSchemeName,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import {
  loadData,
  saveData,
  THEME_KEY_STORAGE,
  TranslationsInterface,
} from "../../utils";
import { Picker } from "@react-native-picker/picker";
import { useThemeContext } from "../context/ThemeContext";

type ThemeProps = {
  translations: TranslationsInterface;
};

const Theme: React.FC<ThemeProps> = ({ translations }) => {
  const { setColorScheme, colorScheme } = useThemeContext();

  return (
    <View style={styles.container}>
      <Text style={styles.textTitle}>{translations.themeTitle}</Text>
      <View style={styles.selectContainer}>
        <Picker
          selectedValue={colorScheme}
          onValueChange={setColorScheme}
          style={styles.picker}
        >
          <Picker.Item label={translations.systemTheme} value="auto" />
          <Picker.Item label={translations.lightTheme} value="light" />
          <Picker.Item label={translations.darkTheme} value="dark" />
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    width: "80%",
    alignItems: "center",
  },
  textTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  selectContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  picker: {
    width: "100%",
  },
});

export default Theme;
