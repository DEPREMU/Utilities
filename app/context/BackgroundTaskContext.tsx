import {
  SerializableTask,
  MetaInfoFunctions,
  AvailableFunctions,
  FunctionsArguments,
} from "@types";
import React, {
  useRef,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import {
  log,
  signOut,
  logError,
  loadData,
  saveData,
  loadDataSecure,
  setIntervalPolyfill,
  clearIntervalPolyfill,
  executeRegisteredTask,
} from "@utils";
import windowModule from "@/utils/modules/WindowModule";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";
import { useDeviceInformation } from "./DeviceInformationContext";
import { Alert, BackHandler, Platform } from "react-native";
import { getCurrentScreen, navigateReplace } from "@navigation/navigationRef";

type BackgroundTask = () => void | Promise<void>;

type BackgroundTaskWithMeta<T extends AvailableFunctions = AvailableFunctions> =
  {
    task: BackgroundTask;
    meta?: MetaInfoFunctions<T>;
  };

/**
 * Context type for managing background tasks and status bar appearance.
 *
 * @type BackgroundTaskContextType
 */
type BackgroundTaskContextType = {
  /**
   * Executes a background task immediately.
   *
   * @param task - The background task to execute
   */
  runTask: (task: BackgroundTask) => void;

  /**
   * Adds a background task to the execution queue.
   *
   * @param task - The background task to queue
   * @param executeWhenInternet - Optional flag to execute task only when internet is available
   * @param meta - Optional metadata containing function name and arguments
   * @param meta.functionName - The name of the function to execute
   * @param meta.args - Array of arguments to pass to the function
   */
  addTaskQueue: <T extends AvailableFunctions>(
    task: BackgroundTask,
    executeWhenInternet?: boolean,
    meta?: {
      id: string;
      args: FunctionsArguments<T>;
      functionName: T;
    },
    removeTaskWithId?: string,
  ) => void;
};

interface BackgroundTaskProviderProps {
  children: React.ReactNode;
}

const MAX_PENDING_TASKS = 100;

/**
 * BackgroundTaskContext provides a way to manage background tasks and status bar appearance in a React application.
 *
 * It allows adding tasks to a queue and executing them sequentially, running tasks immediately,
 * and controlling the status bar's background color and translucent state.
 *
 * @context
 * @returns {BackgroundTaskContextType} The context value containing `runTask`, `addTaskQueue`,
 * `setBgColorStatusBar`, and `setTranslucentStatusBar` methods.
 */
const BackgroundTaskContext = createContext<BackgroundTaskContextType | null>(
  null,
);

/**
 * BackgroundTaskProvider component that manages background task execution and provides context for the application.
 *
 * This provider handles:
 * - Background task queue management with automatic processing
 * - Task persistence for offline scenarios (tasks are saved and executed when internet is restored)
 * - Status bar configuration (background color and translucency)
 * - Hardware back button handling with confirmation dialogs
 * - Navigation state tracking for current route detection
 *
 * Features:
 * - Queues tasks for immediate execution when internet is available
 * - Persists tasks to storage when offline and executes them when connectivity is restored
 * - Prevents duplicate task processing with internal processing flags
 * - Provides localized confirmation dialogs for app exit and navigation
 * - Manages status bar appearance through context
 *
 * @param props - Component props
 * @param props.children - Child components that will have access to the BackgroundTaskContext
 *
 * @returns JSX element providing BackgroundTaskContext to child components
 *
 * @example
 * ```tsx
 * <BackgroundTaskProvider>
 *   <App />
 * </BackgroundTaskProvider>
 * ```
 */
export const BackgroundTaskProvider: React.FC<BackgroundTaskProviderProps> = ({
  children,
}) => {
  const { t } = useLanguage();
  const { hasInternetRef, hasInternet } = useDeviceInformation();
  const { isLoggedIn, refreshToken, setLoggingIn } = useUserContext();

  const taskQueueRef = useRef<BackgroundTask[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const idRefreshSession = useRef<NodeJS.Timeout | number | null>(null);
  const executeWhenInternetRef = useRef<BackgroundTaskWithMeta[]>([]);

  const persistPendingTasks = useCallback(
    async <T extends AvailableFunctions>(removeTaskWithId?: string) => {
      try {
        const serializableTasks: SerializableTask<T>[] =
          executeWhenInternetRef.current
            .filter(
              (taskWithMeta) =>
                !!taskWithMeta.meta &&
                taskWithMeta.meta.id !== removeTaskWithId,
            )
            .map((taskWithMeta) => {
              const meta = taskWithMeta.meta;
              if (!meta) throw new Error("Meta is required");
              return {
                ...meta,
                timestamp: Date.now(),
              } as SerializableTask<T>;
            });

        await saveData("@pendingTasks", serializableTasks);
      } catch (error) {
        logError("Error persisting tasks:", error);
      }
    },
    [],
  );

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    while (taskQueueRef.current.length > 0) {
      const task = taskQueueRef.current.shift();
      if (!task) continue;

      try {
        await task();
      } catch (err) {
        logError("Error in background task:", err);
      }
    }

    isProcessingRef.current = false;
  }, []);

  const addTaskQueue = useCallback(
    <T extends AvailableFunctions>(
      task: BackgroundTask,
      executeWhenInternet: boolean = false,
      meta?: MetaInfoFunctions<T>,
      removeTaskWithId?: string,
    ) => {
      if (hasInternetRef.current) {
        taskQueueRef.current.push(task);
        processQueue();
        return;
      }

      if (!executeWhenInternet) return processQueue();

      if (!meta) {
        logError(
          "Meta is required for tasks that execute when internet is available",
        );
        return;
      }

      if (executeWhenInternetRef.current.length >= MAX_PENDING_TASKS) {
        logError(
          `Max pending tasks limit (${MAX_PENDING_TASKS}) reached. Removing oldest task.`,
        );
        executeWhenInternetRef.current.shift();
      }

      const metaData = {
        ...meta,
        id:
          meta?.id ||
          Date.now().toString() + Math.random().toString(36).substring(2, 8),
      };
      const taskWithMeta: BackgroundTaskWithMeta = {
        task,
        meta: metaData,
      };

      executeWhenInternetRef.current.push(taskWithMeta);

      persistPendingTasks(removeTaskWithId);
    },
    [processQueue, hasInternetRef, persistPendingTasks],
  );

  const runTask = useCallback(async (task: BackgroundTask) => {
    try {
      await task();
    } catch {
      logError("Error running task:", task);
    }
  }, []);

  useEffect(() => {
    const loadPersistedTasks = async () => {
      try {
        const persistedTasks = await loadData("@pendingTasks");
        if (!persistedTasks || persistedTasks.length === 0) return;

        const rebuiltTasks = persistedTasks.map((taskData) => ({
          task: () =>
            executeRegisteredTask(taskData.functionName, taskData.args),
          meta: {
            id: taskData.id,
            functionName: taskData.functionName,
            args: taskData.args,
          },
        }));

        executeWhenInternetRef.current = rebuiltTasks;
      } catch (error) {
        logError("Error loading persisted tasks:", error);
      }
    };

    loadPersistedTasks();
  }, []);

  useEffect(() => {
    const handlePressYes = (isFirstScreen: boolean) => {
      if (isFirstScreen) return BackHandler.exitApp();
      navigateReplace("Home");
    };

    const onBackPress = () => {
      getCurrentScreen().then((currentScreen) => {
        const isFirstScreen = currentScreen === "Home";

        Alert.alert(
          t(isFirstScreen ? "exitApp" : "back"),
          t(isFirstScreen ? "exitAppMessage" : "backMessage"),
          [
            {
              text: t("no"),
              onPress: () => null,
            },
            {
              text: t("yes"),
              onPress: () => handlePressYes(isFirstScreen),
            },
          ],
        );
      });

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [isLoggedIn, t]);

  useEffect(() => {
    if (!hasInternet) return;
    if (executeWhenInternetRef.current.length === 0) return;

    taskQueueRef.current.push(
      ...executeWhenInternetRef.current.map((t) => t.task),
    );
    executeWhenInternetRef.current = [];

    saveData("@pendingTasks", []);
    processQueue();
  }, [hasInternet, processQueue]);

  useEffect(() => {
    const sendNotificationLoginStatus = (isLoggedIn: boolean) => {
      if (Platform.OS !== "web") return;

      windowModule?.notifyLoginStatus?.(isLoggedIn);
    };

    const handleRefreshSession = async () => {
      try {
        log("Refreshing user session...");
        const [rememberMe, sessionToken] = await Promise.all([
          loadDataSecure("_sessionExpiry"),
          loadDataSecure("_userSessionTokenStorage"),
        ]);

        if (!rememberMe || rememberMe < Date.now()) {
          sendNotificationLoginStatus(false);
          await signOut();
          return;
        }

        if (!sessionToken) {
          sendNotificationLoginStatus(false);
          return;
        }

        await refreshToken(sessionToken);
        sendNotificationLoginStatus(true);
      } catch (error) {
        logError("Error during session refresh:", error);
      } finally {
        setLoggingIn(false);
      }
    };

    const handleRefreshSessionWithInternet = () => {
      const id =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

      addTaskQueue(
        handleRefreshSession,
        true,
        {
          id,
          functionName: "refreshSession",
          args: [],
        },
        id,
      );
    };

    handleRefreshSessionWithInternet();
    idRefreshSession.current = setIntervalPolyfill(
      handleRefreshSessionWithInternet,
      8 * 60 * 60 * 1000,
    );

    return () => {
      if (!idRefreshSession.current) return;

      clearIntervalPolyfill(idRefreshSession.current);
      idRefreshSession.current = null;
    };
  }, [refreshToken, setLoggingIn, addTaskQueue]);

  return (
    <BackgroundTaskContext.Provider value={{ runTask, addTaskQueue }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

/**
 * Custom hook to use the BackgroundTaskContext.
 *
 * @returns {BackgroundTaskContextType} The context value containing the `runTask`,
 * `addTaskQueue`, `updateScreen`, `getCurrentRouteName`, `setBgColorStatusBar`, and `setTranslucentStatusBar` methods.
 *
 * @throws {Error} If used outside of a BackgroundTaskProvider.
 */
export const useBackgroundTask = (): BackgroundTaskContextType => {
  const context = useContext(BackgroundTaskContext);
  if (!context) {
    throw new Error(
      "useBackgroundTask must be used within a BackgroundTaskProvider",
    );
  }
  return context;
};
