import {
  Screens,
  Function,
  ScreensAvailable,
  AppTranslationsKeys,
} from "@types";
import Button from "@components/Button/screens";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo } from "react";
import { memoDeep, navigation } from "@utils";
import { useStylesGamesNavigator } from "@screens/Games/styles/useStylesGamesNavigator";

const buttons: { label: AppTranslationsKeys; screen: ScreensAvailable }[] = [
  { label: "games.minesweeper.title", screen: "Minesweeper" },
];

const GamesNavigator: React.FC<Screens["Games"]> = () => {
  const { t } = useLanguage();
  const { styles } = useStylesGamesNavigator();

  const renderButtons = useMemo(
    () =>
      buttons.map((button) => (
        <Button
          touchableOpacity
          key={button.label}
          label={(t as Function<[AppTranslationsKeys], string>)(button.label)}
          handlePress={navigation.replace}
          argsFuncHandlePress={[button.screen]}
        />
      )),
    [t],
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
