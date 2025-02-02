import { View, Text, Pressable } from "react-native";

interface ErrorComponentProps {
  errorText?: string | null;
  navigation?: any;
  component?: string;
}

/**
 * ErrorComponent is a React functional component that displays an error message
 * and optionally provides a retry button to navigate to a specified component.
 *
 * @param {string} [errorText="Unknown"] - The error message to display.
 * @param {any} [navigation] - The navigation object used to navigate to a different component.
 * @param {string} [component="Start"] - The name of the component to navigate to when the retry button is pressed.
 *
 * @returns {JSX.Element} The rendered error component.
 */
const ErrorComponent: React.FC<ErrorComponentProps> = ({
  errorText = "Unknown",
  navigation,
  component = "Start",
}) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text style={{ fontSize: 18, textAlign: "center" }}>{errorText}</Text>
    {navigation != null && component != null && (
      <Pressable
        style={({ pressed }) => [
          {
            backgroundColor: "gray",
            borderRadius: 5,
            padding: 10,
            marginVertical: 10,
            opacity: pressed ? 0.5 : 1,
          },
        ]}
        onPress={() => navigation.replace(component)}
      >
        <Text
          style={{
            color: "white",
            fontSize: 18,
          }}
        >
          Retry
        </Text>
      </Pressable>
    )}
  </View>
);

export default ErrorComponent;
