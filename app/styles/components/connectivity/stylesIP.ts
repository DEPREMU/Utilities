import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  containerSafeAreaView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerScrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  textIP: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  containerDataIP: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textISP: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
    marginBottom: 10,
  },
  textData: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  mapContainer: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 20,
  },
  map: {
    flex: 1,
  },
});

export { styles };
