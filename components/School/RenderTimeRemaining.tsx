import React from "react";
import { StyleProp, StyleSheet } from "react-native";
import { Text } from "react-native";

interface RenderTimeRemainingProps {
  deadline: Date;
  styles: any;
}

const RenderTimeRemaining: React.FC<RenderTimeRemainingProps> = ({
  deadline,
  styles,
}) => {
  const now = new Date().getTime();
  const deadlineDate = new Date(deadline.toString());
  const timeRemaining = deadlineDate.getTime() - now;

  if (timeRemaining < 0) {
    return <Text style={styles.textDeadline}>Deadline has passed!</Text>;
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Text style={styles.textDeadline}>
      Time remaining: {days} days, {hours} hours, {minutes} minutes
    </Text>
  );
};

export default RenderTimeRemaining;
