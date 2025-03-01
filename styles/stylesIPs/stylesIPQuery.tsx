import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "../../components/context/LayoutContext";
import { MD3Theme, useTheme } from "react-native-paper";

export const stylesIPQuery = () => {
  const theme: MD3Theme = useTheme();
  const { isPhone, isTablet } = useResponsiveLayout();

  const containerPadding = isPhone ? 10 : isTablet ? 15 : 20;
  const textIPFontSize = isPhone ? 20 : isTablet ? 22 : 24;
  const valueIPFontSize = isPhone ? 16 : isTablet ? 18 : 20;
  const containerDataIPPadding = isPhone ? 10 : isTablet ? 12 : 15;
  const textKeyFontSize = isPhone ? 14 : isTablet ? 16 : 18;
  const valueFontSize = isPhone ? 14 : isTablet ? 16 : 18;
  const mapContainerHeight = isPhone ? 150 : isTablet ? 180 : 200;

  return StyleSheet.create({
    container: {
      flex: 1,
      padding: containerPadding,
      width: "95%",
      backgroundColor: theme.colors.background,
    },
    textIP: {
      fontSize: textIPFontSize,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
      color: theme.colors.onBackground,
    },
    valueIP: {
      fontSize: valueIPFontSize,
      color: theme.colors.primary,
    },
    containerDataIP: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: containerDataIPPadding,
      marginBottom: 15,
      shadowColor: theme.colors.onSurface,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    textKey: {
      fontSize: textKeyFontSize,
      fontWeight: "bold",
      marginBottom: 5,
      marginVertical: 5,
      color: theme.colors.onBackground,
    },
    value: {
      fontSize: valueFontSize,
      color: theme.colors.primary,
    },
    mapContainer: {
      height: mapContainerHeight,
      marginTop: 20,
    },
    // map: {
    //   ...StyleSheet.absoluteFillObject,
    // },
  });
};
