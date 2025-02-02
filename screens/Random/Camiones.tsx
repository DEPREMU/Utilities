import {
  calculateTime,
  insertInTable,
} from "../../utils/globalVariables/utils";
import {
  View,
  Text,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
  BackHandler,
} from "react-native";
import EachBus from "../../components/Random/EachBus";
import { styles } from "../../styles/random/stylesCamiones";
import { CheckBox } from "react-native-elements";
import { getAllData } from "../../utils/database/dataBaseConnection";
import { useFocusEffect } from "@react-navigation/native";
import { useEffect, useState } from "react";

interface CamionesProps {
  navigation: any;
}

interface tableCamiones {
  id: number;
  camion: string;
  date: string;
}

const Camiones: React.FC<CamionesProps> = ({ navigation }) => {
  const tableNameCamiones = "Camiones";
  const [vistas, setVistas] = useState<boolean>(true);
  const [laderas, setLaderas] = useState<boolean>(false);
  const [camiones, setCamiones] = useState<string | null>(null);
  const [boolLoadCamiones, setBoolLoadCamiones] = useState<boolean>(false);
  const [boolLoadAllCamiones, setBoolLoadAllCamiones] =
    useState<boolean>(false);
  const [minutesSelected, setMinutesSelected] = useState<number>(30);

  const changeCamion = (vistas: boolean) => {
    setLaderas(vistas ? false : true);
    setVistas(vistas ? true : false);
  };

  const addCamion = async () => {
    let camion = vistas ? "Vistas" : laderas ? "Laderas" : null;
    if (!camion) return;
    const date = new Date().toString();

    const error = await insertInTable(tableNameCamiones, {
      camion: camion,
      date: date,
    });
    if (error)
      Alert.alert("Error", `Error while inserting in the table => ${error}`);
    setLaderas(false);
    setVistas(false);
  };

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to go back to the menu?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  useEffect(() => {
    const loadCamiones = async () => {
      const { data } = await getAllData(tableNameCamiones);

      if (!data) return;

      if (data && boolLoadAllCamiones) {
        setCamiones(JSON.stringify(data));
        return;
      }
      const camiones: any[] = [];

      data.forEach((value: tableCamiones) => {
        const time = calculateTime(value.date);
        if (time <= minutesSelected)
          camiones.push({
            id: value.id,
            camion: value.camion,
            date: value.date,
          });
      });
      if (camiones.length > 0) setCamiones(JSON.stringify(camiones));
      else
        setCamiones(
          JSON.stringify([
            {
              id: 1,
              camion: "No hay camiones",
              date: new Date().toString(),
            },
          ])
        );
    };
    if (boolLoadCamiones || boolLoadAllCamiones) loadCamiones();
  }, [boolLoadCamiones, boolLoadAllCamiones]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.textTitle}>Camiones</Text>

        <View style={styles.formContainer}>
          <Text style={styles.textTitle}>Add camion</Text>

          <TextInput style={styles.textInput} placeholder="Minutes" />

          <Pressable
            style={({ pressed }) => [
              styles.buttonSubmit,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => addCamion()}
          >
            <Text style={styles.textsButtons}>Submit</Text>
          </Pressable>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.bussesButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.checkBoxContainer,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              onPress={() => changeCamion(true)}
            >
              <CheckBox
                checked={vistas}
                onPress={() => changeCamion(true)}
                containerStyle={styles.checkBox}
              />

              <Text style={styles.checkBoxText}>Vistas</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.checkBoxContainer,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              onPress={() => changeCamion(false)}
            >
              <CheckBox
                checked={laderas}
                onPress={() => changeCamion(false)}
                containerStyle={styles.checkBox}
              />

              <Text style={styles.checkBoxText}>Laderas</Text>
            </Pressable>
          </View>

          <View style={styles.buttonsShow}>
            <Pressable
              style={({ pressed }) => [
                styles.buttonLoadCamiones,
                {
                  opacity: pressed ? 0.5 : 1,
                  backgroundColor: boolLoadCamiones ? "#007BFF" : "#FF0000",
                },
              ]}
              onPress={() => {
                setBoolLoadCamiones((prev) => !prev);
                boolLoadAllCamiones
                  ? setBoolLoadAllCamiones((prev) => !prev)
                  : null;
              }}
            >
              <Text style={styles.textsButtons}>Load Camiones</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.buttonLoadCamiones,
                {
                  opacity: pressed ? 0.5 : 1,
                  backgroundColor: boolLoadAllCamiones ? "#007BFF" : "#FF0000",
                },
              ]}
              onPress={() => {
                boolLoadCamiones ? setBoolLoadCamiones((prev) => !prev) : null;
                setBoolLoadAllCamiones((prev) => !prev);
              }}
            >
              <Text style={styles.textsButtons}>Load All Camiones</Text>
            </Pressable>
          </View>
          {camiones != null && (boolLoadCamiones || boolLoadAllCamiones) && (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
            >
              <EachBus
                vistas={vistas}
                laderas={laderas}
                camiones={JSON.parse(camiones)}
                boolLoadAllCamiones={boolLoadAllCamiones}
              />
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Camiones;
