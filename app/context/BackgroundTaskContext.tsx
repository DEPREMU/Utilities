import React, {
  useRef,
  useState,
  useContext,
  useCallback,
  createContext,
  useEffect,
} from "react";
import {
  logError,
  loadData,
  saveData,
  executeRegisteredTask,
  AvailableFunctions,
} from "@utils";
import { useLanguage } from "./LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { useUserContext } from "./UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { ScreensAvailable } from "@types";
import { RootStackParamList } from "@navigation/AppNavigator";
import { useDeviceInformation } from "./DeviceInformationContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Alert, BackHandler, StatusBar } from "react-native";

type BackgroundTask = () => void | Promise<void>;

interface SerializableTask {
  id: string;
  functionName: AvailableFunctions;
  args: unknown[];
  timestamp: number;
}

type BackgroundTaskWithMeta = {
  task: BackgroundTask;
  meta?: {
    id: string;
    functionName: AvailableFunctions;
    args: unknown[];
  };
};

/**
 * Context type for managing background tasks and navigation-related utilities.
 *
 * @remarks
 * This context provides methods for running tasks immediately or queuing them for sequential execution,
 * as well as utilities for updating navigation state and status bar appearance.
 *
 * @property runTask - Executes a given background task immediately, bypassing the queue.
 * @property addTaskQueue - Adds a background task to the queue for sequential execution.
 * @property setBgColorStatusBar - Sets the background color of the status bar.
 * @property setTranslucentStatusBar - Sets the translucency of the status bar.
 */
type BackgroundTaskContextType = {
  /**
   * Runs a given task immediately.
   *
   * @param task - The task to run.
   *
   * @remarks
   * - This function executes the task immediately, without adding it to the queue.
   * - It is useful for tasks that need to be executed right away, rather than waiting for the queue.
   *
   * @example
   * ```tsx
   * const { runTask } = useContext(BackgroundTaskContext);
   * runTask(() => {
   *  log("Task executed immediately");
   * });
   * ```
   *
   * Practical example:
   * ```tsx
   * const { runTask } = useContext(BackgroundTaskContext);
   * const updateDB = async () => {
   * // This function will be executed immediately
   * // This is good for updating a database or making an API call
   * // without blocking the main thread. And avoiding the cancellation of the task
   * // if the user closes the app or navigates to another screen.
   * await fetch("https://example.com/api/update", {
   *  method: "POST",
   * body: JSON.stringify({ data: "new data" }),
   * headers: {
   *     "Content-Type": "application/json",
   * },
   * });
   * log("Database updated");
   * };
   *
   * runTask(updateDB);
   * ```
   *
   */
  runTask: (task: BackgroundTask) => void;

  /**
   * Adds a new background task to the task queue.
   *
   * @param task - The background task to be added to the queue.
   * @param executeWhenInternet - Si es true, la tarea se ejecutará cuando haya internet
   * @param meta - Metadatos para serializar la tarea (opcional)
   *
   * @remarks
   * - This function allows you to queue a task that will be executed later.
   * - The tasks in the queue are executed sequentially, ensuring that each task is completed before the next one starts.
   * - Si se proporciona meta y executeWhenInternet es true, la tarea será persistida y sobrevivirá al cierre de la app
   * @example
   * ```tsx
   * const { addTaskQueue } = useContext(BackgroundTaskContext);
   * addTaskQueue(() => {
   *  log("Task added to queue");
   * });
   * ```
   *
   * Practical example:
   * ```tsx
   * const { addTaskQueue } = useContext(BackgroundTaskContext);
   * const updateDB = async () => {
   *   // This function will be executed in the background
   *   // This is good for updating a database or making an API call
   *   // without blocking the main thread. And avoiding the cancellation of the task
   *   // if the user closes the app or navigates to another screen.
   *   await fetch("https://example.com/api/update", {
   *     method: "POST",
   *     body: JSON.stringify({ data: "new data" }),
   *     headers: {
   *       "Content-Type": "application/json",
   *     },
   *   });
   *   log("Database updated");
   * };
   * addTaskQueue(updateDB);
   *
   * ```
   */
  addTaskQueue: (
    task: BackgroundTask,
    executeWhenInternet?: boolean,
    meta?: {
      functionName: AvailableFunctions;
      args: unknown[];
    },
  ) => void;

  /**
   * Sets the background color of the status bar.
   *
   * @param color - The color to set for the status bar background.
   */
  setBgColorStatusBar: React.Dispatch<React.SetStateAction<string>>;

  /**
   * Sets whether the status bar is translucent.
   *
   * @param translucent - If true, the status bar will be translucent; otherwise, it will not be.
   */
  setTranslucentStatusBar: React.Dispatch<React.SetStateAction<boolean>>;
};

interface BackgroundTaskProviderProps {
  children: React.ReactNode;
}

/**
 * BackgroundTaskContext provides a way to manage background tasks in a React application.
 *
 * It allows adding tasks to a queue and executing them sequentially, as well as
 * updating the current screen in the navigation stack.
 *
 * @context
 * @returns {BackgroundTaskContextType} The context value containing the `runTask` and `addTaskQueue`.
 */
const BackgroundTaskContext = createContext<BackgroundTaskContextType | null>(
  null,
);

/**
 * A React context provider component for managing background tasks.
 *
 * This provider maintains a queue of background tasks and ensures they are executed
 * sequentially. It provides methods to add tasks to the queue and to run tasks directly.
 *
 * @param children - The child components that will have access to the context.
 *
 * @returns A context provider that supplies the `runTask` and `addTaskQueue` methods.
 *
 * @remarks
 * - The `tasksQueue` state holds the queue of background tasks.
 * - The `addTaskQueue` function adds a new task to the queue.
 * - The `runTask` function executes a given task immediately.
 * - The `useEffect` hook monitors the `tasksQueue` and ensures tasks are executed
 *   sequentially, removing each task from the queue after execution.
 *
 * @example
 * ```tsx
 * const { addTaskQueue } = useContext(BackgroundTaskContext);
 *
 * addTaskQueue(() => {
 *   log("Task 1 executed");
 * });
 * ```
 *
 * Practical example:
 * ```tsx
 * const { addTaskQueue } = useContext(BackgroundTaskContext);
 * const updateDB = async () => {
 * // This function will be executed in the background
 * // This is good for updating a database or making an API call
 * // without blocking the main thread. And avoiding the cancellation of the task
 * // if the user closes the app or navigates to another screen.
 * await fetch("https://example.com/api/update", {
 *  method: "POST",
 *  body: JSON.stringify({ data: "new data" }),
 *  headers: {
 *      "Content-Type": "application/json",
 *  },
 *  });
 *  log("Database updated");
 * };
 *
 * addTaskQueue(updateDB);
 * ```
 *
 */
export const BackgroundTaskProvider: React.FC<BackgroundTaskProviderProps> = ({
  children,
}) => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { hasInternet } = useDeviceInformation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [bgColorStatusBar, setBgColorStatusBar] =
    useState<string>("transparent");
  const [translucentStatusBar, setTranslucentStatusBar] =
    useState<boolean>(true);
  const [currentRouteName, setCurrentRouteName] =
    useState<ScreensAvailable>("Home");

  const taskQueueRef = useRef<BackgroundTask[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const executeWhenInternetRef = useRef<BackgroundTaskWithMeta[]>([]);

  useEffect(() => {
    const loadPersistedTasks = async () => {
      try {
        const persistedTasks =
          await loadData<SerializableTask[]>("@pendingTasks");
        if (persistedTasks && persistedTasks.length > 0) {
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
        }
      } catch (error) {
        logError("Error loading persisted tasks:", error);
      }
    };

    loadPersistedTasks();
  }, []);

  const persistPendingTasks = useCallback(async () => {
    try {
      const serializableTasks: SerializableTask[] =
        executeWhenInternetRef.current
          .filter((taskWithMeta) => taskWithMeta.meta)
          .map((taskWithMeta) => {
            const meta = taskWithMeta.meta;
            if (!meta) throw new Error("Meta is required");
            return {
              id: meta.id,
              functionName: meta.functionName,
              args: meta.args,
              timestamp: Date.now(),
            };
          });

      await saveData("@pendingTasks", serializableTasks);
    } catch (error) {
      logError("Error persisting tasks:", error);
    }
  }, []);

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
    (
      task: BackgroundTask,
      executeWhenInternet: boolean = false,
      meta?: {
        functionName: AvailableFunctions;
        args: unknown[];
      },
    ) => {
      if (hasInternet) {
        taskQueueRef.current.push(task);
        return;
      }

      if (executeWhenInternet) {
        if (!meta) {
          logError(
            "Meta is required for tasks that execute when internet is available",
          );
          return;
        }
        const metaData = {
          ...meta,
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 8),
        };
        const taskWithMeta: BackgroundTaskWithMeta = {
          task,
          meta: metaData,
        };

        executeWhenInternetRef.current.push(taskWithMeta);

        persistPendingTasks();
      }

      processQueue();
    },
    [processQueue, hasInternet, persistPendingTasks],
  );

  const runTask = useCallback(async (task: BackgroundTask) => {
    try {
      await task();
    } catch {
      logError("Error running task:", task);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      "state",
      ({ data: { state } }) => {
        const route = state?.routes?.[state?.index || 0];
        const routeName = route?.name || "Home";
        setCurrentRouteName(routeName);
      },
    );

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const handlePressYes = (isHomeScreen: boolean) => {
      if (isHomeScreen) return BackHandler.exitApp();
      navigateReplace("Home");
    };

    const onBackPress = () => {
      const isHomeScreen = currentRouteName === "Home";

      Alert.alert(
        t(isHomeScreen || !isLoggedIn ? "exitApp" : "back"),
        t(isHomeScreen || !isLoggedIn ? "exitAppMessage" : "backMessage"),
        [
          {
            text: t("no"),
            onPress: () => null,
          },
          {
            text: t("yes"),
            onPress: () => handlePressYes(isHomeScreen),
          },
        ],
      );

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return subscription.remove;
  }, [currentRouteName, isLoggedIn, t]);

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

  return (
    <BackgroundTaskContext.Provider
      value={{
        runTask,
        addTaskQueue,
        setBgColorStatusBar,
        setTranslucentStatusBar,
      }}
    >
      <StatusBar
        backgroundColor={bgColorStatusBar}
        translucent={translucentStatusBar}
      />
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
