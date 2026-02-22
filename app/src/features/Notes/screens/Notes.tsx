import {
  tTyped,
  memoDeep,
  getFormattedDate,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOutUp,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import {
  View,
  Alert,
  Pressable,
  ScrollView,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Button from "@/common/components/Button/screens";
import { modalRef } from "@refs";
import NotesCardItem from "@screens/Notes/components/list/NotesCardItem";
import { useLanguage } from "@context/LanguageContext";
import { useNotesFeature } from "@screens/Notes/context/NotesContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import NotesSelectionActions from "@screens/Notes/components/list/NotesSelectionActions";
import { FAB, Icon, Text, TextInput } from "react-native-paper";

export interface NotesProps {
  onSelectedNote: () => void;
}

const Notes: React.FC<NotesProps> = ({ onSelectedNote }) => {
  const { styles, colors } = useStylesNotesScreen();
  const { t } = useLanguage();
  const {
    query,
    folders,
    settings,
    isLoading,
    selectedIds,
    hiddenNotes,
    hasSelection,
    hasOwnPassword,
    selectedMap,
    selectedFolderId,
    notesWithPreview,
    setQuery,
    refresh,
    openNote,
    createNote,
    bulkMove,
    bulkDelete,
    createFolder,
    bulkSetHidden,
    resetSelection,
    bulkSetPinned,
    setNotesPassword,
    setSelectedFolderId,
    toggleSelection,
    validateUnlockPassword,
  } = useNotesFeature();

  const [showLockHint, setShowLockHint] = useState<boolean>(false);
  const [isTextPromptOpen, setIsTextPromptOpen] = useState<boolean>(false);
  const [isShowingHiddenNotes, setIsShowingHiddenNotes] =
    useState<boolean>(false);
  const [isUnlockRefreshing, setIsUnlockRefreshing] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const unlockTimeoutRef = useRef<number | null>(null);
  const handleScrollRef = useRef(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setShowLockHint(event.nativeEvent.contentOffset.y < -30);
    },
  );

  const selectedCount = selectedIds.length;
  const hasAnyModalOpen = isTextPromptOpen;

  const hiddenNotesWithPreview = useMemo(
    () =>
      hiddenNotes.map((item) => {
        const preview = item.content
          .replace(/\{\{ATTACH:[a-zA-Z0-9-]+\}\}/g, "")
          .replace(/\s+/g, " ")
          .trim();

        return {
          ...item,
          preview: preview ? preview.slice(0, 90) : t("notes.emptyPreview"),
          formattedUpdatedAt: getFormattedDate(
            new Date(item.updatedAt),
            undefined,
            {
              dateStyle: "short",
              timeStyle: "short",
            },
          ),
        };
      }),
    [hiddenNotes, t],
  );

  const displayedNotes = isShowingHiddenNotes
    ? hiddenNotesWithPreview
    : notesWithPreview;

  const hasAnySelectedUnpinned = useMemo(
    () => displayedNotes.some((note) => selectedMap[note.id] && !note.isPinned),
    [displayedNotes, selectedMap],
  );

  const handleOpenCreateFolderModal = useCallback(() => {
    let folderName = "";

    const handleClose = () => {
      setIsTextPromptOpen(false);
      modalRef.closeModal?.();
    };

    setIsTextPromptOpen(true);
    modalRef.openModal?.(
      t("notes.createFolderTitle"),
      <TextInput
        mode="outlined"
        placeholder={t("notes.folderNamePlaceholder")}
        onChangeText={(value) => {
          folderName = value;
        }}
      />,
      <>
        <Button label={tTyped("notes.cancel")} handlePress={handleClose} />
        <Button
          label={tTyped("notes.create")}
          handlePress={async () => {
            const success = await createFolder(folderName);
            if (!success) return;
            handleClose();
          }}
        />
      </>,
      () => {
        setIsTextPromptOpen(false);
      },
    );
  }, [createFolder, t]);

  const handleOpenUnlockModal = useCallback(() => {
    let password = "";

    const handleClose = () => {
      setIsTextPromptOpen(false);
      modalRef.closeModal?.();
    };

    setIsTextPromptOpen(true);
    modalRef.openModal?.(
      t("notes.unlockTitle"),
      <>
        <Text style={styles.modalSubtitle}>
          {!hasOwnPassword
            ? t("notes.createPasswordDescription")
            : t("notes.typePasswordDescription")}
        </Text>
        <TextInput
          mode="outlined"
          secureTextEntry
          placeholder={t("notes.passwordPlaceholder")}
          onChangeText={(value) => {
            password = value;
          }}
        />
      </>,
      <>
        <Button label={tTyped("notes.cancel")} handlePress={handleClose} />
        <Button
          label={tTyped("notes.continue")}
          handlePress={() => {
            const trimmedPassword = password.trim();
            if (!trimmedPassword) return;

            if (!hasOwnPassword && !settings.useVaultPassword) {
              setNotesPassword(trimmedPassword);
              resetSelection();
              setIsShowingHiddenNotes(true);
              handleClose();
              return;
            }

            const success = validateUnlockPassword(trimmedPassword);
            if (!success) {
              Alert.alert(
                tTyped("notes.invalidPasswordTitle"),
                tTyped("notes.invalidPasswordMessage"),
              );
              return;
            }

            resetSelection();
            setIsShowingHiddenNotes(true);
            handleClose();
          }}
        />
      </>,
      () => {
        setIsTextPromptOpen(false);
      },
    );
  }, [
    hasOwnPassword,
    resetSelection,
    setNotesPassword,
    settings.useVaultPassword,
    styles.modalSubtitle,
    t,
    validateUnlockPassword,
  ]);

  const handleMoveSelected = useCallback(() => {
    const handleClose = () => {
      modalRef.closeModal?.();
    };

    const handleSelectFolder = (folderId: string | null) => {
      bulkMove(folderId);
      handleClose();
    };

    modalRef.openModal?.(
      tTyped("notes.moveNotesTitle"),
      <ScrollView
        style={styles.moveFoldersScroll}
        contentContainerStyle={styles.hiddenListContent}
      >
        <Button
          label={tTyped("notes.allShort")}
          handlePress={() => handleSelectFolder(null)}
        />

        {folders.map((folder) => (
          <Button
            key={folder.id}
            label={folder.name}
            handlePress={() => handleSelectFolder(folder.id)}
          />
        ))}
      </ScrollView>,
      <Button label={tTyped("notes.cancel")} handlePress={handleClose} />,
    );
  }, [bulkMove, folders, styles.hiddenListContent, styles.moveFoldersScroll]);

  const handleDeleteSelected = useCallback(() => {
    Alert.alert(
      tTyped("notes.deleteNotesTitle"),
      tTyped("notes.deleteSelectedMessage", {
        count: selectedCount.toString(),
      }),
      [
        { text: tTyped("notes.cancel"), style: "cancel" },
        {
          text: tTyped("notes.delete"),
          style: "destructive",
          onPress: () => bulkDelete(),
        },
      ],
    );
  }, [bulkDelete, selectedCount]);

  const handlePullToUnlockRef = useRef(async () => {
    setIsUnlockRefreshing(true);
    handleOpenUnlockModal();

    if (unlockTimeoutRef.current)
      clearTimeoutPolyfill(unlockTimeoutRef.current);
    unlockTimeoutRef.current = setTimeoutPolyfill(() => {
      setIsUnlockRefreshing(false);
    }, 200);
  });

  const handleSelectVisibleNote = useCallback(
    (item: (typeof displayedNotes)[number]) => {
      if (hasSelection) {
        toggleSelection(item.id);
        return;
      }

      openNote(item);
      onSelectedNote();
    },
    [hasSelection, onSelectedNote, openNote, toggleSelection],
  );

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: (typeof displayedNotes)[number];
      index: number;
    }) => {
      const selected = !!selectedMap[item.id];

      return (
        <NotesCardItem
          isGrid
          isSelected={selected}
          title={item.title}
          preview={item.preview}
          previewLines={3}
          dateText={item.formattedUpdatedAt}
          isPinned={item.isPinned}
          isHidden={isShowingHiddenNotes}
          animationDelay={Math.min(index, 8) * 35}
          onLongPress={() => toggleSelection(item.id)}
          onPress={() => handleSelectVisibleNote(item)}
        />
      );
    },
    [
      handleSelectVisibleNote,
      isShowingHiddenNotes,
      selectedMap,
      toggleSelection,
    ],
  );

  const handleCreateNote = useCallback(async () => {
    await createNote();
    onSelectedNote();
  }, [createNote, onSelectedNote]);

  const handleHideSelection = useCallback(() => {
    bulkSetHidden(!isShowingHiddenNotes);
  }, [bulkSetHidden, isShowingHiddenNotes]);

  const handlePinSelection = useCallback(() => {
    bulkSetPinned(hasAnySelectedUnpinned);
  }, [bulkSetPinned, hasAnySelectedUnpinned]);

  const handleToggleSearchRef = useRef(() => {
    setShowSearch((prev) => !prev);
  });

  const handleOpenFolderModalRef = useRef(() => {
    handleOpenCreateFolderModal();
  });

  const handleSelectAllFolder = useCallback(() => {
    setSelectedFolderId("ALL");
  }, [setSelectedFolderId]);

  useEffect(() => {
    return () => clearTimeoutPolyfill(unlockTimeoutRef);
  }, []);

  return (
    <Animated.View style={styles.container} entering={FadeInDown.duration(180)}>
      <Animated.View
        style={styles.headerArea}
        entering={FadeInDown.duration(200).delay(40)}
      >
        <View style={styles.notesHeaderTopRow}>
          <Text style={styles.notesScreenTitle}>{t("notes.title")}</Text>
          <View style={styles.notesHeaderTopActions}>
            {isShowingHiddenNotes ? (
              <Pressable
                style={styles.headerIconButton}
                onPress={() => {
                  resetSelection();
                  setIsShowingHiddenNotes(false);
                }}
              >
                <Icon source="arrow-left" size={20} color={colors.text} />
              </Pressable>
            ) : (
              <Pressable
                style={styles.headerIconButton}
                onPress={handleToggleSearchRef.current}
              >
                <Icon source="magnify" size={20} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {showSearch && !isShowingHiddenNotes && (
          <Animated.View
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(140)}
          >
            <TextInput
              mode="outlined"
              placeholder={t("notes.searchPlaceholder")}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              left={<TextInput.Icon icon="magnify" />}
            />
          </Animated.View>
        )}

        {!isShowingHiddenNotes && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.folderRow}>
              <Pressable
                style={[
                  styles.folderChip,
                  selectedFolderId === "ALL" ? styles.folderChipActive : null,
                ]}
                onPress={handleSelectAllFolder}
              >
                <Text style={styles.folderChipText}>
                  {t("notes.allFolder")}
                </Text>
              </Pressable>
              {folders.map((folder) => (
                <Pressable
                  key={folder.id}
                  style={[
                    styles.folderChip,
                    selectedFolderId === folder.id
                      ? styles.folderChipActive
                      : null,
                  ]}
                  onPress={() => setSelectedFolderId(folder.id)}
                >
                  <Text style={styles.folderChipText}>{folder.name}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.folderChipAdd}
                onPress={handleOpenFolderModalRef.current}
              >
                <Icon source="folder-plus" size={20} color={colors.text} />
              </Pressable>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {showLockHint && !isShowingHiddenNotes && (
        <Animated.View
          style={styles.lockHintContainer}
          entering={FadeIn.duration(160)}
          exiting={FadeOutDown.duration(140)}
        >
          <Icon source="lock" size={16} color={colors.text} />
          <Text style={styles.lockHintText}>{t("notes.unlockHint")}</Text>
        </Animated.View>
      )}

      <Animated.FlatList
        data={displayedNotes}
        renderItem={renderItem}
        key={isShowingHiddenNotes ? "notes-grid-hidden" : "notes-grid-2"}
        numColumns={2}
        columnWrapperStyle={styles.notesGridRow}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        onScroll={handleScrollRef.current}
        refreshControl={
          !isShowingHiddenNotes ? (
            <RefreshControl
              refreshing={isUnlockRefreshing}
              onRefresh={handlePullToUnlockRef.current}
              tintColor={colors.text}
            />
          ) : undefined
        }
        onRefresh={refresh}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("notes.emptyNotes")}</Text>
          </View>
        }
      />

      {!hasAnyModalOpen && !isShowingHiddenNotes && (
        <Animated.View
          exiting={FadeOutDown.duration(140)}
          entering={FadeInDown.duration(200)}
        >
          <FAB
            animated
            icon="plus"
            size="medium"
            style={styles.fab}
            color={colors.background}
            onPress={handleCreateNote}
          />
        </Animated.View>
      )}

      {hasSelection && !hasAnyModalOpen && (
        <Animated.View
          exiting={FadeOutDown.duration(140)}
          entering={FadeInDown.duration(200)}
        >
          <NotesSelectionActions
            onPin={handlePinSelection}
            onMove={handleMoveSelected}
            onHide={handleHideSelection}
            onCancel={resetSelection}
            onDelete={handleDeleteSelected}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default memoDeep(Notes);
