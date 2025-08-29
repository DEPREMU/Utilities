import {
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  StyleSheet,
  ImageStyle,
  LayoutRectangle,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  withRepeat,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { areEqualChildren, stringifyData } from "@utils";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useState } from "react";

interface SkeletonLoadingProps {
  showChildren: boolean;
  style?: StyleProp<ViewStyle | TextStyle | ImageStyle>;
  children?: React.ReactNode;
  duration?: number;
}

const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  style,
  children,
  showChildren,
  duration = 750,
}) => {
  const { styles } = useStylesSkeletonLoading();

  const progress = useSharedValue<number>(-200);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  const animatedStyle = useAnimatedStyle(() => {
    const style = {
      transform: [{ translateX: progress.value }],
    };

    return style;
  });

  const changeLayout = useCallback((event: LayoutChangeEvent) => {
    const layoutLocal = event.nativeEvent.layout;
    setLayout(layoutLocal);
  }, []);

  useEffect(() => {
    if (!layout) return;

    const options = {
      duration,
      easing: Easing.linear,
    };

    const getWidth = () => {
      if (layout.width > 0) return layout.width;
      return 200;
    };

    const startPosition = -getWidth() * 0.6;
    const endPosition = getWidth() * 1.6;

    progress.value = startPosition;
    progress.value = withRepeat(withTiming(endPosition, options), -1);
  }, [layout, progress, duration]);

  useEffect(() => {
    if (!showChildren || !progress) return;

    progress.value = 0;
  }, [showChildren, progress]);

  if (showChildren) return <>{children}</>;

  if (!layout) return <View style={styles.fill} onLayout={changeLayout} />;

  return (
    <View style={[styles.overflowHidden, style]}>
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

const useStylesSkeletonLoading = () => {
  const styles = StyleSheet.create({
    container: {
      position: "absolute",
      width: "40%",
      height: "100%",
    },
    linearGradient: {
      flex: 1,
    },
    overflowHidden: {
      overflow: "hidden",
      minHeight: 10,
    },
    fill: {
      width: "100%",
      height: "100%",
    },
  });

  return {
    styles,
  };
};

const SkeletonLoadingMemo = memo(SkeletonLoading, (prevProps, nextProps) => {
  const areEqual = (a: unknown, b: unknown) =>
    stringifyData(a) === stringifyData(b);

  const areEquals =
    areEqual(prevProps.style, nextProps.style) &&
    areEqual(prevProps.duration, nextProps.duration) &&
    areEqual(prevProps.showChildren, nextProps.showChildren) &&
    areEqualChildren(prevProps.children, nextProps.children);

  return areEquals;
});

export default SkeletonLoadingMemo;
