import Animated, {
  FadeInUp,
  withSpring,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  ASSETS,
  tTyped,
  APP_NAME,
  deviceInfo,
  waitForTime,
  sessionManager,
  recorderManager,
  clipboardManager,
  storageManagement,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  notificationsManager,
} from "@utils";
import { ProgressBar } from "react-native-paper";
import { useStylesLoadingScreen } from "@screens/Loading/styles";
import { View, useWindowDimensions } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";

type LoadingScreenProps = {
  setIsLoading: (value: boolean) => void;
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ setIsLoading }) => {
  const { styles } = useStylesLoadingScreen();
  const { height, width } = useWindowDimensions();

  const [loaded, setLoaded] = useState<number>(0);

  const idTimeout = useRef<number | null>(null);

  const functions = useMemo(
    () => [
      deviceInfo.waitUntilLoaded,
      sessionManager.waitUntilLoaded,
      recorderManager.waitUntilLoaded,
      clipboardManager.waitUntilLoaded,
      storageManagement.waitUntilLoaded,
      notificationsManager.waitUntilLoaded,
    ],
    [],
  );

  const initValues = useMemo(
    () => ({
      yValueMain: height * 2.3,
      xValueImage: -width,
      xValueWelcome: -width,
      xValueAppName: width,
      yValueProgressBar: height * 2.3,
    }),
    [width, height],
  );

  const yValueMain = useSharedValue(initValues.yValueMain);
  const animatedStyleMain = useAnimatedStyle(() => ({
    transform: [{ translateY: yValueMain.value }],
  }));

  const xValueImage = useSharedValue(initValues.xValueImage);
  const animatedStyleImage = useAnimatedStyle(() => ({
    transform: [{ translateX: xValueImage.value }],
  }));

  const xValueWelcome = useSharedValue(initValues.xValueWelcome);
  const animatedStyleWelcome = useAnimatedStyle(() => ({
    transform: [{ translateX: xValueWelcome.value }],
  }));

  const xValueAppName = useSharedValue(initValues.xValueAppName);
  const animatedStyleAppName = useAnimatedStyle(() => ({
    transform: [{ translateX: xValueAppName.value }],
  }));

  const yValueProgressBar = useSharedValue(initValues.yValueProgressBar);
  const animatedStyleProgressBar = useAnimatedStyle(() => ({
    transform: [{ translateY: yValueProgressBar.value }],
  }));

  useEffect(() => {
    const animation = (reverse?: boolean, onFinished?: () => void) => {
      if (reverse) {
        xValueAppName.value = withSpring(initValues.xValueAppName, {
          duration: 500,
        });

        yValueProgressBar.value = withSpring(initValues.yValueProgressBar, {
          duration: 400,
        });

        setTimeoutPolyfill(() => {
          xValueWelcome.value = withSpring(initValues.xValueWelcome, {
            duration: 400,
          });

          setTimeoutPolyfill(() => {
            xValueImage.value = withSpring(initValues.xValueImage, {
              duration: 500,
            });

            setTimeoutPolyfill(() => {
              yValueMain.value = withSpring(initValues.yValueMain, {
                duration: 500,
              });

              if (onFinished) setTimeoutPolyfill(onFinished, 500);
            }, 350);
          }, 200);
        }, 100);
      } else {
        yValueMain.value = withSpring(0, { duration: 500 });

        setTimeoutPolyfill(() => {
          xValueImage.value = withSpring(0, { duration: 500 });

          setTimeoutPolyfill(() => {
            xValueWelcome.value = withSpring(0, { duration: 400 });

            setTimeoutPolyfill(() => {
              xValueAppName.value = withSpring(0, { duration: 500 });
              yValueProgressBar.value = withSpring(0, { duration: 400 });

              if (onFinished) setTimeoutPolyfill(onFinished, 500);
            }, 100);
          }, 200);
        }, 500);
      }
    };
    animation();

    const startTime = Date.now();
    const finished = async () => {
      const onFinished = async () => {
        await waitForTime(500);
        animation(true, () => setIsLoading(false));
      };

      if (idTimeout.current) clearTimeoutPolyfill(idTimeout.current);
      const remainingTime = 5000 - Date.now() - startTime;
      if (remainingTime <= 0) {
        onFinished();
        return;
      }

      idTimeout.current = setTimeoutPolyfill(onFinished, remainingTime);
    };

    const executeWaiting = async (fun: () => Promise<void>) => {
      await fun();
      setLoaded((prev) => {
        const newValue = prev + 1;
        if (newValue >= functions.length)
          waitForTime(Math.random() * 1000).then(finished);
        return newValue;
      });
    };

    functions.forEach((fun) => executeWaiting(fun));
  }, [
    functions,
    yValueMain,
    initValues,
    xValueImage,
    setIsLoading,
    xValueWelcome,
    xValueAppName,
    yValueProgressBar,
  ]);

  return (
    <Animated.View
      style={styles.container}
      exiting={FadeOutDown}
      entering={FadeInUp}
    >
      <Animated.View style={[styles.main, animatedStyleMain]}>
        <Animated.Image
          source={ASSETS.icon}
          style={[styles.image, animatedStyleImage]}
        />

        <View style={styles.containerText}>
          <Animated.Text style={[styles.text, animatedStyleWelcome]}>
            {tTyped("loadingScreen.welcomeTo")}
          </Animated.Text>

          <Animated.Text style={[styles.text, animatedStyleAppName]}>
            {APP_NAME}
          </Animated.Text>
        </View>

        <Animated.View
          style={[styles.containerProgressBar, animatedStyleProgressBar]}
        >
          <ProgressBar progress={loaded / functions.length} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

export default LoadingScreen;
