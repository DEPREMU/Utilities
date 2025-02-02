import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  header: {
    marginBottom: 30,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2C3E50", // Color de fondo oscuro
  },
  image: {
    height: 40,
    width: 40,
    marginLeft: 5,
    borderRadius: 20,
  },
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: "#ECF0F1", // Color de fondo claro
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 90,
  },
  checkBoxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#34495E", // Color más elegante
    borderRadius: 10,
    marginVertical: 5,
  },
  check: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#8E44AD", // Color de fondo más suave
    borderColor: "#2980B9",
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
  },
  text: {
    flex: 1,
    fontSize: 18,
    padding: 10,
    color: "#ECF0F1", // Color de texto claro
    textAlign: "left",
    backgroundColor: "#8E44AD",
    borderRadius: 5,
  },
  buttonText: {
    color: "#ECF0F1", // Texto claro
    fontSize: 16,
    textAlign: "center",
  },
  clearCacheButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ECF0F1",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2980B9", // Color de fondo elegante
    borderRadius: 10,
    marginHorizontal: 5,
  },
  showSelectedButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ECF0F1",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2980B9",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  buttonsBottom: {
    position: "absolute",
    bottom: 0,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 10,
  },
  input: {
    flex: 4 / 5,
    backgroundColor: "#8E44AD",
    color: "#ECF0F1",
    padding: 10,
    marginHorizontal: 5,
    fontSize: 18,
    textAlign: "center",
    borderColor: "#2980B9",
    borderWidth: 2,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 5,
  },
});

export { styles };
