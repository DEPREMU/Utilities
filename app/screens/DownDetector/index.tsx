import {
  logError,
  fetchToServer,
  saveDataStorage,
  loadDataStorage,
  setTimeoutPolyfill,
  checkLanguage,
} from "@utils";
import DownDetector from "./DownDetector";
import AddNewWebPage from "./AddNewWebPage";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import GetBottomNavigation from "@components/common/GetBottomNavigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tables, TablesKeys, DownDetector as DownDetectorType } from "@types";

const tableName: TablesKeys = "DownDetector" as const;
const skeletonData: Tables[typeof tableName][] = Array.from({ length: 5 }).map(
  () =>
    ({
      userId: "userId",
      createdAt: new Date().toISOString(),
      interval: 0,
      sendNotification: false,
      url: "https://example.com",
    }) as Tables[typeof tableName],
);

const DownDetectorNavigator: React.FC = () => {
  const { language } = useLanguage();
  const { userData, sessionToken, dataRef } = useUserContext();

  const [downDetectorData, setDownDetectorData] = useState<
    Tables[typeof tableName][] | null
  >(skeletonData);

  const addNewItemRef = useRef((item: DownDetectorType) => {
    setDownDetectorData((prevData) => {
      const newData = prevData ? [item, ...prevData] : [item];
      saveDataStorage("DOWN_DETECTOR_DATA", newData);
      return newData;
    });
  });

  const deleteDownDetectorItemRef = useRef(async (id: string) => {
    if (!id) return logError("No ID provided for deletion");

    const { sessionToken } = dataRef.current;

    if (!sessionToken) return logError("No session token available");

    const [deviceId, language] = await Promise.all([
      loadDataStorage("DEVICE_ID"),
      checkLanguage(),
    ]);

    const res = await fetchToServer(
      "/database/delete",
      {
        lang: language,
        match: { id },
        table: tableName,
        deviceId,
      },
      sessionToken,
    );
    const { error } = res.data || {
      error: res.errorText || "Unknown error",
    };

    if (error) {
      logError("Error deleting downDetector item:", error);
      return;
    }

    setDownDetectorData((prevData) => {
      const newData = prevData?.filter((item) => item.id !== id) || null;
      saveDataStorage("DOWN_DETECTOR_DATA", newData);

      return newData;
    });
  });

  const handleSendNotificationRef = useRef(async (id: string) => {
    setDownDetectorData((prevData) => {
      const newItem = prevData?.find((item) => item.id === id);

      if (!newItem) return prevData;
      newItem.sendNotification = !newItem.sendNotification;

      const newData = [
        newItem,
        ...(prevData?.filter((item) => item.id !== id) || []),
      ];

      loadDataStorage("DEVICE_ID").then(async (deviceId) => {
        const { sessionToken } = dataRef.current;
        if (!sessionToken) return logError("No session token available");

        const language = await checkLanguage();

        fetchToServer(
          "/database/update",
          {
            lang: language,
            table: tableName,
            match: { id },
            values: { sendNotification: newItem.sendNotification },
            deviceId,
          },
          sessionToken,
        ).then((res) => {
          const { success, error } = res.data || {
            error: res.errorText || "Unknown error",
          };

          if (error) {
            logError("Error updating sendNotification status:", error);
          } else if (!success) {
            logError("Failed to update sendNotification status");
            setDownDetectorData(prevData);
            return;
          }
          saveDataStorage("DOWN_DETECTOR_DATA", newData);
        });
      });
      return newData;
    });
  });

  useEffect(() => {
    if (!userData?.userId) return;

    const fetchDownDetectorDataFromDatabase = async () => {
      if (!sessionToken) return logError("No session token available");

      const deviceId = await loadDataStorage("DEVICE_ID");

      try {
        const res = await fetchToServer(
          "/database/fetch",
          {
            lang: language,
            table: tableName,
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
              setDownDetectorData(
                (Array.isArray(data) ? data : [data]).sort((a, b) =>
                  b.createdAt.localeCompare(a.createdAt),
                ) ?? null,
              ),
            2000,
          );
        }
      } catch (error) {
        logError("Error fetching downDetector data:", error);
      }
      const fallbackData = await loadDataStorage("DOWN_DETECTOR_DATA");
      setTimeoutPolyfill(() => setDownDetectorData(fallbackData || null), 2000);
    };

    fetchDownDetectorDataFromDatabase();
  }, [userData?.userId, sessionToken, language]);

  const returnValue = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "downDetector",
            title: "downDetector",
            focusedIcon: "cloud-alert",
          },
          { key: "addNewWebPage", title: "addNewWebPage", focusedIcon: "sync" },
        ],
        {
          downDetector: () => (
            <DownDetector
              downDetectorData={downDetectorData}
              deleteDownDetectorItem={(id) =>
                deleteDownDetectorItemRef.current(id)
              }
              handleSendNotification={(id) =>
                handleSendNotificationRef.current(id)
              }
            />
          ),
          addNewWebPage: () => (
            <AddNewWebPage
              addNewItem={(item) => addNewItemRef.current(item)}
              downDetectorData={downDetectorData}
            />
          ),
        },
      )(),
    [downDetectorData],
  );

  return <>{returnValue}</>;
};

export default DownDetectorNavigator;
