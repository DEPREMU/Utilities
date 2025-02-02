import { StyleSheet } from "react-native";
import { width } from "../../utils/globalVariables/constants";

const stylesChatsGPT = StyleSheet.create({
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
  containerChat: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  textType: {
    fontSize: 20,
    fontWeight: "bold",
  },
  textDescription: {
    fontSize: 16,
  },
  formNewChat: {
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
  buttonNewChat: {
    width: width - 40,
    padding: 10,
    margin: 5,
    backgroundColor: "#ccc",
    alignItems: "center",
  },
  textButtons: {
    fontSize: 16,
  },
  buttonNotShowChat: {
    width: width - 40,
    padding: 10,
    margin: 5,
    backgroundColor: "#ccc",
    alignItems: "center",
  },
});

export default stylesChatsGPT;
