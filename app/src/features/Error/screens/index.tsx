import React from "react";
import { View } from "react-native";
import ExpoUpdates from "expo-updates";
import { REPLACERS } from "@common";
import { reloadAppAsync } from "expo";
import { useStylesErrorScreen } from "../styles";
import { Button, Text, ProgressBar } from "react-native-paper";

type ErrorScreenProps = {
  error: Error;
};

const translates = {
  errorLoading:
    "An error occurred while loading the app. Please restart the app and try again.",
  reloadButton: "Reload App",
  newUpdate:
    "A new update is being downloaded. The app will reload to apply the update.",
};

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
  const { styles } = useStylesErrorScreen();

  const [isNewUpdate, setIsNewUpdate] = React.useState(false);

  React.useEffect(() => {
    if (REPLACERS.isWeb || REPLACERS.isDev) return;

    const func = async () => {
      const res = await ExpoUpdates.checkForUpdateAsync();
      setIsNewUpdate(res.isAvailable);
      if (!res.isAvailable) return;

      await ExpoUpdates.fetchUpdateAsync();
      await ExpoUpdates.reloadAsync();
    };

    func();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{translates.errorLoading}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {!isNewUpdate && (
        <Button
          mode="contained"
          onPress={() => {
            reloadAppAsync(
              "An error occurred while loading the app: " + error.message,
            );
          }}
        >
          {translates.reloadButton}
        </Button>
      )}
      {isNewUpdate && (
        <>
          <Text style={styles.errorText}>{translates.newUpdate}</Text>
          <ProgressBar indeterminate={true} />
        </>
      )}
    </View>
  );
};

export default ErrorScreen;
