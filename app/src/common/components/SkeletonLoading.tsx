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
  WithTimingConfig,
} from "react-native-reanimated";
import { memoDeep } from "@utils";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState, useEffect } from "react";

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
  duration = 1000,
}) => {
  const progress = useSharedValue<number>(-100);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value }],
  }));

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

const styles = StyleSheet.create({
  container: { position: "absolute", width: "40%", height: "100%" },
  linearGradient: { flex: 1 },
  overflowHidden: { overflow: "hidden", minHeight: 10 },
});

const SkeletonLoadingMemo = memoDeep(SkeletonLoading);

export default SkeletonLoadingMemo;
