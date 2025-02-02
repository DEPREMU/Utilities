import { StyleSheet } from "react-native";
const stylesTranslator = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  textTranslate: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonTranslate: {
    backgroundColor: "#007bff",
    borderRadius: 5,
    padding: 15,
    marginVertical: 10,
    alignItems: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 15,
    width: "90%",
    marginVertical: 10,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
    width: "100%",
    marginVertical: 10,
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: "bold",
    color: "#007bff",
  },
  translateText: {
    fontSize: 18,
    marginBottom: 10,
    color: "#555",
  },
  textTranslated: {
    fontSize: 18,
    marginBottom: 10,
    color: "#007bff",
    fontWeight: "bold",
  },
});

export default stylesTranslator;
