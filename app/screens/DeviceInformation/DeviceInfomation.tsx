import { isFalsy } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import React, { useCallback } from "react";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { View, Text, ScrollView } from "react-native";
import useStylesDeviceInformation from "@styles/screens/DeviceInformation/useStylesDeviceInformation";
import { DeviceInformation as DeviceInformationType } from "@types";

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

      if (typeof value === "boolean") displayValue = value ? t("yes") : t("no");
      else if (key === "batteryLevel" && typeof value === "number")
        displayValue = `${(value * 100).toFixed(0)}%`;
      else if (
        key.toLowerCase().includes("memory") ||
        key.toLowerCase().includes("storage")
      )
        displayValue = isNaN(value as number)
          ? t("notAvailable")
          : `${((value as number) / 1024 ** 3).toFixed(2)} GB`;
      else displayValue = String(value);

      return (
        <View key={key} style={styles.keyValueRow}>
          <View style={styles.keyContainer}>
            <Text style={styles.textKey}>{t(key)}</Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.textValue}>{displayValue}</Text>
          </View>
        </View>
      );
    },
    [styles, t],
  );

  const renderObject = useCallback(
    (key: string, value: Object) => {
      if (!Array.isArray(value) && Object.keys(value || {}).length > 0) {
        return (
          <View key={key} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>
              {t(key as keyof DeviceInformationType)}
            </Text>
            <View style={styles.infoSection}>
              {Object.entries(value).map(([subKey, subValue]) => {
                if (isFalsy(subValue) || subValue === "unknown") return null;
                return renderKeyValue(
                  subKey as keyof DeviceInformationType,
                  subValue as string | number | boolean,
                );
              })}
            </View>
          </View>
        );
      } else if (Array.isArray(value) && value.length > 0) {
        const displayValue = value.join(", ");
        return (
          <View key={key} style={[styles.infoCard, styles.keyValueRow]}>
            <View style={styles.keyContainer}>
              <Text style={styles.textKey}>
                {t(key as keyof DeviceInformationType)}
              </Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={[styles.textValue]}>{displayValue}</Text>
            </View>
          </View>
        );
      }
      return null;
    },
    [styles, t, renderKeyValue],
  );

  const renderMainInfo = React.useMemo(() => {
    const infoItems: Array<React.ReactElement | null> = [];

    Object.entries(deviceInfo || {}).forEach(([key, value]) => {
      if (isFalsy(value) || ["unknown", -1].includes(value as string)) {
        return;
      }

      if (typeof value === "object") {
        infoItems.push(renderObject(key, value));
      } else {
        infoItems.push(
          <View key={key} style={styles.infoCard}>
            {renderKeyValue(key as keyof DeviceInformationType, value)}
          </View>,
        );
      }
    });

    return infoItems;
  }, [deviceInfo, renderObject, renderKeyValue, styles]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("deviceInformation")}</Text>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderMainInfo}
      </ScrollView>
    </View>
  );
};

export default DeviceInformation;
