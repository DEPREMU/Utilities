import Button from "@components/Button/screens";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo } from "react";
import { memoDeep, navigation } from "@utils";
import { useStylesGamesNavigator } from "@screens/Games/styles/useStylesGamesNavigator";
import { Screens, ScreensAvailable, AppTranslationsKeys } from "@types";

const buttons: { label: AppTranslationsKeys; screen: ScreensAvailable }[] = [
  { label: "games.minesweeper.title", screen: "Minesweeper" },
];

const GamesNavigator: React.FC<Screens["Games"]> = () => {
  const { t, dynamicT } = useLanguage();
  const { styles } = useStylesGamesNavigator();

  const renderButtons = useMemo(
    () =>
      buttons.map((button) => (
        <Button
          touchableOpacity
          key={button.label}
          label={dynamicT(button.label)}
          handlePress={navigation.replace}
          argsFuncHandlePress={[button.screen]}
        />
      )),
    [dynamicT],
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{t("games.title")}</Text>
        {renderButtons}
      </View>
    </View>
  );
};

export default memoDeep(GamesNavigator);
