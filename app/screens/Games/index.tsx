import React, { useMemo } from "react";
import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useStylesGamesNavigator } from "@styles/screens/Games/useStylesGamesNavigator";
import { ScreensAvailable, typeLanguagesKeys } from "@types";

const buttons: { label: typeLanguagesKeys; screen: ScreensAvailable }[] = [
  { label: "minesweeper", screen: "Minesweeper" },
];

const GamesNavigator: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesGamesNavigator();

  const renderButtons = useMemo(
    () =>
      buttons.map((button) => (
        <Button
          key={button.label}
          label={t(button.label)}
          touchableOpacity
          argsFuncHandlePress={[button.screen]}
          handlePress={navigateReplace}
        />
      )),
    [t],
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{t("games")}</Text>
        {renderButtons}
      </View>
    </View>
  );
};

export default GamesNavigator;
