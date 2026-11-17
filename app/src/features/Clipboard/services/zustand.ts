import { create } from "zustand";
import { modalRef } from "@refs";
import {
  ClipboardStorage,
  getValueState,
  Pagination,
  ServerError,
  ServerFetch,
  Timers,
} from "@common";
import { GetStatesZustand, typeT, ValidClearTimeout } from "@types";
import {
  clipboardManager,
  Logger,
  sessionManager,
  storageManagement,
} from "@utils";

const logger = new Logger("ClipboardZustand");

const DEFAULT_SETTINGS: ClipboardStorage = {
  enabled: true,
  maxCharsInItem: -1,
  maxClipboardItems: 10,
  webSyncMode: "doubleCtrlC",
};

const getSkeletonData = (
  deleted: boolean,
): DB["TablesClient"]["ClipboardSync"][] => {
  const createdAt = new Date().toISOString();

  return Array.from({ length: 5 }).map((_, i) => ({
    deleted,
    createdAt,
    id: `id ${i}`,
    userId: "userId",
    content: "Loading...",
    deviceId: "deviceId",
  }));
};

type States = GetStatesZustand<{
  clipboardData: DB["TablesClient"]["ClipboardSync"][];
  searchText: string;
  deleted: boolean;
  refreshing: boolean;
  isLoading: boolean;
  isLoadingSkeleton: boolean;
  noMoreData: boolean;
  isFarFromStart: boolean;
  inputText: string;
  isAddingItem: boolean;
  settings: ClipboardStorage;
}>;

type Actions = {
  initListeners: () => () => void;
  fetchClipboard: (searchOverride?: string) => Promise<void>;
  handleSearch: (text: string) => void;
  handleToggleDeleted: (value: boolean) => void;
  handleRefresh: () => void;
  changeClipboardItemDeleted: (id: string, deleted: boolean) => Promise<void>;
  handleDeleteRestoreAll: () => Promise<void>;
  addItemToDatabase: (t: typeT) => Promise<void>;
  updateSettings: (partial: Partial<ClipboardStorage>) => void;
  prependClipboardItem: (item: DB["TablesClient"]["ClipboardSync"]) => void;
  cleanupTimers: () => void;
  reset: () => void;
};

export const useClipboardStore = create<States & Actions>((set, get) => {
  let searchTimeoutId: ValidClearTimeout = null;
  let loadingTimeoutId: ValidClearTimeout = null;
  let activeQueryId = 0;
  let loadedUserId: string | null = null;
  const deletedIds = new Set<string>();
  const removedFromViewIds = new Set<string>();

  const pagination = new Pagination<DB["TablesClient"]["ClipboardSync"]>(
    async (lastId) => {
      const { sessionToken } = sessionManager.getSessionData();
      if (!sessionToken) return [];

      const { searchText, deleted } = get();

      try {
        const res = await ServerFetch.get(
          "/clipboard/:deviceId{/:lastId}",
          {
            query: {
              query: searchText,
              deleted,
            },
            params: {
              lastId: lastId ?? undefined,
              deviceId: storageManagement.get("DEVICE_ID"),
            },
          },
          sessionToken,
        );

        if ("error" in res.data) return [];

        return res.data.clipboardItems;
      } catch (error) {
        logger.error("Error fetching clipboard data", error);
        return "invalidId";
      }
    },
    (currentData, addId, isLatest) => {
      if (currentData.length === 0) return isLatest();

      const id = currentData[currentData.length - 1]?.id;
      if (id) addId(id);
      else isLatest();
    },
    { take: 10 },
  );

  return {
    clipboardData: getSkeletonData(false),
    setClipboardData: (v) =>
      set({ clipboardData: getValueState(v, () => get().clipboardData) }),

    searchText: "",
    setSearchText: (v) =>
      set({ searchText: getValueState(v, () => get().searchText) }),

    deleted: false,
    setDeleted: (v) => set({ deleted: getValueState(v, () => get().deleted) }),

    refreshing: false,
    setRefreshing: (v) =>
      set({ refreshing: getValueState(v, () => get().refreshing) }),

    isLoading: false,
    setIsLoading: (v) =>
      set({ isLoading: getValueState(v, () => get().isLoading) }),

    isLoadingSkeleton: true,
    setIsLoadingSkeleton: (v) =>
      set({
        isLoadingSkeleton: getValueState(v, () => get().isLoadingSkeleton),
      }),

    noMoreData: false,
    setNoMoreData: (v) =>
      set({ noMoreData: getValueState(v, () => get().noMoreData) }),

    isFarFromStart: false,
    setIsFarFromStart: (v) =>
      set({ isFarFromStart: getValueState(v, () => get().isFarFromStart) }),

    inputText: "",
    setInputText: (v) =>
      set({ inputText: getValueState(v, () => get().inputText) }),

    isAddingItem: false,
    setIsAddingItem: (v) =>
      set({ isAddingItem: getValueState(v, () => get().isAddingItem) }),

    settings: clipboardManager.getClipboardData() ?? DEFAULT_SETTINGS,
    setSettings: (v) =>
      set({ settings: getValueState(v, () => get().settings) }),

    initListeners: () => {
      const { isLoggedIn, userData } = sessionManager.getSessionData();
      const currentUserId = userData?.userId ?? null;
      if (!isLoggedIn || (loadedUserId && currentUserId !== loadedUserId)) {
        get().reset();
      }

      const currentSettings = clipboardManager.getClipboardData();
      if (currentSettings) set({ settings: currentSettings });
      set({ noMoreData: pagination.isLatest });

      const paginationListener = pagination.addEventListener(
        "lastDataUpdate",
        (isLast) => {
          set({ noMoreData: isLast });
        },
      );

      const clipboardListener = clipboardManager.addEventListener(
        "items-updated",
        (items) => {
          const { deleted, isLoadingSkeleton } = get();
          if (deleted || isLoadingSkeleton || items.length === 0) return;

          const currentSession = sessionManager.getSessionData();
          const deviceId = storageManagement.get("DEVICE_ID") ?? "";
          const createdAt = new Date().toISOString();

          [...items].reverse().forEach((item) => {
            if (deletedIds.has(item.id)) return;

            get().prependClipboardItem({
              id: item.id,
              content: item.content,
              deleted: false,
              userId: currentSession.userData?.userId ?? "",
              deviceId,
              createdAt,
            });
          });
        },
      );

      const sessionListener = sessionManager.addEventListener("logout", () => {
        get().reset();
      });

      return () => {
        paginationListener.remove();
        clipboardListener.remove();
        sessionListener.remove();
        get().cleanupTimers();
      };
    },

    fetchClipboard: async (searchOverride) => {
      const activeSearch =
        searchOverride !== undefined ? searchOverride : get().searchText;

      if (pagination.isLatest) {
        if (!activeSearch) return;
        if (pagination.totalItems === 0) return;

        const normalized = activeSearch.toLowerCase();
        set({
          clipboardData: pagination.allData.filter(
            (item) =>
              !removedFromViewIds.has(item.id) &&
              !!item.content?.toLowerCase().includes(normalized),
          ),
        });
        return;
      }

      const { sessionToken, userData } = sessionManager.getSessionData();
      if (!sessionToken || !userData?.userId) {
        set({
          refreshing: false,
          isLoading: false,
          isLoadingSkeleton: false,
          clipboardData: [],
        });
        return;
      }

      if (get().isLoading) return;

      const requestId = activeQueryId;
      loadedUserId = userData.userId;
      set({ isLoading: true });

      let data: DB["TablesClient"]["ClipboardSync"][] | null = null;
      try {
        data = await pagination.next();
      } catch (error) {
        logger.error("Error fetching next clipboard page", error);
        if (requestId === activeQueryId) {
          set({
            refreshing: false,
            isLoading: false,
            isLoadingSkeleton: false,
          });
        }
        return;
      }

      if (requestId !== activeQueryId) return;

      Timers.clearTimeout(loadingTimeoutId);
      loadingTimeoutId = Timers.setTimeout(
        () => {
          loadingTimeoutId = null;
          if (requestId !== activeQueryId) return;

          if (data) {
            set({
              clipboardData: pagination.allData,
              refreshing: false,
              isLoading: false,
              isLoadingSkeleton: false,
            });
          } else {
            set({
              refreshing: false,
              isLoading: false,
              isLoadingSkeleton: false,
            });
          }
        },
        pagination.page >= 0 ? 100 : data ? 3000 : 2000,
      );
    },

    handleSearch: (text) => {
      set({ searchText: text });

      if (get().isLoadingSkeleton || get().isLoading) return;

      Timers.clearTimeout(searchTimeoutId);
      searchTimeoutId = null;

      if (!pagination.isLatest || text.length < 3) {
        removedFromViewIds.clear();
        pagination.clear();
      }

      searchTimeoutId = Timers.setTimeout(() => {
        searchTimeoutId = null;
        void get().fetchClipboard(text);
      }, 2000);
    },

    handleToggleDeleted: (value) => {
      const { deleted, searchText } = get();
      if (deleted === value) return;

      get().cleanupTimers();
      activeQueryId += 1;
      removedFromViewIds.clear();
      pagination.clear();

      set({
        deleted: value,
        noMoreData: false,
        refreshing: false,
        isLoading: false,
        isLoadingSkeleton: true,
        clipboardData: getSkeletonData(value),
      });

      void get().fetchClipboard(searchText);
    },

    handleRefresh: () => {
      get().cleanupTimers();
      activeQueryId += 1;
      removedFromViewIds.clear();
      pagination.clear();

      set({
        refreshing: true,
        isLoading: false,
        noMoreData: false,
      });

      void get().fetchClipboard(get().searchText);
    },

    changeClipboardItemDeleted: async (id, deleted) => {
      if (!id) {
        logger.error("No ID provided for deletion");
        return;
      }

      const { sessionToken } = sessionManager.getSessionData();
      if (!sessionToken) {
        logger.error("No session token available");
        return;
      }

      const deviceId = storageManagement.get("DEVICE_ID");

      try {
        const res = await ServerFetch.put(
          "/clipboard/delete/toggle-deleted",
          { body: { id, deleted, deviceId } },
          sessionToken,
        );

        if ("error" in res.data) {
          logger.error(
            "Error deleting clipboard item:",
            ServerError.getMessage(res.data),
          );
          return;
        }

        if (deleted) deletedIds.add(id);
        else deletedIds.delete(id);

        removedFromViewIds.add(id);

        set((state) => ({
          clipboardData: state.clipboardData.filter((item) => item.id !== id),
        }));
      } catch (error) {
        logger.error("Error deleting clipboard item:", error);
      }
    },

    handleDeleteRestoreAll: async () => {
      const { sessionToken } = sessionManager.getSessionData();
      if (!sessionToken) {
        logger.error("No session token available");
        return;
      }

      const deviceId = storageManagement.get("DEVICE_ID");
      const newDeleted = !get().deleted;

      try {
        const res = await ServerFetch.put(
          "/clipboard/delete/toggle-deleted-all",
          {
            body: {
              restore: !newDeleted,
              deviceId,
            },
          },
          sessionToken,
        );

        if ("error" in res.data) {
          logger.error(
            "Error deleting clipboard item:",
            ServerError.getMessage(res.data),
          );
          return;
        }

        if (!newDeleted) deletedIds.clear();
        else get().clipboardData.forEach((item) => deletedIds.add(item.id));

        get().cleanupTimers();
        activeQueryId += 1;
        removedFromViewIds.clear();
        pagination.clear();

        set({
          deleted: newDeleted,
          noMoreData: false,
          refreshing: false,
          isLoading: false,
          isLoadingSkeleton: true,
          clipboardData: getSkeletonData(newDeleted),
        });

        await get().fetchClipboard(get().searchText);
      } catch (error) {
        logger.error("Error deleting clipboard items:", error);
      }
    },

    prependClipboardItem: (item) => {
      const { deleted, isLoadingSkeleton, searchText, clipboardData } = get();
      if (deleted || isLoadingSkeleton) return;

      const normalizedSearch = searchText.trim().toLowerCase();
      if (
        normalizedSearch &&
        !item.content.toLowerCase().includes(normalizedSearch)
      )
        return;

      const exists = clipboardData.some(
        (existing) =>
          existing.id === item.id || existing.content === item.content,
      );
      if (exists) return;

      set({ clipboardData: [item, ...clipboardData] });
    },

    addItemToDatabase: async (t) => {
      const { userData, sessionToken } = sessionManager.getSessionData();

      if (!userData?.userId) {
        modalRef.openSnackBar?.(t("auth.youAreNotLoggedIn"));
        return;
      }

      const { inputText } = get();
      if (!inputText.trim()) {
        modalRef.openSnackBar?.(t("verifications.pleaseEnterSomeText"));
        return;
      }

      if (!sessionToken) {
        modalRef.openSnackBar?.(t("auth.youAreNotLoggedIn"));
        return;
      }

      set({ isAddingItem: true });
      try {
        const deviceId = storageManagement.get("DEVICE_ID");

        const res = await ServerFetch.post(
          "/clipboard/add",
          {
            body: {
              deviceId,
              content: inputText,
            },
          },
          sessionToken,
        );

        if ("error" in res.data) {
          const errMsg = ServerError.getMessage(res.data);

          logger.error("Error adding text to database:", errMsg);
          modalRef.openSnackBar?.(t("common.errorOccurred", { error: errMsg }));
          return;
        }

        deletedIds.delete(res.data.id);
        removedFromViewIds.delete(res.data.id);

        await clipboardManager.addItemToClipboard({
          id: res.data.id,
          content: res.data.content,
        });

        get().prependClipboardItem(res.data);

        modalRef.openSnackBar?.(t("common.textAddedToDatabase"));
        set({ inputText: "" });
      } catch {
        modalRef.openSnackBar?.(t("common.failedToAddTextToDatabase"));
      } finally {
        set({ isAddingItem: false });
      }
    },

    updateSettings: (partial) => {
      set((state) => ({
        settings: {
          ...state.settings,
          ...partial,
        },
      }));
      clipboardManager.setClipboardData(partial);
    },

    cleanupTimers: () => {
      Timers.clearTimeout(searchTimeoutId, loadingTimeoutId);
      searchTimeoutId = null;
      loadingTimeoutId = null;
    },

    reset: () => {
      get().cleanupTimers();
      activeQueryId += 1;
      loadedUserId = null;
      deletedIds.clear();
      removedFromViewIds.clear();
      pagination.clear();

      set({
        deleted: false,
        isLoading: false,
        inputText: "",
        searchText: "",
        refreshing: false,
        noMoreData: false,
        isAddingItem: false,
        clipboardData: getSkeletonData(false),
        isFarFromStart: false,
        isLoadingSkeleton: true,
        settings: clipboardManager.getClipboardData() ?? DEFAULT_SETTINGS,
      });
    },
  };
});
