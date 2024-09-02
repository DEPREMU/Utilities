import { StyleSheet } from "react-native"; 
import { width_3, width_2, width_6 } from "../components/globalVariables";

export const style = StyleSheet.create({
  back: {
    flex: 1,
    backgroundColor: "purple",
  },
  backScroll: {
    flex: 1,
    backgroundColor: "purple",
  },
  settings: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "gray",
    width: width_3,
    borderRadius: 10,
    padding: 10,
    marginTop: 20,
  },
  menu: {
    backgroundColor: "violet",
    height: 360,
    width: width_2,
    alignItems: "center",
    borderRadius: 10,
    marginLeft: 10,
  },
  backButton: {
    position: "relative",
    marginTop: 40,
    borderRadius: 10,
    marginLeft: 5,
    width: width_6,
    height: 50,
    backgroundColor: "violet",
    justifyContent: "center",
    alignItems: "center",
  },
});
