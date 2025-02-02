import { View, Text, Alert, TextInput, Pressable } from "react-native";
import styles from "../../styles/school/stylesFaltas";
import DatePicker from "react-native-date-picker";
import React, { useEffect, useState } from "react";
import Animated, { SharedValue, withSpring } from "react-native-reanimated";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface AddClassProps {
  panResponder: any;
  animationsPages: SharedValue<number>[];
  boolLoaded: boolean;
}

const AddClass: React.FC<AddClassProps> = ({
  boolLoaded,
  panResponder,
  animationsPages,
}) => {
  const [time, setTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [className, setClassName] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<string>(JSON.stringify({}));
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [cuatriTextInput, setCuatriTextInput] = useState<string>("");

  const handleDaySelect = (day: string) => {
    const currentSelection = JSON.parse(selectedDays);
    delete currentSelection[day]; // Eliminar el día seleccionado
    setSelectedDays(JSON.stringify(currentSelection));
  };

  const showTimePickerForDay = (day: string) => {
    setSelectedDay(day);
    setShowTimePicker(true);
  };

  const addClass = () => {
    // Lógica para añadir la clase
    Alert.alert(
      "Class Added",
      `Class: ${className}\nCuatri: ${cuatriTextInput}\nDays: ${selectedDays}`
    );
    // Aquí puedes hacer cualquier otra acción necesaria, como actualizar un estado global o hacer una llamada a la API
  };

  const checkClasses = () => {
    Alert.alert("Error", "Please fill in all fields.");
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: animationsPages[0] }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.formNewProduct}>
        <Text style={[styles.textType]}>Class</Text>

        <TextInput
          style={styles.textInput}
          onChangeText={setClassName}
          value={className}
          placeholder="Class Name"
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.textInput}
          onChangeText={(text) =>
            setCuatriTextInput((prev) => (text.length < 2 ? text : prev))
          }
          value={cuatriTextInput}
          placeholder="Cuatri"
          keyboardType="numeric"
          placeholderTextColor="#aaa"
        />

        {/* Selector de días de la semana */}
        <View style={styles.daysContainer}>
          {daysOfWeek.map((day) => (
            <View key={day} style={styles.rowDays}>
              <Pressable
                style={({ pressed }) => [
                  {
                    opacity: pressed && JSON.parse(selectedDays)[day] ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textsDays,
                    {
                      backgroundColor: JSON.parse(selectedDays)[day]
                        ? "#007BFF"
                        : "#F7F7F7",
                      color: JSON.parse(selectedDays)[day] ? "white" : "black",
                    },
                  ]}
                >
                  {day}
                  {JSON.parse(selectedDays)[day]
                    ? ` (${JSON.parse(selectedDays)[day]})`
                    : ""}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  JSON.parse(selectedDays)[day]
                    ? handleDaySelect(day)
                    : showTimePickerForDay(day)
                }
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: JSON.parse(selectedDays)[day]
                      ? "#dc3545"
                      : "#007BFF",
                    opacity: pressed ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={styles.textTimePicker}>
                  {JSON.parse(selectedDays)[day]
                    ? "Delete date"
                    : "Select Time"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {showTimePicker && (
          <DatePicker
            modal
            open={showTimePicker}
            date={time}
            onConfirm={(date) => setTime(date)}
            onCancel={() => {
              setShowTimePicker(false);
            }}
            mode="time"
          />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.buttonNewProduct,
            {
              opacity: pressed && className !== "" ? 0.5 : 1,
              backgroundColor:
                className !== "" &&
                JSON.parse(selectedDays).length > 0 &&
                cuatriTextInput
                  ? "#007BFF"
                  : "#ccc",
            },
          ]}
          onPress={() =>
            className && JSON.parse(selectedDays).length > 0 && cuatriTextInput
              ? addClass()
              : checkClasses()
          }
        >
          <Text style={styles.textButtons}>Add New Class</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default AddClass;
