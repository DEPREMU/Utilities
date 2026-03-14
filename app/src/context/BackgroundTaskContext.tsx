import {
  SerializableTask,
  MetaInfoFunctions,
  AvailableFunctions,
  FunctionsArguments,
} from "@types";
import React, {
  useRef,
  useMemo,
  useEffect,
  useContext,
  createContext,
} from "react";
import {
  alerts,
  logger,
  deviceInfo,
  navigation,
  EventsDeviceInfo,
  storageManagement,
  executeRegisteredTask,
  hasInternetConnection,
} from "@utils";
import { BackHandler } from "react-native";

type BackgroundTask = {
  requiresInternet: boolean;
  func: () => void | Promise<void>;
};

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
  runTaskRef: React.RefObject<(task: BackgroundTask) => void>;

  /**
   * Adds a background task to the execution queue.
   *
   * @param task - The background task to queue
   * @param executeWhenInternet - Optional flag to execute task only when internet is available
   * @param meta - Optional metadata containing function name and arguments
   * @param meta.functionName - The name of the function to execute
   * @param meta.args - Array of arguments to pass to the function
   */
  addTaskQueueRef: React.RefObject<
    <T extends AvailableFunctions>(
      task: BackgroundTask,
      meta?: {
        id: string;
        args: FunctionsArguments<T>;
        functionName: T;
      },
      removeTaskWithId?: string,
    ) => void
  >;
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
const BackgroundTaskContext = createContext<
  BackgroundTaskContextType | undefined
>(undefined);

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
  const taskQueueRef = useRef<BackgroundTask[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const executeWhenInternetRef = useRef<BackgroundTaskWithMeta[]>([]);

  const persistPendingTasksRef = useRef(
    <T extends AvailableFunctions>(removeTaskWithId?: string) => {
      try {
        const serializableTasks: SerializableTask<T>[] =
          executeWhenInternetRef.current
            .filter(
              (taskWithMeta) =>
                taskWithMeta.meta &&
                taskWithMeta.meta.id !== removeTaskWithId &&
                taskWithMeta.meta.functionName !== "refreshSession",
            )
            .map((taskWithMeta) => {
              const meta = taskWithMeta.meta;
              if (!meta) throw new Error("Meta is required");
              return {
                ...meta,
                timestamp: Date.now(),
              } as SerializableTask<T>;
            });

        storageManagement.save("PENDING_TASKS", serializableTasks);
      } catch (error) {
        logger.error("Error persisting tasks:", error);
      }
    },
  );

  const processQueueRef = useRef(async () => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    while (taskQueueRef.current.length > 0) {
      const task = taskQueueRef.current.shift();
      if (!task || typeof task.func !== "function") continue;

      try {
        if (task.requiresInternet) {
          const hasInternet = await hasInternetConnection();
          if (!hasInternet) {
            taskQueueRef.current.unshift(task);
            break;
          }
        }
        await task.func();
      } catch (err) {
        logger.error("Error in background task:", task, "\n", err);
      }
    }

    isProcessingRef.current = false;
  });

  const addTaskQueueRef = useRef(
    <T extends AvailableFunctions>(
      task: BackgroundTask,
      meta?: MetaInfoFunctions<T>,
      removeTaskWithId?: string,
    ) => {
      if (deviceInfo.hasInternet || !task.requiresInternet) {
        taskQueueRef.current.push(task);
        processQueueRef.current();
        return;
      }

      if (!meta) {
        logger.error(
          "Meta is required for tasks that execute when internet is available",
        );
        return;
      }

      if (executeWhenInternetRef.current.length >= MAX_PENDING_TASKS) {
        logger.error(
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

      persistPendingTasksRef.current(removeTaskWithId);
    },
  );

  const runTaskRef = useRef(async (task: BackgroundTask) => {
    try {
      if (!task.requiresInternet) return await task.func();

      const hasInternet = await hasInternetConnection();
      if (!hasInternet) executeWhenInternetRef.current.push({ task });
      else await task.func();
    } catch {
      logger.error("Error running task:", task);
    }
  });

  useEffect(() => {
    const loadPersistedTasks = async () => {
      try {
        const persistedTasks = storageManagement.get("PENDING_TASKS");
        if (!persistedTasks || persistedTasks.length === 0) return;

        const rebuiltTasks = persistedTasks.map((taskData) => ({
          task: {
            func: () =>
              executeRegisteredTask(taskData.functionName, taskData.args),
            requiresInternet: true,
          },
          meta: {
            id: taskData.id,
            functionName: taskData.functionName,
            args: taskData.args,
          },
        }));

        executeWhenInternetRef.current = rebuiltTasks;
      } catch (error) {
        logger.error("Error loading persisted tasks:", error);
      }
    };

    loadPersistedTasks();
  }, []);

  useEffect(() => {
    const handlePressYes = (isFirstScreen: boolean) => {
      if (isFirstScreen) return BackHandler.exitApp();
      navigation.replace("Home");
    };

    const onBackPress = () => {
      const currentScreen = navigation.getCurrentScreen();
      const isFirstScreen = currentScreen === "Home";

      alerts.showAlert(
        `common.${isFirstScreen ? "exitApp" : "back"}`,
        `common.${isFirstScreen ? "exitAppMessage" : "backMessage"}`,
        async (_, accepted) => {
          if (!accepted) return;
          handlePressYes(isFirstScreen);
        },
        { showCancelButton: true },
      );

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (hasInternet) => {
        if (executeWhenInternetRef.current.length === 0) return;
        if (!hasInternet) return;

        taskQueueRef.current.push(
          ...executeWhenInternetRef.current.map((t) => t.task),
        );
        executeWhenInternetRef.current = [];

        storageManagement.save("PENDING_TASKS", []);
        processQueueRef.current();
      },
    );

    return () => removeListener();
  }, []);

  const value: BackgroundTaskContextType = useMemo(
    () => ({
      runTaskRef,
      addTaskQueueRef,
    }),
    [],
  );

  return (
    <BackgroundTaskContext.Provider value={value}>
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
