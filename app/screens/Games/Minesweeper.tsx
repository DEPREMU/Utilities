import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { Text } from "react-native-paper";
import RenderRow from "@components/Games/Minesweeper/RenderRow";
import { useLanguage } from "@context/LanguageContext";
import { useStylesMinesweeper } from "@styles/screens/Games/useStylesMinesweeper";
import React, { useCallback, useState } from "react";

const difficulties = {
  easy: { mines: 10, size: 8 },
  medium: { mines: 20, size: 12 },
  hard: { mines: 30, size: 16 },
};

type Difficulty = keyof typeof difficulties;

type EachDifficulty = (typeof difficulties)[Difficulty];

export type typeCell = {
  isRevealed: boolean;
  isFlagged: boolean;
  value: number;
};

export type typeFinishGame = {
  isWin: boolean;
  isPlaying: boolean;
  isFinished: boolean;
};

const createBoard = (size: number, mines: [number, number][]): typeCell[][] => {
  const board: typeCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      isRevealed: false,
      isFlagged: false,
      value: 0,
    })),
  );

  mines.forEach(([x, y]) => {
    board[x][y].value = -1;
  });

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (board[x][y].value === -1) continue;

      let mineCount = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
            if (board[nx][ny].value === -1) mineCount++;
          }
        }
      }
      board[x][y].value = mineCount;
    }
  }

  return board;
};

const getBoard = (difficulty: EachDifficulty): typeCell[][] => {
  const mines: [number, number][] = [];
  Array.from({ length: difficulty.mines }).forEach(() => {
    while (true) {
      const x = Math.floor(Math.random() * difficulty.size);
      const y = Math.floor(Math.random() * difficulty.size);
      if (mines.some(([mx, my]) => mx === x && my === y)) continue;

      mines.push([x, y]);
      break;
    }
  });

  return createBoard(difficulty.size, mines);
};

const Minesweeper: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesMinesweeper();

  const [board, setBoard] = useState<typeCell[][]>([]);
  const [finishGame, setFinishGame] = useState<typeFinishGame>({
    isWin: false,
    isPlaying: false,
    isFinished: false,
  });
  const [numFlags, setNumFlags] = useState<number>(difficulties.easy.mines);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const getStatus = useCallback(() => {
    if (finishGame.isFinished)
      return finishGame.isWin ? t("youWin") : t("youLose");
    if (finishGame.isPlaying)
      return `${t("youArePlaying")}: \n${t("flagsRemaining", { count: String(numFlags) })}`;

    return t("flagsRemaining", { count: String(numFlags) });
  }, [finishGame, numFlags, t]);

  const handleStartGame = useCallback(() => {
    if (finishGame.isPlaying) return;

    setFinishGame({ isPlaying: true, isFinished: false, isWin: false });
    const localDifficulty = difficulties[difficulty];
    const newBoard: typeCell[][] = getBoard(localDifficulty);
    setBoard(newBoard);
  }, [difficulty, finishGame]);

  const handleChangeDifficulty = useCallback((level: Difficulty) => {
    setDifficulty(level);
    setNumFlags(difficulties[level].mines);
  }, []);

  const renderDifficultyButtons = useCallback(() => {
    return Object.keys(difficulties).map((level) => (
      <Button
        key={level}
        customStyles={{
          button: level === difficulty ? styles.difficultySelected : {},
          textButton: {},
        }}
        argsFuncHandlePress={[level as Difficulty]}
        touchableOpacity
        label={t(level as Difficulty)}
        handlePress={handleChangeDifficulty}
      />
    ));
  }, [t, handleChangeDifficulty, difficulty, styles.difficultySelected]);

  const revealCell = useCallback(
    (board: typeCell[][], row: number, col: number): typeCell[][] => {
      if (
        row < 0 ||
        row >= board.length ||
        col < 0 ||
        col >= board[0].length ||
        board[row][col].isRevealed ||
        board[row][col].isFlagged
      ) {
        return board;
      }

      const newBoard = board.map((boardRow, rowIndex) => {
        if (rowIndex !== row) return [...boardRow];

        return boardRow.map((cell, colIndex) => {
          if (colIndex === col) return { ...cell, isRevealed: true };

          return { ...cell };
        });
      });

      if (newBoard[row][col].value !== 0) return newBoard;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const newRow = row + dx;
          const newCol = col + dy;
          const updatedBoard = revealCell(newBoard, newRow, newCol);
          for (let i = 0; i < updatedBoard.length; i++) {
            for (let j = 0; j < updatedBoard[i].length; j++) {
              if (updatedBoard[i][j].isRevealed === newBoard[i][j].isRevealed)
                continue;
              newBoard[i][j] = { ...updatedBoard[i][j] };
            }
          }
        }
      }

      return newBoard;
    },
    [],
  );

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!finishGame.isPlaying) return;

      setBoard((prevBoard) => {
        if (prevBoard[row][col].isRevealed || prevBoard[row][col].isFlagged)
          return prevBoard;

        if (prevBoard[row][col].value === -1) {
          setFinishGame({ isPlaying: false, isFinished: true, isWin: false });
          return prevBoard;
        }

        return revealCell(prevBoard, row, col);
      });
    },
    [revealCell, finishGame],
  );

  const handleFlagLongPress = useCallback(
    (row: number, col: number) => {
      if (!finishGame.isPlaying) return;

      setBoard((prevBoard) => {
        if (numFlags === 0 && !prevBoard[row][col].isFlagged) return prevBoard;
        if (prevBoard[row][col].isFlagged) setNumFlags((prev) => prev + 1);
        else setNumFlags((prev) => prev - 1);

        return prevBoard.map((boardRow, rowIndex) => {
          if (rowIndex !== row) return boardRow;

          return boardRow.map((cell, colIndex) => {
            if (colIndex !== col) return cell;

            return {
              ...cell,
              isFlagged: !cell.isFlagged,
            };
          });
        });
      });
    },
    [numFlags, finishGame],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("minesweeper")}</Text>
      {!finishGame.isPlaying && (
        <>
          <View style={styles.difficultyContainer}>
            {renderDifficultyButtons()}
          </View>
          <Button label={t("startGame")} handlePress={handleStartGame} />
        </>
      )}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>{getStatus()}</Text>
        <Text style={styles.infoText}>
          {t(difficulty)} - {difficulties[difficulty].size}x
        </Text>
      </View>

      <View style={styles.containerMinesweeper}>
        {board.map((row, rowIndex) => (
          <RenderRow
            key={rowIndex}
            row={row}
            finishGame={finishGame}
            rowIndex={rowIndex}
            handlePress={handleCellPress}
            handleOnLongPress={handleFlagLongPress}
          />
        ))}
      </View>
    </View>
  );
};

export default Minesweeper;
