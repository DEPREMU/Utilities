import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  main: {
    padding: 20,
    paddingTop: 40,
  },
  buttonsNavigate: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  buttonGoReduce: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  addCashContainer: {
    marginBottom: 20,
  },
  addMoneyAccountContainer: {
    marginBottom: 20,
  },
  texts: {
    fontSize: 18,
    marginBottom: 10,
  },
  textInputAddCash: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
  },
  buttonAdd: {
    backgroundColor: "#28a745", // Verde para el botón de agregar
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
});

export default styles;
