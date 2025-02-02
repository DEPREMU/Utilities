import React from "react";
import { Pressable, Text, View } from "react-native";
import RenderTimeRemaining from "./RenderTimeRemaining";

interface EachHomeworkProps {
  boolShowAll: boolean;
  homeworks: string;
  toggleHomeworkDone: (id: number, currentStatus: boolean) => void;
  styles: any;
}

const EachHomework: React.FC<EachHomeworkProps> = ({
  boolShowAll,
  homeworks,
  toggleHomeworkDone,
  styles,
}) => {
  return (
    <>
      {JSON.parse(homeworks).map((value: any) => {
        const date = new Date(value.dateAdded).toLocaleString();

        if (!value.done || boolShowAll)
          return (
            <View key={value.id} style={styles.containerHomework}>
              <Text style={styles.textClass}>{value.class}</Text>
              <Text style={styles.textDate}>{date}</Text>
              <Text style={styles.textDescription}>{value.description}</Text>
              <Text style={styles.textDeadline}>
                Deadline: {new Date(value.deadline).toLocaleString()}
              </Text>

              {/* Cálculo del tiempo restante */}
              <RenderTimeRemaining styles={styles} deadline={value.deadline} />

              <Pressable
                style={({ pressed }) => [
                  styles.buttonToggleDone,
                  {
                    opacity: pressed ? 0.5 : 1,
                    backgroundColor: value.done ? "red" : "green",
                  },
                ]}
                onPress={() => toggleHomeworkDone(value.id, value.done)}
              >
                <Text style={styles.textButtons}>
                  {value.done ? "Mark as Not Done" : "Mark as Done"}
                </Text>
              </Pressable>
            </View>
          );
      })}
    </>
  );
};

export default EachHomework;
