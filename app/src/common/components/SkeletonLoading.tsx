import {
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
  ImageStyle,
  LayoutRectangle,
  LayoutChangeEvent,
  DimensionValue,
} from "react-native";
import Animated, {
  Easing,
  withRepeat,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  WithTimingConfig,
} from "react-native-reanimated";
import { memoDeep } from "@utils";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState, useEffect, useMemo } from "react";

interface SkeletonLoadingProps {
  showChildren: boolean;
  style?: StyleProp<ViewStyle | TextStyle | ImageStyle>;
  width?: DimensionValue;
  height?: DimensionValue;
  children?: React.ReactNode;
  duration?: number;
}

const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  style,
  width,
  height,
  children,
  showChildren,
  duration = 1000,
}) => {
  const progress = useSharedValue<number>(-(height || 100));
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value }],
  }));

  const dimensionStyle = useMemo(() => {
    const dimensionStyles: StyleProp<ViewStyle> = {};
    if (width) dimensionStyles.width = width;
    if (height) dimensionStyles.height = height;
    return dimensionStyles;
  }, [width, height]);

  const changeLayoutRef = useRef((event: LayoutChangeEvent) => {
    const layoutLocal = event.nativeEvent.layout;
    setLayout(layoutLocal);
  });

  useEffect(() => {
    if (showChildren) {
      progress.value = 0;
      return;
    }

    if (!layout) return;

    const options: WithTimingConfig = {
      duration,
      easing: Easing.linear,
    };

    if (layout.width > 200) {
      progress.value = withRepeat(withTiming(layout.width + 50, options), -1);
      return;
    }

    progress.value = withRepeat(withTiming(200, options), -1);
  }, [layout, progress, duration, showChildren]);

  if (showChildren) return <React.Fragment>{children}</React.Fragment>;

  if (!layout) return <View style={style} onLayout={changeLayoutRef.current} />;

  return (
    <View style={[styles.overflowHidden, dimensionStyle, style]}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.2)",
            "rgba(255,255,255,0.5)",
            "rgba(255,255,255,0.2)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.linearGradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: "absolute", width: "40%", height: "100%" },
  linearGradient: { flex: 1 },
  overflowHidden: { overflow: "hidden", minHeight: 10 },
});

export default memoDeep(SkeletonLoading);
