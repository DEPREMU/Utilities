import {
  useDeviceInformation,
  DeviceInformation as DeviceInformationType,
} from "@context/DeviceInformationContext";
import { isFalsy } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import React, { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import useStylesDeviceInformation from "@styles/screens/DeviceInformation/useStylesDeviceInformation";

const DeviceInformation: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesDeviceInformation();
  const { deviceInfo } = useDeviceInformation();

  const renderObject = useCallback(
    (key: string, value: Object) => {
      let text = ": ";

      if (!Array.isArray(value) && Object.keys(value || {}).length > 0) {
        return (
          <>
            {console.log(value)}
            <Text style={styles.textKey}>
              {t(key as keyof DeviceInformationType)}
            </Text>
            {Object.entries(value).map(([subKey, subValue]) => {
              if (isFalsy(subValue) || subValue === "unknown") return null;
              let text = ": ";
              if (typeof subValue === "boolean")
                text += subValue ? t("yes") : t("no");
              else if (typeof subValue === "number") text += String(subValue);
              else text += t(subValue);

              return (
                <Text style={styles.textKey} key={subKey}>
                  {t(subKey as keyof DeviceInformationType)}
                  <Text style={styles.textValue}>{text}</Text>
                </Text>
              );
            })}
          </>
        );
      } else if (Array.isArray(value) && value.length > 0) {
        text += value.join(", ");
        return (
          <Text style={styles.textKey}>
            {t(key as keyof DeviceInformationType)}
            <Text style={styles.textValue}>{text}</Text>
          </Text>
        );
      } else return null;
    },
    [styles.textKey, styles.textValue, t],
  );

  const renderMainInfo = React.useMemo(
    () =>
      Object.entries(deviceInfo || {}).map(([key, value]) => {
        if (isFalsy(value) || ["unknown", -1].includes(value as string))
          return null;

        let text = ": ";
        if (typeof value === "boolean") text += value ? t("yes") : t("no");
        else if (typeof value === "object") return renderObject(key, value);
        else text += String(value);

        const keyTyped = key as keyof DeviceInformationType;

        return (
          <Text key={key} style={styles.textKey}>
            {t(keyTyped)}
            <Text style={styles.textValue}>{text}</Text>
          </Text>
        );
      }),
    [deviceInfo, renderObject, styles.textKey, styles.textValue, t],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("deviceInformation")}</Text>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {renderMainInfo}
      </ScrollView>
    </View>
  );
};

export default DeviceInformation;
