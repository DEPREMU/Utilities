import React from "react";
import { View } from "react-native";
import RenderCell from "./RenderCell";
import { memoDeep } from "@utils";
import { useStylesMinesweeper } from "@/styles/screens/Games/useStylesMinesweeper";
import { typeCell, typeFinishGame } from "@screens/Games/Minesweeper";

interface RenderRowProps {
  row: typeCell[];
  rowIndex: number;
  finishGame: typeFinishGame;
  handlePress: (row: number, col: number) => void;
  handleOnLongPress: (row: number, col: number) => void;
}

const RenderRow: React.FC<RenderRowProps> = ({
  row,
  rowIndex,
  finishGame,
  handlePress,
  handleOnLongPress,
}) => {
  const { styles } = useStylesMinesweeper();

  return (
    <View key={rowIndex} style={styles.row}>
      {row.map((cell, colIndex) => (
        <RenderCell
          key={`${rowIndex}-${colIndex}`}
          cell={cell}
          finishGame={finishGame}
          rowIndex={rowIndex}
          colIndex={colIndex}
          handlePress={handlePress}
          handleOnLongPress={handleOnLongPress}
        />
      ))}
    </View>
  );
};

const RenderRowMemo = memoDeep(RenderRow);

export default RenderRowMemo;
