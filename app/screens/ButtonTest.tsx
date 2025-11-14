/* eslint-disable react-native/no-inline-styles */
import {
  View,
  Pressable,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import Animated, {
  withTiming,
  withRepeat,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Text } from "react-native-paper";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface AnimatedCircleProps {
  x: number;
  y: number;
  pressOut?: boolean;
  timeFromPressIn: number;
}

type Touch = {
  x: number;
  y: number;
  key: string;
  pressOut?: boolean;
  timeFromPressIn: number;
};

const AnimatedCircle: React.FC<AnimatedCircleProps> = memo(
  ({ x, y, pressOut, timeFromPressIn }) => {
    const scale = useSharedValue(pressOut ? 50 : 0);

    useEffect(() => {
      if (!pressOut) {
        scale.value = withTiming(50, { duration: 1000 });
        return;
      }

      const id = setTimeout(
        () => (scale.value = withTiming(0, { duration: 1000 })),
        timeFromPressIn + 1000 < Date.now() ? 1 : 750,
      );
      return () => clearTimeout(id);
    }, [scale, pressOut, timeFromPressIn]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          {
            width: 10,
            height: 10,
            borderRadius: 50,
            position: "absolute",
            opacity: 0.3,
            backgroundColor: "#00FFFF",
            shadowColor: "#00FF00",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
            elevation: 10,
            left: x,
            top: y,
          },
          animatedStyle,
        ]}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.x === nextProps.x &&
      prevProps.y === nextProps.y &&
      prevProps.pressOut === nextProps.pressOut &&
      prevProps.timeFromPressIn === nextProps.timeFromPressIn
    );
  },
);

const ButtonWithLiquidEffectAndAnimatedCircles = () => {
  const pressRef = useRef<View>(null);
  const lastPress = useRef<string[] | null>([]);
  const translateY = useSharedValue<number>(120);
  const [touches, setTouches] = useState<Touch[]>([]);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    pressRef.current?.measure((_, __, ___, ____, pageX, pageY) => {
      const touchX = event.nativeEvent.pageX - pageX;
      const touchY = event.nativeEvent.pageY - pageY;

      const key = Date.now().toString() + Math.random().toString();
      lastPress.current?.push(key);

      setTouches((prev) => [
        ...prev,
        { key, x: touchX - 5, y: touchY - 5, timeFromPressIn: Date.now() },
      ]);
    });
  }, []);

  const handlePressOut = useCallback(() => {
    if (!pressRef.current) return;

    setTouches((prev) => {
      if (!lastPress.current) return prev;

      const lastTouch = prev.find((touch) =>
        lastPress.current?.includes(touch.key),
      );
      if (!lastTouch) return prev;

      const filteredTouches = prev.filter(
        (touch) => !lastPress.current?.includes(touch.key),
      );
      filteredTouches.push({ ...lastTouch, pressOut: true });

      lastPress.current = lastPress.current.filter(
        (key) => key !== lastTouch.key,
      );

      return filteredTouches;
    });
  }, []);

  // Cleanup lastPress on unmount
  useEffect(
    () => () => {
      lastPress.current = null;
    },
    [],
  );

  useEffect(() => {
    translateY.value = withRepeat(withTiming(60, { duration: 4000 }), -1, true);
  }, [translateY]);

  return (
    <Pressable style={styles.container} pointerEvents="box-none">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        ref={pressRef}
        style={{
          padding: 10,
          width: 200,
          position: "relative",
          cursor: "auto",
          overflow: "hidden",
          height: 100,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <>
          <BlurView intensity={20} style={styles.blurBox}>
            <LinearGradient
              colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0.2)"]}
              style={styles.blurBox}
            >
              {touches.map((touch) => (
                <AnimatedCircle
                  key={touch.key}
                  x={touch.x}
                  y={touch.y}
                  pressOut={touch.pressOut}
                  timeFromPressIn={touch.timeFromPressIn}
                />
              ))}
            </LinearGradient>
          </BlurView>
          <Text>Liquid Effect</Text>
        </>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    cursor: "auto",
  },
  blurBox: {
    width: 200,
    height: 100,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    position: "absolute",
  },
});

export default ButtonWithLiquidEffectAndAnimatedCircles;
