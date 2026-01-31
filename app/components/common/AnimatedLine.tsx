import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { StyleSheet } from "react-native";
import React, { useEffect } from "react";

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    zIndex: 10,
  },
});

const AnimatedLine = Animated.createAnimatedComponent(Line);

const AnimatedDrawLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration?: number;
}> = ({ x1, y1, x2, y2, duration = 1000 }) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const progress = useSharedValue(length);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  useEffect(() => {
    progress.value = withTiming(0, { duration });
  }, [progress, duration]);

  return (
    <Svg width="100%" height="100%" style={styles.svg} pointerEvents="none">
      <AnimatedLine
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="black"
        strokeWidth={3}
        strokeDasharray={length}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export default AnimatedDrawLine;
