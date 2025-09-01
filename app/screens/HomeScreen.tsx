import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo } from "react";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useStylesHomeScreen } from "@styles/screens/useStylesHomeScreen";
import { ScreensAvailable, typeLanguages } from "@types";

const buttons: Array<{ label: keyof typeLanguages; screen: ScreensAvailable }> =
  [
    { label: "settings", screen: "Settings" },
    { label: "infoIP", screen: "InfoIP" },
    { label: "cryptoInfo", screen: "Cryptos" },
    { label: "calculator", screen: "Calculator" },
    { label: "games", screen: "Games" },
    { label: "clipboard", screen: "Clipboard" },
  ];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { userData, logout } = useUserContext();
  const { styles } = useStylesHomeScreen();

  const renderButtons = useMemo(() => {
    return buttons.map((button) => (
      <Button
        key={button.label}
        label={t(button.label)}
        argsFuncHandlePress={button.screen}
        touchableOpacity
        handlePress={navigateReplace}
      />
    ));
  }, [t]);

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Button label={t("logout")} handlePress={logout} />
        <Text style={styles.title}>
          {t("welcomeUser", { user: userData?.name || t("user") })}
        </Text>
        {renderButtons}
      </View>
    </View>
  );
};

export default HomeScreen;
