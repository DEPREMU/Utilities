import { Alert } from "react-native";
import { AppTranslationsKeys, Function } from "@types";

type AskPermission = <R>(
  title: AppTranslationsKeys,
  message: AppTranslationsKeys,
  callback: (doNotAskAgain: boolean, success: boolean) => Promise<R>,
  options?: {
    timeout?: number;
    /** @default false */
    cancelable?: boolean;
    /** @default false */
    addDoNotAskAgain?: boolean;
    /** @default true */
    showCancelButton?: boolean;
    /** @default "labels.accept" */
    acceptButtonText?: AppTranslationsKeys;
    /** @default "labels.cancel" */
    cancelButtonText?: AppTranslationsKeys;
    /** @default "labels.doNotAskAgain" */
    doNotAskAgainButtonText?: AppTranslationsKeys;
  },
) => Promise<Awaited<R> | null>;

const ask: AskPermission = async (
  title,
  message,
  callback,
  options = {
    cancelable: false,
    showCancelButton: true,
    addDoNotAskAgain: false,
  },
) => {
  const { tTyped } = await import("@utils");
  const t = tTyped as Function<[AppTranslationsKeys], string>;

  const result = await new Promise<"accept" | "cancel" | "doNotAskAgain">(
    (resolve) => {
      const accept = () => resolve("accept");
      const cancel = () => resolve("cancel");

      Alert.alert(
        t(title),
        t(message),
        [
          ...((options?.showCancelButton ?? true)
            ? [
                {
                  text: t(options.cancelButtonText ?? "labels.cancel"),
                  style: "cancel" as const,
                  onPress: cancel,
                },
              ]
            : []),
          {
            text: t(options.acceptButtonText ?? "labels.accept"),
            onPress: accept,
          },
          ...(options?.addDoNotAskAgain
            ? [
                {
                  text: t(
                    options.doNotAskAgainButtonText ?? "labels.doNotAskAgain",
                  ),
                  style: "destructive" as const,
                  onPress: () => resolve("doNotAskAgain"),
                },
              ]
            : []),
        ],
        {
          onDismiss: cancel,
          cancelable: options?.cancelable,
        },
      );
    },
  );

  const value = await callback(result === "doNotAskAgain", result === "accept");
  return value as never;
};

class Alerts {
  #queue: (() => Promise<void>)[] = [];
  #isProcessingQueue = false;

  private processQueue = async () => {
    if (this.#isProcessingQueue) return;
    this.#isProcessingQueue = true;

    while (this.#queue.length) {
      const alertFunction = this.#queue.shift();
      if (typeof alertFunction === "function") await alertFunction();
    }

    this.#isProcessingQueue = false;
  };

  public showAlert: AskPermission = async (...args) => {
    const {
      storageManagement,
      setTimeoutPolyfill,
      clearTimeoutPolyfill,
      notificationsManager,
    } = await import("@utils");

    await Promise.all([
      storageManagement.waitUntilInitialized(),
      notificationsManager.waitUntilInitialized(),
    ]);

    if (!storageManagement.hasUI) return null as never;

    const value = new Promise((resolve) => {
      let isResolved = false;

      this.#queue.push(
        () =>
          new Promise<void>((r) => {
            let id: number | null = null;

            const res = (value: unknown, isTimeout: boolean = false) => {
              if (isResolved) return;
              isResolved = true;

              if (!isTimeout) clearTimeoutPolyfill(id);
              r();
              resolve(value);
              this.processQueue();
            };

            id = setTimeoutPolyfill(() => res(null, true), 2 * 60 * 1000);
            ask(...args).then((v) => res(v));
          }),
      );
      this.processQueue();
    });

    return value as never;
  };
}

export const alerts = new Alerts();
