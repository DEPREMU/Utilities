import {
  logError,
  getRouteAPI,
  fetchOptions,
  saveDataSecure,
  loadDataSecure,
} from "@utils";
import {
  Tables,
  TablesKeys,
  DownDetector as DownDetectorType,
  RequestDatabaseFetch,
  RequestDatabaseDelete,
  RequestDatabaseUpdate,
  ResponseDatabaseFetch,
  ResponseDatabaseDelete,
  ResponseDatabaseUpdate,
} from "@types";
import DownDetector from "./DownDetector";
import AddNewWebPage from "./AddNewWebPage";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { BottomNavigation } from "react-native-paper";
import useStylesDownDetectorNavigator from "@styles/screens/downDetector/useStylesDownDetectorNavigator";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
  const { t, language } = useLanguage();
  const { userData, sessionToken } = useUserContext();
  const { styles, accent, primary } = useStylesDownDetectorNavigator();

  const [index, setIndex] = useState<number>(0);
  const [downDetectorData, setDownDetectorData] = useState<
    Tables[typeof tableName][] | null
  >(skeletonData);

  const addNewItem = useCallback((item: DownDetectorType) => {
    setDownDetectorData((prevData) => {
      const newData = prevData ? [item, ...prevData] : [item];
      saveDataSecure("_downDetectorData", newData);
      return newData;
    });
  }, []);

  const deleteDownDetectorItem = useCallback(
    async (id: string) => {
      if (!id) return logError("No ID provided for deletion");
      if (!sessionToken) return logError("No session token available");

      const [url, deviceId] = await Promise.all([
        getRouteAPI("/database/delete"),
        loadDataSecure("_deviceId"),
      ]);
      const { error } = (await fetch(
        url,
        fetchOptions<RequestDatabaseDelete<typeof tableName>>(
          "POST",
          {
            lang: language,
            deviceId: deviceId || "local-device",
            match: { id },
            table: tableName,
          },
          sessionToken,
        ),
      ).then((res) => res.json())) as ResponseDatabaseDelete;

      if (error) {
        logError("Error deleting downDetector item:", error);
        return;
      }

      setDownDetectorData((prevData) => {
        const newData = prevData?.filter((item) => item.id !== id) || null;
        saveDataSecure("_downDetectorData", newData);

        return newData;
      });
    },
    [sessionToken, language],
  );

  const handleSendNotification = useCallback(
    async (id: string) => {
      setDownDetectorData((prevData) => {
        const newItem = prevData?.find((item) => item.id === id);

        if (!newItem) return prevData;
        newItem.sendNotification = !newItem.sendNotification;

        const newData = [
          newItem,
          ...(prevData?.filter((item) => item.id !== id) || []),
        ];

        getRouteAPI("/database/update").then(async (url) => {
          if (!sessionToken) return logError("No session token available");

          const deviceId = await loadDataSecure("_deviceId");

          fetch(
            url,
            fetchOptions<RequestDatabaseUpdate<typeof tableName>>(
              "POST",
              {
                lang: language,
                deviceId: deviceId || "local-device",
                table: tableName,
                match: { id },
                values: { sendNotification: newItem.sendNotification },
              },
              sessionToken,
            ),
          ).then(async (res) => {
            const { success, error } =
              (await res.json()) as ResponseDatabaseUpdate<typeof tableName>;

            if (error) {
              logError("Error updating sendNotification status:", error);
            } else if (!success) {
              logError("Failed to update sendNotification status");
              setDownDetectorData(prevData);
              return;
            }
            saveDataSecure("_downDetectorData", newData);
          });
        });
        return newData;
      });
    },
    [sessionToken, language],
  );

  const routes = useMemo(
    () => [
      {
        key: "downDetector",
        title: t("downDetector"),
        focusedIcon: "cloud-alert",
      },
      { key: "addNewWebPage", title: t("addNewWebPage"), focusedIcon: "sync" },
    ],
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        downDetector: () => (
          <DownDetector
            downDetectorData={downDetectorData}
            deleteDownDetectorItem={deleteDownDetectorItem}
            handleSendNotification={handleSendNotification}
          />
        ),
        addNewWebPage: () => (
          <AddNewWebPage
            addNewItem={addNewItem}
            downDetectorData={downDetectorData}
          />
        ),
      }),
    [
      addNewItem,
      downDetectorData,
      deleteDownDetectorItem,
      handleSendNotification,
    ],
  );

  useEffect(() => {
    if (!userData?.userId) return;

    const fetchDownDetectorDataFromDatabase = async () => {
      if (!sessionToken) return logError("No session token available");

      const [url, deviceId] = await Promise.all([
        getRouteAPI("/database/fetch"),
        loadDataSecure("_deviceId"),
      ]);

      try {
        const res = await fetch(
          url,
          fetchOptions<RequestDatabaseFetch<typeof tableName>>(
            "POST",
            {
              table: tableName,
              deviceId: deviceId || "local-device",
              match: { userId: userData?.userId },
              lang: language,
            },
            sessionToken,
          ),
        );

        const { data, error } = (await res.json()) as ResponseDatabaseFetch<
          typeof tableName
        >;

        if (!error && data) {
          setTimeout(
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
      const fallbackData = await loadDataSecure("_downDetectorData");
      setTimeout(() => setDownDetectorData(fallbackData || null), 2000);
    };

    fetchDownDetectorDataFromDatabase();
  }, [userData?.userId, sessionToken, language]);

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      barStyle={styles.tabBar}
      activeColor={primary}
      inactiveColor={accent}
    />
  );
};

export default DownDetectorNavigator;
