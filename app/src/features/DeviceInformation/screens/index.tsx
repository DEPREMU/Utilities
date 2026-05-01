import Animated, {
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { REPLACERS } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import React, { useCallback } from "react";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { View, Text, ScrollView } from "react-native";
import { useStylesDeviceInformation } from "@screens/DeviceInformation/styles/useStylesDeviceInformation";
import { DeviceInformation as DeviceInformationType } from "@types";

const isValidValue = (value: unknown): boolean => {
  return (
    !!value &&
    value !== -1 &&
    value !== "unknown" &&
    (!Array.isArray(value) || value.length > 0)
  );
};

const DeviceInformation: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesDeviceInformation();
  const { deviceInfo } = useDeviceInformation();

  const renderKeyValue = useCallback(
    (
      key:
        | keyof DeviceInformationType
        | "batteryLevel"
        | "batteryState"
        | "lowPowerMode",
      value: string | number | boolean,
    ) => {
      let displayValue = "";
      const keyLower = key.toLowerCase();

      if (typeof value === "boolean")
        displayValue = value ? t("common.yes") : t("common.no");
      else if (key === "batteryLevel" && typeof value === "number")
        displayValue = `${(value * 100).toFixed(0)}%`;
      else if (keyLower.includes("memory") || keyLower.includes("storage"))
        displayValue = isNaN(value as number)
          ? t("common.notAvailable")
          : `${((value as number) / 1024 ** 3).toFixed(2)} GB`;
      else displayValue = String(value);

      return (
        <Animated.View
          key={key}
          style={styles.keyValueRow}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200).springify()}
          entering={FadeInRight.duration(200).springify()}
        >
          <Animated.View
            style={styles.keyContainer}
            layout={LinearTransition.duration(200).springify()}
          >
            <Text style={styles.h3}>{t(`deviceInformation.${key}`)}</Text>
          </Animated.View>

          <Animated.View
            style={styles.valueContainer}
            layout={LinearTransition.duration(200).springify()}
          >
            <Text style={styles.paragraph}>{displayValue}</Text>
          </Animated.View>
        </Animated.View>
      );
    },
    [styles, t],
  );

  const renderObject = useCallback(
    (key: string, value: object) => {
      if (!value) return null;

      const isArray = Array.isArray(value);

      if (!isArray && Object.keys(value).length > 0) {
        return (
          <Animated.View
            key={key}
            style={styles.sectionContainer}
            layout={LinearTransition.duration(200).springify()}
          >
            <Animated.Text style={styles.subtitle}>
              {t(`deviceInformation.${key as keyof DeviceInformationType}`)}
            </Animated.Text>

            <Animated.View
              style={styles.sectionContainer}
              layout={LinearTransition.duration(200).springify()}
            >
              {Object.entries(value).map(([subKey, subValue]) => {
                if (!isValidValue(subValue)) return null;

                return renderKeyValue(
                  subKey as keyof DeviceInformationType,
                  subValue as string | number | boolean,
                );
              })}
            </Animated.View>
          </Animated.View>
        );
      } else if (isArray && value.length > 0) {
        const displayValue = value.join(", ");
        return (
          <Animated.View
            key={key}
            style={[styles.sectionContainer, styles.keyValueRow]}
            layout={LinearTransition.duration(200).springify()}
          >
            <Animated.View style={styles.keyContainer}>
              <Text style={styles.h3}>
                {t(`deviceInformation.${key as keyof DeviceInformationType}`)}
              </Text>
            </Animated.View>

            <Animated.View style={styles.valueContainer}>
              <Text style={[styles.paragraph]}>{displayValue}</Text>
            </Animated.View>
          </Animated.View>
        );
      }

      return null;
    },
    [styles, t, renderKeyValue],
  );

  const renderMainInfo = React.useMemo(() => {
    return Object.entries(deviceInfo || {}).map(([key, value]) => {
      if (!isValidValue(value)) return null;

      if (typeof value === "object") {
        return renderObject(key, value);
      } else {
        return (
          <View key={key} style={styles.sectionContainer}>
            {renderKeyValue(key as keyof DeviceInformationType, value)}
          </View>
        );
      }
    });
  }, [deviceInfo, renderObject, renderKeyValue, styles]);

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
    >
      <Animated.Text
        style={styles.title}
        layout={LinearTransition.duration(200).springify()}
      >
        {t("deviceInformation.title")}
      </Animated.Text>

      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContentContainer}
        showsVerticalScrollIndicator={REPLACERS.isWeb}
      >
        {renderMainInfo}
      </ScrollView>
    </Animated.View>
  );
};

export default DeviceInformation;
