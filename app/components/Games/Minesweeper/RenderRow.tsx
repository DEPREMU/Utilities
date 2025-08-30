import { View } from "react-native";
import RenderCell from "./RenderCell";
import { typeCell, typeFinishGame } from "@screens/Games/Minesweeper";
import React, { memo } from "react";
import { useStylesMinesweeper } from "@/styles/screens/Games/useStylesMinesweeper";
import { stringifyData } from "@/utils";

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

const RenderRowMemo = memo(RenderRow, (prevProps, nextProps) => {
  if (prevProps.rowIndex !== nextProps.rowIndex) return false;
  if (prevProps.handlePress !== nextProps.handlePress) return false;
  if (prevProps.handleOnLongPress !== nextProps.handleOnLongPress) return false;
  if (prevProps.finishGame !== nextProps.finishGame) return false;

  if (prevProps.row.length !== nextProps.row.length) return false;

  if (stringifyData(prevProps.row) !== stringifyData(nextProps.row))
    return false;

  return true;
});

export default RenderRowMemo;
