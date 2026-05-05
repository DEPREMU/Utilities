import Animated, {
  FadeInLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { memoDeep } from "@utils";
import { ActivityIndicator, Card, List } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import useStylesComputerControl from "../styles/useStylesComputerControl";
import { Device, ExecuteCommandOnDevice } from "../screens";
import React, { useCallback, useEffect, useRef, useState } from "react";

const ComputerItem: React.FC<{
  item: Device;
  executeCommandOnDevice: ExecuteCommandOnDevice;
}> = ({ item, executeCommandOnDevice }) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesComputerControl();

  const [pressedCommand, setPressedCommand] = useState<
    false | "turn-off" | "restart"
  >(false);
  const isMounted = useRef(true);

  const handleFinishCommand = useCallback(() => {
    if (isMounted.current) setPressedCommand(false);
  }, []);

  const handleTurnOff = useCallback(() => {
    setPressedCommand("turn-off");
    executeCommandOnDevice(item.url, item.deviceId, "turn-off-computer")
      .then(handleFinishCommand)
      .catch(handleFinishCommand);
  }, [item, executeCommandOnDevice, handleFinishCommand]);

  const handleRestart = useCallback(() => {
    setPressedCommand("restart");
    executeCommandOnDevice(item.url, item.deviceId, "restart-computer")
      .then(handleFinishCommand)
      .catch(handleFinishCommand);
  }, [item, executeCommandOnDevice, handleFinishCommand]);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutRight.duration(200)}
      entering={FadeInLeft.duration(200)}
    >
      <Card style={styles.sectionContainer}>
        <Card.Content>
          <List.Section>
            <List.Item
              title={item.name}
              description={item.url}
              left={(props) => <List.Icon {...props} icon="remote-desktop" />}
            />

            <List.Item
              title={t("terminalCommands.turnOffComputer")}
              description={item.url}
              left={(props) =>
                pressedCommand === "turn-off" ? (
                  <ActivityIndicator {...props} />
                ) : (
                  <List.Icon {...props} icon={"power"} color={colors.error} />
                )
              }
              onPress={handleTurnOff}
              disabled={!!pressedCommand}
            />

            <List.Item
              title={t("terminalCommands.restartComputer")}
              description={item.url}
              left={(props) =>
                pressedCommand === "restart" ? (
                  <ActivityIndicator {...props} />
                ) : (
                  <List.Icon
                    {...props}
                    icon={"restart"}
                    color={colors.primary}
                  />
                )
              }
              onPress={handleRestart}
              disabled={!!pressedCommand}
            />
          </List.Section>
        </Card.Content>
      </Card>
    </Animated.View>
  );
};

export default memoDeep(ComputerItem);
