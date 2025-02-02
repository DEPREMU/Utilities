import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  buttonBack: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  balanceContainer: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  texts: {
    textAlign: "center",
    color: "white",
    fontSize: 18,
  },
  totalText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  articles: {
    marginTop: 20,
  },
  viewArticulos: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  costText: {
    fontSize: 16,
  },
  totalCostsText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  go: {
    color: "#007BFF",
  },
});

export default styles;
