import { typeCell, typeFinishGame } from "@screens/Games/Minesweeper";
import { Text, Pressable } from "react-native";
import React, { useCallback } from "react";
import { useStylesMinesweeper } from "@/styles/screens/Games/useStylesMinesweeper";

interface RenderCellProps {
  cell: typeCell;
  rowIndex: number;
  colIndex: number;
  finishGame: typeFinishGame;
  handlePress: (row: number, col: number) => void;
  handleOnLongPress: (row: number, col: number) => void;
}

const RenderCell: React.FC<RenderCellProps> = ({
  cell,
  rowIndex,
  colIndex,
  finishGame,
  handlePress,
  handleOnLongPress,
}) => {
  const { styles } = useStylesMinesweeper();

  const handlePressCallback = useCallback(() => {
    handlePress(rowIndex, colIndex);
  }, [handlePress, rowIndex, colIndex]);

  const handleOnLongPressCallback = useCallback(() => {
    handleOnLongPress(rowIndex, colIndex);
  }, [handleOnLongPress, rowIndex, colIndex]);

  const getCellContent = () => {
    if (finishGame.isFinished && !finishGame.isWin && cell.value === -1)
      return "💣";

    if (cell.isRevealed) {
      if (cell.value === -1) return "💣";
      return String(cell.value);
    }
    if (cell.isFlagged) return "🚩";

    return "";
  };

  const cellText = getCellContent();

  return (
    <Pressable
      style={cell.isRevealed ? styles.cell : styles.cellHidden}
      onPress={handlePressCallback}
      onLongPress={handleOnLongPressCallback}
    >
      {!!cellText && <Text style={styles.cellText}>{cellText}</Text>}
    </Pressable>
  );
};

const RenderCellMemo = React.memo(RenderCell, (prevProps, nextProps) => {
  return (
    prevProps.cell === nextProps.cell &&
    prevProps.rowIndex === nextProps.rowIndex &&
    prevProps.colIndex === nextProps.colIndex &&
    prevProps.finishGame === nextProps.finishGame &&
    prevProps.handlePress === nextProps.handlePress
  );
});

export default RenderCellMemo;
