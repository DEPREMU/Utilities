import React, {
  useMemo,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { useTheme } from "./ThemeContext";
import { REPLACERS } from "@common";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextStyle, View, ViewStyle, useWindowDimensions } from "react-native";

interface LayoutProviderProps {
  children: ReactNode;
}

type ViewStyleFinder =
  | "FAB"
  | "flex"
  | "shadow"
  | "divider"
  | "container"
  | "flexCenter"
  | "scrollView"
  | "rowSwitchText"
  | "sectionContainer"
  | "backgroundShapeOne"
  | "backgroundShapeTwo";

type TextStyleFinder = "h3" | "title" | "subtitle" | "paragraph" | "error";

export type CommonStyles = TextStyleFinder | ViewStyleFinder;

type StaticStyles = {
  FAB: ViewStyle;
  flex: ViewStyle;
  shadow: ViewStyle;
  flexCenter: ViewStyle;
};

type ShapesStyles = {
  backgroundShapeOne: ViewStyle;
  backgroundShapeTwo: ViewStyle;
};

type Texts = {
  h3: TextStyle;
  error: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  paragraph: TextStyle;
};

type ReturnGetCommonStyles<T extends CommonStyles> = T extends "scrollView"
  ? {
      scrollViewContainer: ViewStyle;
      scrollViewContentContainer: ViewStyle;
    }
  : {
      [K in T]: T extends ViewStyleFinder ? ViewStyle : TextStyle;
    };

type GetCommonStyles = <T extends CommonStyles>(
  style: T,
) => ReturnGetCommonStyles<T>;

interface LayoutContextProps {
  getResponsiveValue: <T = number>(
    phoneValue: T,
    tabletValue: T,
    largeTabletValue: T,
    webValue?: T,
  ) => T;
  texts: Texts;
  isWeb: boolean;
  width: number;
  height: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
  isPhone: boolean;
  isTablet: boolean;
  isPortrait: boolean;
  isLargeTablet: boolean;
  getCommonStyles: GetCommonStyles;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const { colors } = useTheme();

  const { width, height } = useWindowDimensions();

  const rawInsets = useSafeAreaInsets();

  const insets = useMemo(
    () => ({
      top: rawInsets.top,
      left: rawInsets.left,
      right: rawInsets.right,
      bottom: rawInsets.bottom,
    }),
    [rawInsets.top, rawInsets.left, rawInsets.right, rawInsets.bottom],
  );

  const isPortrait: boolean = useMemo(() => height >= width, [height, width]);

  const isWeb: boolean = useMemo(() => REPLACERS.isWeb && width > 768, [width]);
  const isPhone: boolean = useMemo(
    () => width <= 768 && height <= 1600,
    [width, height],
  );
  const isTablet: boolean = useMemo(
    () => width > 768 && height <= 1600,
    [width, height],
  );
  const isLargeTablet: boolean = useMemo(
    () => width > 1024 && height <= 2048,
    [width, height],
  );

  const safeAreaStyles: ViewStyle = useMemo(() => {
    return {
      flex: 1,
      width: "100%",
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
      backgroundColor: colors.background,
    };
  }, [insets, colors.background]);

  const getResponsiveValue: LayoutContextProps["getResponsiveValue"] =
    useCallback(
      (phoneValue, tabletValue, largeTabletValue, webValue) => {
        if (isLargeTablet) return largeTabletValue;
        if (isTablet) return tabletValue;
        if (isWeb) return webValue !== undefined ? webValue : largeTabletValue;
        return phoneValue;
      },
      [isTablet, isLargeTablet, isWeb],
    );

  const texts: Texts = useMemo(() => {
    const baseTextStyle: TextStyle = {
      color: colors.text,
    };

    return {
      title: {
        ...baseTextStyle,
        fontSize: getResponsiveValue(22, 26, 30),
        textAlign: "center",
        fontWeight: "bold",
      },
      subtitle: {
        ...baseTextStyle,
        fontSize: getResponsiveValue(18, 22, 26),
        textAlign: "center",
        fontWeight: "600",
      },
      h3: {
        ...baseTextStyle,
        color: colors.text,
        fontSize: getResponsiveValue(16, 18, 20),
        fontWeight: "bold",
      },
      paragraph: {
        ...baseTextStyle,
        color: colors.text,
        fontSize: getResponsiveValue(14, 16, 18),
        textAlign: "justify",
      },
      error: {
        ...baseTextStyle,
        color: colors.error,
        fontSize: getResponsiveValue(14, 16, 18),
        textAlign: "center",
        marginTop: 10,
        marginBottom: 10,
        width: "100%",
        zIndex: 10,
        fontWeight: "500",
      },
    };
  }, [colors, getResponsiveValue]);

  const staticStyles: StaticStyles = useMemo(() => {
    return {
      FAB: {
        right: 20,
        bottom: 20,
        zIndex: 10,
        position: "absolute",
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: colors.background,
      },
      flex: {
        flex: 1,
        width: "100%",
      },
      flexCenter: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
      },
      shadow: {
        elevation: 6,
        shadowColor: colors.shadow,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
      },
    };
  }, [colors]);

  const shapesStyles: ShapesStyles = useMemo(() => {
    return {
      backgroundShapeOne: {
        top: -getResponsiveValue(60, 70, 80),
        width: "75%",
        right: -getResponsiveValue(30, 40, 50),
        height: getResponsiveValue(140, 180, 200),
        opacity: 0.06,
        position: "absolute",
        transform: [{ rotate: "10deg" }],
        borderRadius: getResponsiveValue(120, 150, 180),
        backgroundColor: colors.primary,
      },
      backgroundShapeTwo: {
        left: -getResponsiveValue(30, 40, 50),
        width: "70%",
        bottom: -getResponsiveValue(70, 80, 90),
        height: getResponsiveValue(140, 180, 200),
        opacity: 0.08,
        position: "absolute",
        transform: [{ rotate: "-6deg" }],
        borderRadius: getResponsiveValue(110, 140, 170),
        backgroundColor: colors.accent,
      },
    };
  }, [colors, getResponsiveValue]);

  const scrollViewStyles: ReturnGetCommonStyles<"scrollView"> = useMemo(() => {
    return {
      scrollViewContainer: {
        flex: 1,
        width: "100%",
      },
      scrollViewContentContainer: {
        gap: getResponsiveValue(10, 12, 14, 16),
        flexGrow: 1,
        paddingVertical: getResponsiveValue(6, 8, 10, 12),
        paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
      },
    };
  }, [getResponsiveValue]);

  const getCommonStyles: GetCommonStyles = useCallback(
    (styleFinder) => {
      let styleToReturn: ViewStyle | TextStyle = {};

      switch (styleFinder) {
        case "scrollView":
          return scrollViewStyles as never;
        case "backgroundShapeOne":
        case "backgroundShapeTwo":
          styleToReturn = shapesStyles[styleFinder as keyof ShapesStyles];
          break;
        case "FAB":
        case "flex":
        case "shadow":
        case "flexCenter":
          styleToReturn = staticStyles[styleFinder as keyof StaticStyles];
          break;
        case "h3":
        case "error":
        case "title":
        case "subtitle":
        case "paragraph":
          styleToReturn = texts[styleFinder as TextStyleFinder] as never;
          break;
        case "container":
          styleToReturn = {
            gap: getResponsiveValue(10, 12, 14, 16),
            flex: 1,
            width: "100%",
            padding: getResponsiveValue(6, 10, 14, 18),
            maxWidth: 1200,
            alignSelf: "center",
            justifyContent: "flex-start",
            ...styleToReturn,
          };
          break;
        case "sectionContainer":
          styleToReturn = {
            ...staticStyles.shadow,
            padding: getResponsiveValue(12, 16, 20),
            minHeight: 100,
            borderWidth: 2,
            borderColor: colors.accent,
            borderRadius: 16,
            marginBottom: getResponsiveValue(12, 16, 20),
            backgroundColor: colors.secondary,
            ...styleToReturn,
          };
          break;
        case "divider":
          styleToReturn = {
            width: "100%",
            height: 1,
            marginVertical: getResponsiveValue(12, 16, 20),
            backgroundColor: colors.primary,
            ...styleToReturn,
          };
          break;
        case "rowSwitchText":
          styleToReturn = {
            padding: getResponsiveValue(8, 10, 12),
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            ...styleToReturn,
          };
          break;
        default:
          break;
      }

      return { [styleFinder]: styleToReturn } as never;
    },
    [
      texts,
      colors,
      staticStyles,
      shapesStyles,
      scrollViewStyles,
      getResponsiveValue,
    ],
  );

  const layoutData: LayoutContextProps = useMemo(
    () => ({
      isWeb,
      texts,
      width,
      insets,
      height,
      isPhone,
      isTablet,
      isPortrait,
      isLargeTablet,
      getCommonStyles,
      getResponsiveValue,
    }),
    [
      isWeb,
      texts,
      width,
      height,
      insets,
      isPhone,
      isTablet,
      isPortrait,
      isLargeTablet,
      getCommonStyles,
      getResponsiveValue,
    ],
  );

  return (
    <LayoutContext.Provider value={layoutData}>
      <View style={safeAreaStyles}>{children}</View>
    </LayoutContext.Provider>
  );
};

export const useResponsiveLayout = (): LayoutContextProps => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error(
      "useResponsiveLayout must be used within a LayoutProvider.",
    );
  }
  return context;
};
