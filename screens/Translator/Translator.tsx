import {
  View,
  Text,
  Alert,
  TextInput,
  Pressable,
  BackHandler,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { translate } from "../../utils/globalVariables/utils";
import stylesTranslator from "../../styles/translator/stylesTranslator";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";

interface TranslatorProps {
  navigation: any;
}

const Translator: React.FC<TranslatorProps> = ({ navigation }) => {
  const [inputText, setInputText] = useState<string>("");
  const [languageTo, setLanguageTo] = useState<string>("ES");
  const [translatedText, setTranslatedText] = useState<string>("");

  const languages = [
    { label: "Inglés", value: "EN" },
    { label: "Español", value: "ES" },
    { label: "Francés", value: "FR" },
    { label: "Alemán", value: "DE" },
    { label: "Italiano", value: "IT" },
    { label: "Japonés", value: "JA" },
    { label: "Chino", value: "ZH" },
  ];

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  const tranlating = async () => {
    if (inputText === "") return;
    const response = await translate(inputText, languageTo);
    setTranslatedText(response);
  };

  return (
    <View style={stylesTranslator.container}>
      <Text style={stylesTranslator.title}>Traductor</Text>
      <Text style={stylesTranslator.translateText}>Traducción:</Text>
      <Text style={stylesTranslator.textTranslated}>{translatedText}</Text>

      <TextInput
        value={inputText}
        onChangeText={setInputText}
        placeholder="Escribe el texto aquí"
        style={stylesTranslator.textInput}
      />

      <Picker
        selectedValue={languageTo}
        style={stylesTranslator.picker}
        onValueChange={(itemValue) => setLanguageTo(itemValue)}
      >
        {languages.map((lang) => (
          <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
        ))}
      </Picker>

      <Pressable
        style={({ pressed }) => [
          stylesTranslator.buttonTranslate,
          {
            opacity: pressed && inputText != "" ? 0.5 : 1,
            backgroundColor: inputText == "" ? "gray" : "blue",
          },
        ]}
        onPress={() => (inputText == "" ? null : tranlating())}
      >
        <Text style={stylesTranslator.textTranslate}>Traducir</Text>
      </Pressable>
    </View>
  );
};

export default Translator;
