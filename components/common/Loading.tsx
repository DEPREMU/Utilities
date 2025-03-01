import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
// import { Bar } from "react-native-progress";

interface LoadingProps {
  boolLoadingText?: boolean;
  progress?: number;
  boolActivityIndicator?: boolean;
}

/**
 * Renders a loading component with optional loading text and progress.
 *
 * @param {Object} props - The component props.
 * @param {string} props.boolLoadingText - Boolean to display loading text. False won't show the text. Default true
 * @param {number} props.progress - The progress value (between 0 and 1). Null won't show the Bar
 * @param {boolean} props.boolActivityIndicator - The boolean to show ActivityIndicator. Default false
 * @returns {JSX.Element} The rendered loading component.
 */
const Loading: React.FC<LoadingProps> = ({
  boolLoadingText = true,
  progress = null,
  boolActivityIndicator = false,
}) => {
  const [loadingText, setLoadingText] = useState<string>("Loading.");

  useEffect(() => {
    if (boolLoadingText)
      setInterval(() => {
        setLoadingText((prev) => {
          if (prev === "Loading...") return "Loading.";
          return prev + ".";
        });
      }, 500);
  }, []);

  return (
    <View style={style.container}>
      {boolLoadingText && <Text style={style.textLoading}>{loadingText}</Text>}
      {boolActivityIndicator && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}
      {/* {progress != null && (
        <Bar
          progress={progress > 1 || progress < 0v? 1 : progress}
          width={200}
          height={15}
          color="#3b5998"
          unfilledColor="#e0e0e0"
          borderWidth={0}
        />
      )} */}
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textLoading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 5,
  },
});

export default Loading;
