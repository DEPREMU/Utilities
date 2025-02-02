import { StyleSheet } from "react-native";
import { height, width } from "../../utils/globalVariables/constants";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    height: height,
    paddingTop: 20,
  },
  daysContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    marginVertical: 10,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    backgroundColor: "#007BFF",
  },
  containerScrollView: {
    flex: 1,
  },
  formNewProduct: {
    width: width - 40,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  textInput: {
    width: "100%",
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "#fefefe",
    fontSize: 16, // Aumentar tamaño de fuente para mejor legibilidad
  },
  buttonNewProduct: {
    width: "100%",
    padding: 15,
    marginVertical: 10,
    backgroundColor: "#007BFF",
    alignItems: "center",
    borderRadius: 5,
    elevation: 2, // Sombra más sutil
  },
  textButtons: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    marginVertical: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "#fefefe",
  },
  rowDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    elevation: 1,
  },
  textsDays: {
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    fontWeight: "500",
  },
  textTimePicker: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "600",
  },
  textTitle: {
    fontSize: 20,
  },
  textType: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});

export default styles;
