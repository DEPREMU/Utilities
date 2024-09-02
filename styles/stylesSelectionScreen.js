import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  header: {
    marginBottom: 30,
    height: 50,
    justifyContent: "center",
  },
  image: {
    height: 40,
    width: 40,
    left: 5,
    borderRadius: 50,
  },
  container: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 30,
    backgroundColor: "gray",
    boxSizing: "border-box",
  },
  scrollContainer: {
    flex: 1,
    boxSizing: "border-box",
  },
  checkBoxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "gray",
    boxSizing: "border-box",
  },
  check: {
    boxSizing: "border-box",
    flex: 1 / 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "purple",
    borderColor: "black",
    borderStyle: "solid",
    borderWidth: 5,
  },
  text: {
    flex: 1 / 2,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 18,
    padding: 10,
    backgroundColor: "purple",
    textAlign: "left",
    color: "white",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
  },
  clearCacheButton: {
    flex: 1 / 2,
    borderWidth: 5,
    boxSizing: "border-box",
    borderColor: "white",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
  },
  showSelectedButton: {
    flex: 1 / 2,
    borderWidth: 5,
    borderColor: "white",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
  },
  buttonsBottom: {
    position: "absolute",
    bottom: 0,
    flex: 1,
    flexDirection: "row",
  },
});

export { styles };
