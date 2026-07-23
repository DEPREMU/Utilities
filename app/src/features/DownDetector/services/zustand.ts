import { create } from "zustand";
import { openURL } from "expo-linking";
import { modalRef } from "@/app/refs";
import { GetStatesZustand } from "@types";
import { ServerFetch, Timers, getValueState } from "@common";
import { logger, tTyped, sessionManager, storageManagement } from "@utils";

type States = GetStatesZustand<{
  data: DB["TablesClient"]["DownDetector"][];
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
  const skeletonData: DB["TablesClient"]["DownDetector"][] = Array.from({
    length: 5,
  }).map(() => ({
    id: "skeleton",
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
        return modalRef.openSnackBar?.(tTyped("auth.youAreNotLoggedIn"));

      const text = get().inputNewWebPage.trim();

      if (!text)
        return modalRef.openSnackBar?.(
          tTyped("downDetector.pleaseEnterWebPageURL"),
        );
      if (!text.startsWith("http"))
        return modalRef.openSnackBar?.(
          tTyped("downDetector.webPageMustStartWithHTTP"),
        );

      set({ isLoading: true });
      try {
        const deviceId = storageManagement.get("DEVICE_ID");

        const res = await ServerFetch.post(
          "/down-detector/add",
          {
            deviceId,
            values: {
              url: text,
              sendNotification: get().sendNotification,
            },
          },
          sessionToken,
        );
        if ("error" in res.data) {
          modalRef.openSnackBar?.(
            tTyped("common.errorOccurred", { error: res.data.error }),
          );
          return;
        }
        const data = res.data;

        modalRef.openSnackBar?.(
          tTyped("downDetector.webPageAddedSuccessfully"),
        );
        set({
          inputNewWebPage: "",
          sendNotification: false,
        });

        if (!data) return;

        const newData = [...get().data, data].reduce(
          (acc, val) => {
            if (val.id && !acc.some((item) => item.id === val.id))
              acc.push(val);

            return acc;
          },
          [] as DB["TablesClient"]["DownDetector"][],
        );

        set({ data: newData });
        storageManagement.save("DOWN_DETECTOR_DATA", newData);
      } catch {
        modalRef.openSnackBar?.(tTyped("common.failedToAddTextToDatabase"));
      } finally {
        Timers.setTimeout(() => {
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
        const res = await ServerFetch.get(
          "/down-detector/:deviceId",
          { deviceId },
          sessionToken,
        );

        if ("error" in res.data) {
          logger.error("Error fetching downDetector data:", res.data.error);
          return;
        }

        const data = res.data.downDetectors;

        if (data) {
          Timers.originalSetTimeout(
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
      Timers.originalSetTimeout(
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

      const res = await ServerFetch.put(
        "/down-detector/update",
        {
          id,
          deviceId,
          values: { sendNotification: newItem.sendNotification },
        },
        sessionToken,
      );

      if ("error" in res.data) {
        logger.error("Error updating sendNotification status:", res.data.error);
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

      const res = await ServerFetch.delete(
        "/down-detector/:deviceId/:downDetectorId",
        { deviceId, downDetectorId: id },
        sessionToken,
      );

      if (res.data.error) {
        logger.error("Error deleting downDetector item:", res.data.error);
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
