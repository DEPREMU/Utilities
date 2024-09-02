import { StyleSheet } from "react-native";
import { width_4 } from "../components/globalVariables";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 30,
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonShowSelected: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    top: 35,
    left: 0,
    padding: 10,
    borderRadius: 10,
    maxWidth: width_4,
    backgroundColor: "gray",
    zIndex: 2,
  },
  scrollView: {
    flex: 1,
  },
});
