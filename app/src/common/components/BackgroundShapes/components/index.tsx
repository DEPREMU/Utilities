import { View } from "react-native";
import { memoDeep } from "@utils";
import { useStylesBackgroundShapes } from "../styles/useStylesBackgroundShapes";

const BackgroundShapes = () => {
  const { styles } = useStylesBackgroundShapes();

  return (
    <>
      <View style={styles.backgroundShapeOne} pointerEvents="none" />
      <View style={styles.backgroundShapeTwo} pointerEvents="none" />
    </>
  );
};

export default memoDeep(BackgroundShapes);
