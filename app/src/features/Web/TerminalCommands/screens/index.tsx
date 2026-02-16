import {
  Text,
  Card,
  Switch,
  TextInput,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import Button from "@/common/components/Button/screens";
import { Command } from "@common";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { windowModule } from "@modules";
import { logger, storageManagement } from "@utils";
import { useStylesTerminalCommands } from "@screens/Web/TerminalCommands/styles";
import { FlatList, View, ScrollView } from "react-native";
import React, { useCallback, useRef, useState } from "react";

const TerminalCommands: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesTerminalCommands();

  const [commands, setCommands] = useState<Command[]>(
    storageManagement.get("TERMINAL_COMMANDS", []),
  );
  const [newCommand, setNewCommand] = useState<Command>({
    when: "Start-up",
    command: "",
  });
  const [executing, setExecuting] = useState<boolean>(false);

  const handleChangeCommandRef = useRef(() => {
    setNewCommand((prev) => ({
      ...prev,
      when: prev.when === "Start-up" ? "Shut-down" : "Start-up",
    }));
  });

  const handleAddTextRef = useRef((text: string) => {
    setNewCommand((prev) => ({ ...prev, command: text }));
  });

  const handleAddCommand = useCallback(async () => {
    modalRef.closeModal?.();
    setNewCommand({ when: "Start-up", command: "" });
    setCommands((prev) => {
      const updatedCommands = [...prev, newCommand];
      storageManagement.save("TERMINAL_COMMANDS", updatedCommands);
      return updatedCommands;
    });
  }, [newCommand]);

  const handleExecuteCommand = useCallback(
    async (command: string) => {
      setExecuting(true);
      modalRef.closeModal?.();
      try {
        const result = await windowModule.executeCommand(command);
        setExecuting(false);
        modalRef.openModal?.(
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
        logger.error("Error executing command:", error);
        const message = error instanceof Error ? error.message : String(error);

        modalRef.openModal?.(
          t("error"),
          t("commandExecutionFailed") + ":\n" + message,
          <Button
            handlePress={() => modalRef.closeModal?.()}
            label={t("common.close")}
            replaceStyles={{
              button: styles.executeButton,
              textButton: styles.executeButtonLabel,
            }}
          />,
        );
      }
    },
    [styles, t, handleAddCommand],
  );

  const handleAskAddCommand = useCallback(async () => {
    if (!newCommand.command.trim()) return;
    modalRef.openModal?.(
      t("askExecuteCommand"),
      t("confirmExecuteCommand"),
      <>
        <Button
          handlePress={() => modalRef.closeModal?.()}
          label={t("labels.cancel")}
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
  }, [t, styles, newCommand, handleExecuteCommand]);

  const handleDeleteCommand = useCallback(
    async (index: number) => {
      const updatedCommands = commands.filter((_, i) => i !== index);
      setCommands(updatedCommands);
      storageManagement.save("TERMINAL_COMMANDS", updatedCommands);
    },
    [commands],
  );

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
                size={40}
                icon="console"
                iconColor={colors.background}
                containerColor={colors.primary}
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
              onChangeText={handleAddTextRef.current}
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
                onValueChange={handleChangeCommandRef.current}
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
