import {
  logger,
  fetchToServer,
  sessionManager,
  storageManagement,
  setTimeoutPolyfill,
  tTyped,
} from "@utils";
import { create } from "zustand";
import { openURL } from "expo-linking";
import { modalRef } from "@/app/refs";
import { getValueState } from "@common";
import { DownDetector, GetStatesZustand } from "@types";

type States = GetStatesZustand<{
  data: DownDetector[];
  isLoading: boolean;

  inputNewWebPage: string;
  sendNotification: boolean;
}>;

type Actions = {
  sync: () => void;
  cleanup: () => void;
  addItem: () => void;
  visitLink: (url: string) => void;
  deleteItem: (id: string) => void;
  handleSendNotification: (id: string) => void;
};

export const useDownDetector = create<States & Actions>((set, get) => {
  const skeletonData: DownDetector[] = Array.from({ length: 5 }).map(() => ({
    url: "https://example.com",
    userId: "userId",
    createdAt: new Date().toISOString(),
    sendNotification: false,
  }));

  const returnValue: States & Actions = {
    inputNewWebPage: "",
    setInputNewWebPage: (v) =>
      set({ inputNewWebPage: getValueState(v, () => get().inputNewWebPage) }),

    sendNotification: true,
    setSendNotification: (v) =>
      set({ sendNotification: getValueState(v, () => get().sendNotification) }),

    data: skeletonData,
    setData: (v) => set({ data: getValueState(v, () => get().data) }),

    isLoading: false,
    setIsLoading: (v) =>
      set({ isLoading: getValueState(v, () => get().isLoading) }),

    addItem: async () => {
      const { sessionToken, userData } = sessionManager.getSessionData();

      if (!sessionToken || !userData?.userId)
        return modalRef.openSnackBar?.(tTyped("youAreNotLoggedIn"));

      const text = get().inputNewWebPage.trim();

      if (!text)
        return modalRef.openSnackBar?.(tTyped("pleaseEnterWebPageURL"));
      if (!text.startsWith("http"))
        return modalRef.openSnackBar?.(tTyped("webPageMustStartWithHTTP"));

      set({ isLoading: true });
      try {
        const language = storageManagement.get("LANGUAGE");
        const deviceId = storageManagement.get("DEVICE_ID");

        const res = await fetchToServer(
          "/database/insert",
          {
            lang: language,
            table: "DownDetector",
            deviceId,
            values: {
              createdAt: new Date().toISOString(),
              userId: userData?.userId,
              url: text,
              sendNotification: get().sendNotification,
            },
          },
          sessionToken,
        );
        const { data, error } = res.data || {
          error: res.errorText || "Unknown error",
        };

        if (error) modalRef.openSnackBar?.(tTyped("errorOccurred", { error }));
        else {
          modalRef.openSnackBar?.(tTyped("webPageAddedSuccessfully"));
          set({
            inputNewWebPage: "",
            sendNotification: false,
          });

          if (!data) return;

          const newData = [...get().data, ...data].reduce((acc, val) => {
            if (val.id && !acc.some((item) => item.id === val.id))
              acc.push(val);

            return acc;
          }, [] as DownDetector[]);

          set({ data: newData });
          storageManagement.save("DOWN_DETECTOR_DATA", newData);
        }
      } catch {
        modalRef.openSnackBar?.(tTyped("failedToAddTextToDatabase"));
      } finally {
        setTimeout(() => {
          set({ isLoading: false });
        }, 1000);
      }
    },

    sync: async () => {
      const { sessionToken, userData } = sessionManager.getSessionData();
      if (!sessionToken || !userData?.userId)
        return logger.error("No session token available");

      const deviceId = storageManagement.get("DEVICE_ID");

      try {
        const res = await fetchToServer(
          "/database/fetch",
          {
            lang: storageManagement.get("LANGUAGE"),
            table: "DownDetector",
            match: { userId: userData?.userId },
            deviceId,
          },
          sessionToken,
        );

        const { data, error } = res.data || {
          error: res.errorText || "Unknown error",
        };

        if (!error && data) {
          setTimeoutPolyfill(
            () =>
              set({
                data:
                  data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ??
                  [],
              }),
            2000,
          );
        }
      } catch (error) {
        logger.error("Error fetching downDetector data:", error);
      }
      const fallbackData = storageManagement.get("DOWN_DETECTOR_DATA");
      setTimeoutPolyfill(
        () => set({ data: fallbackData || skeletonData }),
        2000,
      );
    },

    cleanup: () => {
      set({ data: skeletonData });
    },

    handleSendNotification: async (id) => {
      const prevData = get().data;
      const newItem = prevData?.find((item) => item.id === id);

      if (!newItem) return prevData;
      newItem.sendNotification = !newItem.sendNotification;

      const newData = [
        newItem,
        ...(prevData?.filter((item) => item.id !== id) || []),
      ];

      const { sessionToken } = sessionManager.getSessionData();
      if (!sessionToken) return;

      const deviceId = storageManagement.get("DEVICE_ID");
      const language = storageManagement.get("LANGUAGE");

      const res = await fetchToServer(
        "/database/update",
        {
          lang: language,
          table: "DownDetector",
          match: { id },
          values: { sendNotification: newItem.sendNotification },
          deviceId,
        },
        sessionToken,
      );

      const { success, error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) {
        logger.error("Error updating sendNotification status:", error);
      } else if (!success) {
        logger.error("Failed to update sendNotification status");
        return;
      }
      storageManagement.save("DOWN_DETECTOR_DATA", newData);
    },

    visitLink: (url) => {
      if (!url) return;
      openURL(url);
    },

    deleteItem: async (id) => {
      if (!id) return logger.error("No ID provided for deletion");

      const { sessionToken, isLoggedIn } = sessionManager.getSessionData();

      if (!sessionToken || !isLoggedIn) return;

      const deviceId = storageManagement.get("DEVICE_ID");
      const language = storageManagement.get("LANGUAGE");

      const res = await fetchToServer(
        "/database/delete",
        {
          lang: language,
          match: { id },
          table: "DownDetector",
          deviceId,
        },
        sessionToken,
      );
      const { error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) {
        logger.error("Error deleting downDetector item:", error);
        return;
      }

      const prevData = get().data;
      const newData = prevData?.filter((item) => item.id !== id) || [];
      storageManagement.save("DOWN_DETECTOR_DATA", newData);
      set({ data: newData });
    },
  };

  return returnValue;
});
