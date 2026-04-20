import React from "react";
// import { useTheme } from "@context/ThemeContext";
import { TextInput as PaperTextInput } from "react-native-paper";

const TextInput: React.FC<React.ComponentProps<typeof PaperTextInput>> = (
  props,
) => {
  //   const { colors } = useTheme();

  return <PaperTextInput {...props} />;
};

export default TextInput;
