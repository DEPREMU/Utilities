import {
  Text,
  View,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import Loading from "../../components/common/Loading";
import languages from "../../utils/languages/languages";
import { LanguageKeys } from "../../utils/globalVariables/constants";
import { checkLanguage } from "../../utils/globalVariables/utils";
import { useStylesForgotPassword } from "../../styles/auth/stylesForgotPassword";
import React, { useEffect, useState } from "react";

interface ForgotPasswordProps {
  navigation: any;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ navigation }) => {
  const styles = useStylesForgotPassword();
  const thingsToLoad = 1;
  const getTranslations = () => languages[lang as LanguageKeys];

  const [lang, setLang] = useState<LanguageKeys>();

  return <SafeAreaView style={styles.container}></SafeAreaView>;
};

export default ForgotPassword;
