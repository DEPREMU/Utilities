import { Alert } from "react-native";
import { typeLanguagesKeys } from "@types";

type AskPermission = <R>(
  title: typeLanguagesKeys,
  message: typeLanguagesKeys,
  callback: (doNotAskAgain: boolean, success: boolean) => Promise<R>,
  options?: {
    timeout?: number;
    cancelable?: boolean;
    addDoNotAskAgain?: boolean;
  },
) => Promise<Awaited<R> | null>;

const ask: AskPermission = async (title, message, callback, options = {}) => {
  const { tTyped } = await import("@utils");

  const result = await new Promise<"accept" | "cancel" | "doNotAskAgain">(
    (resolve) => {
      const accept = () => resolve("accept");
      const cancel = () => resolve("cancel");
      const doNotAskAgain = () => resolve("doNotAskAgain");

      Alert.alert(
        tTyped(title),
        tTyped(message),
        [
          {
            text: tTyped("accept"),
            onPress: accept,
          },
          {
            text: tTyped("labels.cancel"),
            style: "cancel",
            onPress: cancel,
          },
          ...(options?.addDoNotAskAgain
            ? [
                {
                  text: tTyped("labels.doNotAskAgain"),
                  style: "destructive" as const,
                  onPress: doNotAskAgain,
                },
              ]
            : []),
        ],
        {
          onDismiss: cancel,
          cancelable: options?.cancelable ?? false,
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
    const { setTimeoutPolyfill, clearTimeoutPolyfill, storageManagement } =
      await import("@utils");

    await storageManagement.waitUntilLoaded();

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
