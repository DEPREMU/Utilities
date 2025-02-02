import {
  View,
  Text,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  BackHandler,
} from "react-native";
import {
  getAllData,
  insertData,
  updateColumns,
} from "../../utils/database/dataBaseConnection";
import styles from "../../styles/school/stylesHomeWorks";
import EachHomework from "../../components/School/EachHomeWork";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import React, { useEffect, useState } from "react";

interface HomeworksProps {
  navigation: any;
}

const Homeworks: React.FC<HomeworksProps> = ({ navigation }) => {
  const tableName = "HomeWorks";
  const [done, setDone] = useState<boolean>(false);
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [className, setClassName] = useState<string>("");
  const [homeworks, setHomeworks] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [boolShowHidden, setBoolShowHidden] = useState<boolean>(false);
  const [isDatePickerVisible, setIsDatePickerVisibility] =
    useState<boolean>(false);

  const addHomework = async () => {
    const dateAdded: string = new Date().toString();
    const { success, error } = await insertData(tableName, {
      dateAdded: dateAdded,
      deadline: deadline.toString(),
      class: className,
      done: done,
      description: description,
    });

    if (success) {
      const { data: homeworks } = await getAllData(tableName);
      if (homeworks) setHomeworks(JSON.stringify(homeworks.reverse() || {}));
      setDescription("");
      setDeadline(new Date());
      setClassName("");
      setDone(false);
    } else {
      console.error(error);
    }
  };

  const toggleHomeworkDone = async (id: number, currentStatus: boolean) => {
    await updateColumns(tableName, { done: !currentStatus }, "id", id);
    const { data: homeworks } = await getAllData(tableName);
    if (homeworks) setHomeworks(JSON.stringify(homeworks.reverse() || {}));
  };

  useEffect(() => {
    const getHomeworks = async () => {
      const { data: homeworks } = await getAllData(tableName);
      if (homeworks) setHomeworks(JSON.stringify(homeworks.reverse() || {}));
    };

    getHomeworks();
  }, []);

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

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonToggleVisibility,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        onPress={() => setBoolShowHidden((prev) => !prev)}
      >
        <Text style={[styles.textButtons, { color: "black" }]}>
          {boolShowHidden ? "Hide all hidden homeworks" : "Show all homeworks"}
        </Text>
      </Pressable>
      <View style={styles.formNewHomework}>
        <Text style={styles.textType}>New Homework</Text>

        <TextInput
          style={styles.textInput}
          onChangeText={setClassName}
          value={className}
          placeholder="Class Name"
        />
        <Pressable onPress={() => setIsDatePickerVisibility(true)}>
          <TextInput
            style={styles.textInput}
            value={deadline.toLocaleString()}
            placeholder="Select Deadline"
            editable={false}
          />
        </Pressable>

        <TextInput
          style={styles.textInput}
          onChangeText={setDescription}
          value={description}
          placeholder="Description"
        />

        <Pressable
          style={({ pressed }) => [
            styles.buttonNewHomework,
            {
              opacity:
                pressed && className != "" && description != "" ? 0.5 : 1,
              backgroundColor:
                className != "" && description != "" ? "#007BFF" : "#ccc",
            },
          ]}
          onPress={() =>
            className != "" && description != "" ? addHomework : null
          }
        >
          <Text style={styles.textButtons}>Add New Homework</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentScrollView}
      >
        {homeworks != null && (
          <EachHomework
            homeworks={homeworks}
            toggleHomeworkDone={toggleHomeworkDone}
            boolShowAll={boolShowHidden}
            styles={styles}
          />
        )}
      </ScrollView>

      {/* <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          setDeadline(date);
          setIsDatePickerVisibility(false);
        }}
        onCancel={() => setIsDatePickerVisibility(false)}
      /> */}
    </View>
  );
};

export default Homeworks;
