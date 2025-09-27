import {
  Platform,
  TextStyle,
  ViewStyle,
  Dimensions,
  ScaledSize,
} from "react-native";
import React, {
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { useTheme } from "./ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LayoutProviderProps {
  children: ReactNode;
}

type SafeAreaContainerStyle = Record<
  "paddingTop" | "paddingBottom" | "paddingLeft" | "paddingRight",
  number
>;

type propGetStylesSafeAreaContainer =
  | [top: number, bottom: number, left: number, right: number]
  | [vertical: number, horizontal: number]
  | [all: number];

export type CommonStyles = "mainContainer" | "shadow";

export type OptionsCommonStyles = {
  fallbackValues?: propGetStylesSafeAreaContainer;
  copyInsets?: boolean;
  shadowColor?: string;
};

interface LayoutContextProps {
  isLargeTablet: boolean;
  isPlatformWeb: boolean;
  getStylesSafeAreaContainer: (
    fallbackValues?: propGetStylesSafeAreaContainer,
  ) => SafeAreaContainerStyle;
  getResponsiveValue: <T = number>(
    phoneValue: T,
    tabletValue: T,
    largeTabletValue: T,
    webValue?: T,
  ) => T;
  getCommonStyles: (
    style: CommonStyles | CommonStyles[],
    options?: OptionsCommonStyles,
  ) => ViewStyle | TextStyle;
  isPortrait: boolean;
  isTablet: boolean;
  isPhone: boolean;
  isWeb: boolean;
  width: number;
  height: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

/**
 * LayoutContext provides information about the current layout of the application,
 * including device type and dimensions.
 *
 * It allows components to access responsive layout data for better UI adaptation.
 *
 * @context
 * @returns {LayoutContextProps} The context value containing layout information.
 */
const LayoutContext = createContext<LayoutContextProps>({
  isTablet: false,
  isLargeTablet: false,
  isPlatformWeb: false,
  isPortrait: false,
  isPhone: false,
  isWeb: false,
  width: 0,
  height: 0,
  insets: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  getResponsiveValue: <T,>(
    phoneValue: T,
    _tabletValue: T,
    _largeTabletValue: T,
    _webValue?: T,
  ): T => {
    // Simulación básica para el valor por defecto
    return phoneValue; // Por defecto retorna el valor de teléfono
  },
  getStylesSafeAreaContainer: () => {
    return {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    };
  },
  getCommonStyles: () => ({}),
});

const isPlatformWeb = Platform.OS === "web";

/**
 * Provides layout-related context values to its children, such as device type and screen dimensions.
 *
 * @param {LayoutProviderProps} props - The props for the LayoutProvider component.
 * @param {React.ReactNode} props.children - The child components that will have access to the layout context.
 *
 * @const {ScaledSize} dimensions - The current window dimensions, updated on screen size changes.
 * @const {(dimensions: ScaledSize) => void} setDimensions - Setter function to update the window dimensions state.
 * @const {number} width - The current width of the window.
 * @const {number} height - The current height of the window.
 * @const {boolean} isWeb - Indicates if the platform is web.
 * @const {boolean} isPhone - Indicates if the device is considered a phone (width <= 768 and height <= 1600).
 * @const {boolean} isTablet - Indicates if the device is considered a tablet (width > 768 and height <= 1600).
 * @const {boolean} isLargeTablet - Indicates if the device is considered a large tablet (width > 1024 and height <= 2048).
 * @const {object} layoutData - The object containing all layout-related values provided to the context.
 * @const {Insets} insets - The safe area insets for the current device.
 */
export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const { colors } = useTheme();

  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  const rawInsets = useSafeAreaInsets();

  const insets = useMemo(
    () => ({
      top: rawInsets.top,
      bottom: rawInsets.bottom,
      left: rawInsets.left,
      right: rawInsets.right,
    }),
    [rawInsets.top, rawInsets.bottom, rawInsets.left, rawInsets.right],
  );

  const { width, height } = dimensions;
  const isPortrait: boolean = useMemo(() => height >= width, [height, width]);

  const isWeb: boolean = useMemo(() => isPlatformWeb && width > 768, [width]);
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

  const getStylesSafeAreaContainer = useCallback(
    (fallbackValues: propGetStylesSafeAreaContainer = [10]) => {
      let top: number, bottom: number, left: number, right: number;
      const length = fallbackValues.length;
      if (length >= 4) {
        [top, bottom, left, right] = fallbackValues.slice(0, 4);
      } else if (length >= 2) {
        const [vertical, horizontal] = fallbackValues.slice(0, 2);
        left = right = vertical;
        top = bottom = horizontal;
      } else {
        top = bottom = left = right = fallbackValues[0];
      }

      return {
        paddingTop: insets.top > top ? insets.top : top,
        paddingBottom: insets.bottom > bottom ? insets.bottom : bottom,
        paddingLeft: insets.left > left ? insets.left : left,
        paddingRight: insets.right > right ? insets.right : right,
      };
    },
    [insets],
  );

  const getCommonStyles = useCallback(
    (
      styleFinder: CommonStyles | CommonStyles[],
      options?: OptionsCommonStyles,
    ) => {
      let styleToReturn: ViewStyle | TextStyle = {};
      if (!Array.isArray(styleFinder)) {
        styleFinder = [styleFinder];
      }
      for (const style of styleFinder) {
        switch (style) {
          case "mainContainer":
            styleToReturn = {
              ...(options?.copyInsets || options?.copyInsets === undefined
                ? getStylesSafeAreaContainer(options?.fallbackValues)
                : {}),
              flex: 1,
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              ...styleToReturn,
            };
            break;
          case "shadow":
            styleToReturn = {
              shadowColor: options?.shadowColor || colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 6,
              ...styleToReturn,
            };
            break;
          default:
            break;
        }
      }

      return styleToReturn;
    },
    [colors.shadow, getStylesSafeAreaContainer],
  );

  const getResponsiveValue = useCallback(
    <T,>(
      phoneValue: T,
      tabletValue: T,
      largeTabletValue: T,
      webValue?: T,
    ): T => {
      if (isLargeTablet) return largeTabletValue;
      if (isTablet) return tabletValue;
      if (isWeb) return webValue !== undefined ? webValue : largeTabletValue;
      return phoneValue;
    },
    [isTablet, isLargeTablet, isWeb],
  );

  const layoutData: LayoutContextProps = {
    isWeb,
    insets,
    isPhone,
    isPortrait,
    isLargeTablet,
    getCommonStyles,
    getResponsiveValue,
    getStylesSafeAreaContainer,
    isPlatformWeb,
    isTablet,
    height,
    width,
  };

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };
    const subscription = Dimensions.addEventListener("change", onChange);

    return () => subscription?.remove();
  }, []);

  return (
    <LayoutContext.Provider value={layoutData}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Custom hook to access the layout context values.
 *
 * @returns {LayoutContextProps} The layout context values.
 *
 * @throws {Error} If used outside of a LayoutProvider.
 */
export const useResponsiveLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error(
      "useResponsiveLayout debe ser usado dentro de un LayoutProvider",
    );
  }
  return context;
};
