import { StyleSheet } from "react-native";
import { Helper, memoDeep, Timers, tTyped } from "@/utils";
import { ActivityIndicator, Text } from "react-native-paper";
import React, { useEffect, useState } from "react";
import Animated, { FadeOutDown, FadeInUp } from "react-native-reanimated";

type Args =
  | { LazyComponent: ReturnType<typeof React.lazy> }
  | { load: Parameters<typeof React.lazy>[0] };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mainText: {
    fontSize: 22,
    fontWeight: "bold",
  },
});

const Suspense: React.FC = memoDeep(() => {
  const [text, setText] = useState<string>(
    tTyped(
      `suspenseScreen.phrases.${Helper.Number.randInt(0, 10)}` as "common.loading",
    ),
  );

  useEffect(() => {
    const phrases = tTyped(
      "suspenseScreen.phrases",
      ...([{ returnObjects: true }] as unknown as []),
    );
    const shown: Set<number> = new Set([0]);

    let executions = 0;
    let index = 0;
    const id = Timers.setInterval(() => {
      if (shown.size === phrases.length) shown.clear();

      const startedExec = ++executions;
      while (shown.has(index) || !phrases[index]) {
        if (startedExec !== executions) return;

        index = Helper.Number.randInt(0, phrases.length);
      }

      setText(phrases[index]);
      shown.add(index);
    }, 1500);

    return () => Timers.clearInterval(id);
  }, []);

  return (
    <Animated.View
      style={styles.container}
      exiting={FadeOutDown.duration(500)}
      entering={FadeInUp.duration(500)}
    >
      <Text style={styles.mainText}>{text}</Text>

      <ActivityIndicator animating size={24} />
    </Animated.View>
  );
});

export const SuspenseComponent = (args: Args) => {
  const Screen = "load" in args ? React.lazy(args.load) : args.LazyComponent;

  const Component: React.FC<Record<string, unknown>> = (props) => {
    return (
      <React.Suspense fallback={<Suspense />}>
        <Screen {...props} />
      </React.Suspense>
    );
  };

  return Component;
};
