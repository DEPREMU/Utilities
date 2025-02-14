// layoutContext.js
import { Dimensions, Platform, ScaledSize } from "react-native";
import React, { createContext, useContext, useState, useEffect } from "react";

const LayoutContext = createContext({
  isTablet: false,
  isLargeTablet: false,
  isPhone: false,
  isWeb: false,
  width: 0,
  height: 0,
});

interface LayoutProviderProps {
  children: any;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };
    const subscription = Dimensions.addEventListener("change", onChange);

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isWeb: boolean = Platform.OS === "web";
  const isPhone: boolean = width <= 768 && height <= 1600;
  const isTablet: boolean = width > 768 && height <= 1600;
  const isLargeTablet: boolean = width > 1024 && height <= 2048;

  const layoutData = { isTablet, isLargeTablet, isPhone, isWeb, width, height };

  return (
    <LayoutContext.Provider value={layoutData}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useResponsiveLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error(
      "useResponsiveLayout debe ser usado dentro de un LayoutProvider"
    );
  }
  return context;
};
