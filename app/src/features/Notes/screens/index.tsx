import Notes from "@screens/Notes/screens/Notes";
import NotesViewer from "@screens/Notes/screens/NotesViewer";
import { memoDeep } from "@utils";
import NotesSettings from "@screens/Notes/screens/NotesSettings";
import { StyleSheet } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { NotesProvider } from "@screens/Notes/context/NotesContext";
import { BottomNavigation } from "react-native-paper";
import useStylesBottomNavigator from "@/common/components/BottomNavigator/styles/useStylesBottomNavigator";
import { useMemo, useRef, useState } from "react";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

const stylesInternal = StyleSheet.create({
  sceneContainer: {
    flex: 1,
  },
});

const createRoutesNavigator = (t: ReturnType<typeof useLanguage>["t"]) => [
  {
    key: "NotesList",
    title: t("notes.listTab"),
    focusedIcon: "note",
  },
  {
    key: "NotesViewer",
    title: t("notes.viewerTab"),
    focusedIcon: "file-document-edit",
  },
  {
    key: "NotesSettings",
    title: t("notes.settingsTab"),
    focusedIcon: "cog",
  },
];

const NotesNavigator = () => {
  const { t } = useLanguage();
  const { colors } = useStylesBottomNavigator();

  const [index, setIndex] = useState<number>(0);

  const routesNavigator = useMemo(() => createRoutesNavigator(t), [t]);

  const handleSelectedNoteRef = useRef(() => {
    setIndex(1);
  });

  const handleBackToListRef = useRef(() => {
    setIndex(0);
  });

  const renderSceneRef = useRef(({ route }: { route: { key: string } }) => {
    if (route.key === "NotesList")
      return (
        <Animated.View
          key={route.key}
          style={stylesInternal.sceneContainer}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
        >
          <Notes onSelectedNote={handleSelectedNoteRef.current} />
        </Animated.View>
      );
    if (route.key === "NotesViewer")
      return (
        <Animated.View
          key={route.key}
          style={stylesInternal.sceneContainer}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
        >
          <NotesViewer onBackToList={handleBackToListRef.current} />
        </Animated.View>
      );
    return (
      <Animated.View
        key={route.key}
        style={stylesInternal.sceneContainer}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(140)}
      >
        <NotesSettings />
      </Animated.View>
    );
  });

  return (
    <NotesProvider>
      <BottomNavigation
        shifting
        sceneAnimationEnabled
        barStyle={{ backgroundColor: colors.primary }}
        renderScene={renderSceneRef.current}
        activeColor={colors.background}
        onIndexChange={setIndex}
        inactiveColor={colors.text}
        navigationState={{ index, routes: routesNavigator }}
      />
    </NotesProvider>
  );
};

export default memoDeep(NotesNavigator);
