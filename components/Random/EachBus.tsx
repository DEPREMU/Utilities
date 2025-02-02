import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface EachBusProps {
  camiones: any[];
  vistas: boolean;
  laderas: boolean;
  boolLoadAllCamiones: boolean;
}

interface tableCamion {
  id: number;
  camion: string;
  date: string;
}

const EachBus: React.FC<EachBusProps> = ({
  camiones,
  vistas,
  laderas,
  boolLoadAllCamiones,
}) => {
  if (vistas && !boolLoadAllCamiones)
    camiones = camiones.filter((camion) => camion.camion == "Vistas");
  else if (laderas && !boolLoadAllCamiones)
    camiones = camiones.filter((camion) => camion.camion == "Laderas");

  return (
    <>
      {camiones.map((camion: tableCamion) => (
        <View key={camion.id} style={styles.camion}>
          <Text style={styles.camionText}>{camion.camion}</Text>
          <Text style={styles.camionDate}>
            {new Date(camion.date).toLocaleString()}
          </Text>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  camion: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },
  camionText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  camionDate: {
    fontSize: 14,
  },
});

export default EachBus;
