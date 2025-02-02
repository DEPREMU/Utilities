import styles from "../../styles/school/stylesFaltas";
import Loading from "../../components/common/Loading";
import DatePicker from "react-native-date-picker";
import { Picker } from "@react-native-picker/picker";
import { getAllData } from "../../utils/database/dataBaseConnection";
import Animated, { SharedValue } from "react-native-reanimated";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

interface ModifyTimeProps {
  panResponder: any;
  boolLoaded: boolean;
  animationsPages: SharedValue<number>[];
}

interface tableCuatri {
  id: number;
  className: string;
  Cuatri: number;
  daysOfClass: string;
}

const ModifyTime: React.FC<ModifyTimeProps> = ({
  panResponder,
  boolLoaded,
  animationsPages,
}) => {
  const tableNameClasses = "Classes";
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const [dataClasses, setDataClasses] = useState<string | null>(null);
  const [cuatri, setCuatri] = useState<string | null>(null);
  const [cuatris, setCuatris] = useState<number[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [time, setTime] = useState<string | Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string | number>("");
  const [newDates, setNewDates] = useState<string | null>(null);

  useEffect(() => {
    const loadDataClasses = async () => {
      const { data } = await getAllData(tableNameClasses);
      let cuatris: any[] = [];
      if (data && data.length > 0) {
        cuatris = [...new Set(data.map((item: any) => item.Cuatri))];
      }

      setDataClasses(JSON.stringify(data));
      setCuatri(cuatris[0]);
      setCuatris(cuatris);
      setLoading(false);
    };

    loadDataClasses();
  }, []);

  const handleDeleteTime = async (id: number, day: any) => {
    try {
      console.log(newDates);

      if (!newDates || JSON.parse(newDates)[id] == undefined) {
        if (!dataClasses) return;
        const datesClasses = JSON.parse(dataClasses).find(
          (item: { id: number }) => item.id == id
        );
        const updatedDays = JSON.parse(datesClasses.daysOfClass);
        delete updatedDays[day];
        datesClasses.daysOfClass = JSON.stringify(updatedDays);
        setNewDates(JSON.stringify({ [id]: datesClasses }));
        console.log(`HandleDeleteTimeTrue:`, datesClasses);
      } else {
        const newDatesClasses = JSON.parse(newDates);
        const daysOfClass = JSON.parse(newDatesClasses[id].daysOfClass);
        delete daysOfClass[day];
        newDatesClasses[id].daysOfClass = JSON.stringify(daysOfClass);
        setNewDates(JSON.stringify(newDatesClasses));
        console.log(`HandleDeleteTimeElse:`, newDatesClasses);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const showTimePickerForDay = async (id: number, day: any) => {
    setSelectedDay(day);
    setSelectedClassId(id);

    const newDatesClasses = JSON.parse(newDates || "{}");

    console.log(`showTimePicker-before:`, newDatesClasses);

    if (!newDatesClasses[id] && dataClasses) {
      newDatesClasses[id] = await JSON.parse(dataClasses).find(
        (item: { id: number }) => item.id == id
      );
    }
    console.log(`showTimePicker-after:`, newDatesClasses);

    setNewDates(JSON.stringify(newDatesClasses));
    setShowTimePicker(true);
  };

  if (loading) return <Loading boolActivityIndicator />;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: animationsPages[1] }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.textTitle}>Modify Time</Text>
      {cuatris && (
        <Picker
          selectedValue={cuatri}
          onValueChange={(itemValue) => setCuatri(itemValue)}
          style={styles.picker}
        >
          {cuatris.map((cuatri, index) => (
            <Picker.Item key={index} label={String(cuatri)} value={cuatri} />
          ))}
        </Picker>
      )}
      <ScrollView style={styles.containerScrollView}>
        {dataClasses != null &&
          JSON.parse(dataClasses).map(
            (item: tableCuatri, index: number) =>
              cuatri &&
              String(item.Cuatri) == cuatri && (
                <View style={styles.formNewProduct} key={index}>
                  <Text style={styles.textType}>{item.className}</Text>
                  <View style={stylesDays.daysContainer}>
                    {daysOfWeek.map((day) => (
                      <View key={day} style={stylesDays.rowDays}>
                        <Pressable
                          onPress={() =>
                            JSON.parse(item.daysOfClass)[day]
                              ? showTimePickerForDay(item.id, day)
                              : null
                          }
                          style={({ pressed }) => [
                            {
                              opacity:
                                pressed && JSON.parse(item.daysOfClass)[day]
                                  ? 0.5
                                  : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              stylesDays.textsDays,
                              {
                                backgroundColor:
                                  JSON.parse(item.daysOfClass)[day] &&
                                  newDates != null &&
                                  !JSON.parse(newDates)[item.id]
                                    ? "#007BFF"
                                    : "#F7F7F7",
                                color:
                                  JSON.parse(item.daysOfClass)[day] &&
                                  newDates != null &&
                                  !JSON.parse(newDates)[item.id]
                                    ? "white"
                                    : "black",
                              },
                            ]}
                          >
                            {day}
                            {JSON.parse(item.daysOfClass)[day]
                              ? ` (${JSON.parse(item.daysOfClass)[day]})`
                              : "\ts"}
                            {newDates != null && JSON.parse(newDates)[item.id]
                              ? JSON.parse(
                                  JSON.parse(newDates)[item.id].daysOfClass
                                )[day]
                              : ""}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            JSON.parse(item.daysOfClass)[day]
                              ? handleDeleteTime(item.id, day)
                              : showTimePickerForDay(item.id, day)
                          }
                          style={({ pressed }) => [
                            stylesDays.button,
                            {
                              backgroundColor: "#007BFF",
                              opacity: pressed ? 0.5 : 1,
                            },
                          ]}
                        >
                          <Text style={stylesDays.textTimePicker}>
                            {JSON.parse(item.daysOfClass)[day]
                              ? "Delete date"
                              : "Select Time"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )
          )}

        {showTimePicker && (
          <DatePicker
            mode="time"
            date={new Date(time)}
            onDateChange={setTime}
          />
        )}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [
          styles.buttonNewProduct,
          { opacity: pressed ? 0.5 : 1 },
        ]}
      >
        <Text style={styles.textButtons}>Save</Text>
      </Pressable>
    </Animated.View>
  );
};

const stylesDays = StyleSheet.create({
  daysContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    marginVertical: 10,
  },
  rowDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#f9f9f9",
  },
  textsDays: {
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    fontWeight: "500",
    fontSize: 16,
    textAlign: "center",
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    width: 120,
  },
  textTimePicker: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
});

export default ModifyTime;
