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
  containerProduct: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  textName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  textPrice: {
    fontSize: 16,
    color: "#666",
  },
  textDescription: {
    fontSize: 16,
    marginVertical: 5,
  },
  formNewProduct: {
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
    borderRadius: 5,
  },
  buttonNewProduct: {
    width: width - 40,
    padding: 10,
    margin: 5,
    backgroundColor: "#007BFF",
    alignItems: "center",
    borderRadius: 5,
  },
  buttonToggleVisibility: {
    padding: 10,
    margin: 5,
    backgroundColor: "#ccc",
    alignItems: "center",
    borderRadius: 5,
  },
  textButtons: {
    fontSize: 16,
    color: "white",
  },
  buttonToggleBuying: {
    width: width - 40,
    padding: 10,
    margin: 5,
    alignItems: "center",
    borderRadius: 5,
  },
  textType: {
    fontSize: 16,
    marginVertical: 5,
  },
});

export default styles;
