import React from "react";
import { Pressable, Text } from "react-native";

type ButtonProps = {
  text: string;
  component: string;
  navigation: any;
  buttonStyle: any;
  buttonText: any;
};

const ButtonLocal: React.FC<ButtonProps> = ({
  text,
  component,
  navigation,
  buttonStyle,
  buttonText,
}) => (
  <Pressable
    onPress={() => (component ? navigation.replace(component) : null)}
    style={({ pressed }) => [buttonStyle, { opacity: pressed ? 0.6 : 1 }]}
  >
    <Text style={buttonText}>{text}</Text>
  </Pressable>
);

export default ButtonLocal;
