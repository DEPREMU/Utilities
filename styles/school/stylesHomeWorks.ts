import { width } from "../../utils/globalVariables/constants";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  containerScrollView: {
    flex: 1,
  },
  containerHomework: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  textClass: {
    fontSize: 20,
    fontWeight: "bold",
  },
  textDate: {
    fontSize: 16,
    color: "#666",
  },
  textDescription: {
    fontSize: 16,
  },
  textDeadline: {
    fontSize: 14,
    color: "red",
  },
  formNewHomework: {
    width: width,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  textInput: {
    width: width - 40,
    padding: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  buttonNewHomework: {
    width: width - 40,
    padding: 10,
    margin: 5,
    backgroundColor: "#007BFF",
    alignItems: "center",
  },
  buttonToggleVisibility: {
    padding: 10,
    margin: 5,
    backgroundColor: "#ccc",
    alignItems: "center",
  },
  textButtons: {
    fontSize: 16,
    color: "white",
  },
  buttonToggleDone: {
    width: width - 40,
    padding: 10,
    margin: 5,
    alignItems: "center",
  },
  contentScrollView: {
    padding: 20,
  },
  textType: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
});

export default styles;
