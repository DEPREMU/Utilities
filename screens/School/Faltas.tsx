import AddClass from "./AddClass";
import ModifyTime from "./ModifyTime";
import { height, width } from "../../utils/globalVariables/constants";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  PanResponder,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import {
  SharedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Loading from "../../components/common/Loading";
import { useFocusEffect } from "@react-navigation/native";

interface FaltasProps {
  navigation: any;
}

const Faltas: React.FC<FaltasProps> = ({ navigation }) => {
  const maxPages = 2;

  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderPage, setRenderPage] = useState<number>(1);

  const animationsPages: SharedValue<number>[] = [
    useSharedValue(height * 2),
    useSharedValue(-width),
    useSharedValue(-width),
    useSharedValue(-height * 1.5),
  ];

  const next = () => {
    setPage((prev) => {
      const value = prev < maxPages ? prev + 1 : prev;
      renderPageFunc(value);
      return value;
    });
  };

  const less = () => {
    setPage((prev) => {
      const value = prev > 1 ? prev - 1 : prev;
      animationsPages.forEach((page) => {});
      renderPageFunc(value);
      return value;
    });
  };

  const renderPageFunc = (value: number) => {
    setTimeout(() => {
      setRenderPage(value);
    }, 1000);
  };

  const max = () => setPage(maxPages);

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 80,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 20) less();
        else if (gestureState.dx < -20) next();
        else if (gestureState.dy > 100 || gestureState.dy < -100) max();
      },
    })
  ).current;

  useEffect(() => {
    animationsPages.forEach((animation, index) => {
      animation.value = withSpring(
        index + 1 === page
          ? 0
          : index === 0
          ? -height * 1.3
          : index + 1 < page
          ? -width
          : height * 2,
        {
          damping: 15,
          stiffness: 50,
        }
      );
    });

    if (loading)
      setTimeout(() => {
        setLoading(false);
      }, 1000);
  }, [page]);

  if (loading) return <Loading boolActivityIndicator />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {(renderPage == 1 || page == 1) && (
        <AddClass
          boolLoaded={renderPage == 1 && page == 1}
          panResponder={panResponder}
          animationsPages={animationsPages}
        />
      )}
      {(renderPage == 2 || page == 2) && (
        <ModifyTime
          boolLoaded={renderPage == 1 && page == 1}
          panResponder={panResponder}
          animationsPages={animationsPages}
        />
      )}
    </SafeAreaView>
  );
};

export default Faltas;
