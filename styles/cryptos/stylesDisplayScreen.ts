import { StyleSheet } from "react-native";

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
    maxWidth: "25%",
    backgroundColor: "gray",
    zIndex: 2,
  },
  scrollView: {
    flex: 1,
  },
  contentScrollView: {
    padding: 20,
  },
});
