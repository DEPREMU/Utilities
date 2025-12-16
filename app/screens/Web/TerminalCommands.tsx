import {
  Text,
  Card,
  Switch,
  TextInput,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import Button from "@components/common/ButtonComponent";
import { Command } from "@types";
import { useModal } from "@context/ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { useLanguage } from "@context/LanguageContext";
import { navigateReplace } from "@navigation/navigationRef";
import useStylesTerminalCommands from "@styles/screens/Web/useStylesTerminalCommands";
import { FlatList, Platform, View, ScrollView } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { loadDataStorage, logError, saveDataStorage } from "@utils";

const TerminalCommands: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesTerminalCommands();
  const { openModal, closeModal } = useModal();

  const [commands, setCommands] = useState<Command[]>([]);
  const [newCommand, setNewCommand] = useState<Command>({
    when: "Start-up",
    command: "",
  });
  const [executing, setExecuting] = useState<boolean>(false);

  const handleChangeCommand = useCallback(() => {
    setNewCommand((prev) => ({
      ...prev,
      when: prev.when === "Start-up" ? "Shut-down" : "Start-up",
    }));
  }, []);

  const handleAddCommand = useCallback(async () => {
    closeModal();
    setNewCommand({ when: "Start-up", command: "" });
    setCommands((prev) => {
      const updatedCommands = [...prev, newCommand];
      saveDataStorage("_terminalCommands", updatedCommands);
      return updatedCommands;
    });
  }, [newCommand, closeModal]);

  const handleExecuteCommand = useCallback(
    async (command: string) => {
      setExecuting(true);
      closeModal();
      try {
        const result = await windowModule.executeCommand(command);
        setExecuting(false);
        openModal(
          t("commandExecuted"),
          t("commandOutput") + ":\n" + (result || t("noOutput")),
          <Button
            handlePress={handleAddCommand}
            label={t("addCommand")}
            replaceStyles={{
              button: styles.executeButton,
              textButton: styles.executeButtonLabel,
            }}
          />,
        );
      } catch (error) {
        logError("Error executing command:", error);
        const message = error instanceof Error ? error.message : String(error);

        openModal(
          t("error"),
          t("commandExecutionFailed") + ":\n" + message,
          <Button
            handlePress={closeModal}
            label={t("close")}
            replaceStyles={{
              button: styles.executeButton,
              textButton: styles.executeButtonLabel,
            }}
          />,
        );
      }
    },
    [openModal, closeModal, styles, t, handleAddCommand],
  );

  const handleAskAddCommand = useCallback(async () => {
    if (!newCommand.command.trim()) return;
    openModal(
      t("askExecuteCommand"),
      t("confirmExecuteCommand"),
      <>
        <Button
          handlePress={closeModal}
          label={t("cancel")}
          replaceStyles={{
            button: styles.cancelButton,
            textButton: styles.cancelButtonLabel,
          }}
        />
        <Button
          handlePress={handleExecuteCommand}
          label={t("execute")}
          replaceStyles={{
            button: styles.executeButton,
            textButton: styles.executeButtonLabel,
          }}
          argsFuncHandlePress={[newCommand.command]}
        />
      </>,
    );
  }, [openModal, newCommand, closeModal, styles, t, handleExecuteCommand]);

  const handleDeleteCommand = useCallback(
    async (index: number) => {
      const updatedCommands = commands.filter((_, i) => i !== index);
      setCommands(updatedCommands);
      await saveDataStorage("_terminalCommands", updatedCommands);
    },
    [commands],
  );

  const handleAddText = useCallback((text: string) => {
    setNewCommand((prev) => ({ ...prev, command: text }));
  }, []);

  const handleRenderCommands = useCallback(
    ({ item, index }: { item: Command; index: number }) => {
      return (
        <Card key={index} style={styles.commandCard}>
          <Card.Content style={styles.commandCardContent}>
            <View style={styles.commandHeader}>
              <View style={styles.commandBadge}>
                <Text variant="labelMedium" style={styles.commandBadgeText}>
                  {item.when}
                </Text>
              </View>
              <IconButton
                icon="delete"
                iconColor={colors.background}
                containerColor={colors.error}
                size={20}
                style={styles.deleteButton}
                onPress={() => handleDeleteCommand(index)}
              />
            </View>
            <View style={styles.commandTextContainer}>
              <Text variant="bodyMedium" style={styles.commandText}>
                {item.command}
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    },
    [styles, handleDeleteCommand, colors],
  );

  const handleRenderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard} elevation={3}>
          <Card.Content>
            <View style={styles.iconContainer}>
              <IconButton
                icon="console"
                iconColor={colors.background}
                containerColor={colors.primary}
                size={40}
              />
            </View>
            <Text variant="titleMedium" style={styles.emptyText}>
              {t("noCommandsAdded")}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }, [styles, t, colors]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      navigateReplace("Home");
      return;
    }

    const fetchCommands = async () => {
      const storedCommands = await loadDataStorage("_terminalCommands");

      setCommands(storedCommands || []);
    };
    fetchCommands();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.mainContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          {t("terminalCommands")}
        </Text>

        <Card style={styles.card} elevation={4}>
          <Card.Content style={styles.cardContent}>
            <TextInput
              mode="outlined"
              label={t("command")}
              placeholder={t("enterCommand")}
              style={styles.input}
              value={newCommand.command}
              onChangeText={handleAddText}
              multiline
              numberOfLines={3}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />

            <View style={styles.switchRow}>
              <Text variant="bodyLarge" style={styles.switchLabel}>
                {t(`executeOn${newCommand.when}`)}
              </Text>
              <Switch
                value={newCommand.when === "Start-up"}
                onValueChange={handleChangeCommand}
                color={colors.accent}
              />
            </View>

            <Button
              handlePress={handleAskAddCommand}
              replaceStyles={{
                button: styles.addButton,
                textButton: styles.addButtonLabel,
              }}
              label={executing ? t("executingCommand") : t("addCommand")}
            >
              <ActivityIndicator
                animating={executing}
                color={colors.background}
              />
            </Button>
          </Card.Content>
        </Card>

        <FlatList
          data={commands}
          renderItem={handleRenderCommands}
          ListEmptyComponent={handleRenderEmpty}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
};

export default TerminalCommands;
