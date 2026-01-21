import {
  ASSETS,
  isFalsy,
  openURL,
  logError,
  clearRefs,
  capitalize,
  fetchToServer,
  saveDataStorage,
  loadDataStorage,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { Streamer } from "@types";
import { useModal } from "@context/ModalContext";
import { cloneDeep } from "lodash";
import { useLanguage } from "@context/LanguageContext";
import { useBackground } from "@context/BackgroundContext";
import { useUserContext } from "@context/UserContext";
import { View, ScrollView } from "react-native";
import { useNotifications } from "@context/NotificationsContext";
import { useStylesStreamers } from "@styles/screens/SocialMedia/useStylesStreamers";
import { Text, TextInput, Card, Avatar, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StreamerWithIsLive = Streamer & { isLive: boolean };

const Streamers: React.FC = () => {
  const { styles } = useStylesStreamers();
  const { t, language } = useLanguage();
  const { hasInternet } = useBackground();
  const { userData, sessionToken } = useUserContext();
  const { openModalRef, closeModalRef } = useModal();
  const { notifications, setNotifications } = useNotifications();

  const [streamer, setStreamer] = useState<string>("");
  const [streamers, setStreamers] = useState<StreamerWithIsLive[]>([]);
  const streamersLoaded = useRef<boolean | null>(false);

  const addingStreamer = useCallback(async () => {
    if (isFalsy(streamer)) return;
    if (isFalsy(userData?.userId)) return;

    if (
      streamers.find(
        (element) =>
          element.name.replace(/\s/g, "").toLowerCase() ===
          streamer.replace(/\s/g, "").toLowerCase(),
      )
    ) {
      openModalRef.current(
        t("error"),
        t("streamerAlreadyAdded", { name: streamer }),
        <Button
          label={t("common.close")}
          handlePress={closeModalRef.current}
        />,
      );
      return;
    }

    try {
      const res = await fetchToServer("/addStreamer", {
        name: streamer,
        userId: userData?.userId || "",
      });

      const data = res.data;

      if (!data || data.error) {
        logError(
          data?.error || res.errorText || "Unknown error adding streamer",
        );
        return;
      }
      if (!data.success || !data.streamer) {
        logError("Failed to add streamer");
        return;
      }

      if (Object.keys(data.streamer || {}).length > 3) {
        setStreamers((prev) => [...prev, data.streamer as StreamerWithIsLive]);
        setNotifications((prev) => {
          if (!prev || !userData?.userId) return prev;
          const newNotifications = cloneDeep(prev);
          newNotifications.enabled.streamers = {
            ...(newNotifications.enabled?.streamers || {}),
            [streamer]: { name: data.streamer?.name || "", enabled: false },
          };

          return newNotifications;
        });
      }
    } catch (error) {
      logError(error);
      return;
    }

    setStreamer("");
  }, [
    t,
    streamer,
    streamers,
    openModalRef,
    closeModalRef,
    userData?.userId,
    setNotifications,
  ]);

  const addStreamer = useCallback(() => {
    addingStreamer();
    closeModalRef.current();
  }, [addingStreamer, closeModalRef]);

  const askAddStreamer = useCallback(async () => {
    if (!hasInternet) return;

    const streamerName = capitalize(streamer);
    openModalRef.current(
      t("askAddStreamerTitle"),
      t("askAddStreamerBody", { name: streamerName }),
      <>
        <Button label={t("yes")} handlePress={addStreamer} />
        <Button label={t("no")} handlePress={closeModalRef.current} />
      </>,
    );
  }, [addStreamer, closeModalRef, openModalRef, streamer, t, hasInternet]);

  const deleteStreamer = useCallback(
    async (id: string) => {
      closeModalRef.current();
      if (!userData?.userId || isFalsy(id) || !sessionToken) return;

      const deviceId = await loadDataStorage("DEVICE_ID");

      const res = await fetchToServer(
        "/database/delete",
        {
          lang: language,
          table: "Streamers",
          match: { id, userId: userData?.userId },
          deviceId,
        },
        sessionToken,
      );
      const { error } = res.data || { error: res.errorText || "Unknown error" };

      if (error) {
        logError(error);
        openModalRef.current(
          t("error"),
          t("errorDeletingStreamer", { error }),
          <Button
            label={t("common.close")}
            handlePress={closeModalRef.current}
          />,
        );
        return;
      }

      setStreamers((prev) => {
        const streamerExists = prev.find((streamer) => streamer.id === id);
        if (streamerExists)
          fetchToServer(
            "/database/delete",
            {
              lang: language,
              table: "UserNotificationsConfig",
              deviceId,
              match: {
                userId: userData?.userId,
                reason: "streamers",
                streamer: streamerExists.name,
              },
            },
            sessionToken,
          );

        return prev.filter((streamer) => streamer.id !== id);
      });
      setNotifications((prev) => {
        if (!prev || !userData?.userId) return prev;
        const newNotifications = cloneDeep(prev);

        if (newNotifications.enabled.streamers[id])
          delete newNotifications.enabled.streamers[id];

        return newNotifications;
      });
    },
    [
      t,
      language,
      openModalRef,
      sessionToken,
      closeModalRef,
      userData?.userId,
      setNotifications,
    ],
  );

  const askDeleteStreamer = useCallback(
    (streamer: Streamer) => {
      if (!hasInternet) return;

      const streamerName = capitalize(streamer.name || streamer.id || "");
      openModalRef.current(
        t("askDeleteStreamer"),
        t("askDeleteStreamerBody", { name: streamerName }),
        <>
          <Button
            label={t("yes")}
            handlePress={deleteStreamer}
            argsFuncHandlePress={[streamer.id || ""]}
          />
          <Button label={t("no")} handlePress={closeModalRef.current} />
        </>,
      );
    },
    [closeModalRef, openModalRef, t, deleteStreamer, hasInternet],
  );

  const handleOpenURLStreamer = useCallback(
    (url: string) => {
      if (isFalsy(url)) return;
      closeModalRef.current();
      openURL(url);
    },
    [closeModalRef],
  );

  const openURLStreamer = useCallback(
    (name: string) => {
      if (isFalsy(name)) return;
      const url = `https://www.twitch.tv/${name?.toLowerCase()}`;
      openModalRef.current(
        t("openURL"),
        t("askOpenURL", { url }),
        <>
          <Button
            label={t("yes")}
            handlePress={handleOpenURLStreamer}
            argsFuncHandlePress={[url]}
          />
          <Button label={t("no")} handlePress={closeModalRef.current} />
        </>,
      );
    },
    [t, openModalRef, closeModalRef, handleOpenURLStreamer],
  );

  const toggleNotifications = useCallback(
    async (streamerName: string, newBool: boolean) => {
      if (!streamerName || !notifications || !setNotifications || !hasInternet)
        return;

      setNotifications((prev) => {
        if (!prev) return prev;

        const newNotifications = cloneDeep(prev);
        newNotifications.enabled.streamers = {
          ...(newNotifications.enabled?.streamers || {}),
          [streamerName]: {
            ...newNotifications.enabled.streamers[streamerName],
            enabled: newBool,
          },
        };

        return newNotifications;
      });
      if (!userData?.userId || !sessionToken) return;

      const deviceId = await loadDataStorage("DEVICE_ID");

      await fetchToServer(
        "/database/update",
        {
          lang: language,
          table: "UserNotificationsConfig",
          deviceId,
          match: {
            userId: userData?.userId,
            reason: "streamers",
            streamer: streamerName,
          },
          values: { enabled: newBool },
        },
        sessionToken,
      );
    },
    [
      notifications,
      setNotifications,
      userData?.userId,
      hasInternet,
      language,
      sessionToken,
    ],
  );

  useEffect(() => {
    streamersLoaded.current = streamers.length > 0;

    return () => clearRefs(streamersLoaded);
  }, [streamers]);

  useEffect(() => {
    if (!userData?.userId || !hasInternet) {
      openModalRef.current(
        t("error"),
        t("youAreNotLoggedIn"),
        <Button
          label={t("common.close")}
          handlePress={closeModalRef.current}
        />,
      );
      return;
    }

    const loadStreamers = async () => {
      try {
        if (!userData?.userId || !sessionToken) return;

        const deviceId = await loadDataStorage("DEVICE_ID");

        const res = await fetchToServer(
          "/database/fetch",
          {
            lang: language,
            table: "Streamers",
            match: { userId: userData?.userId },
            deviceId,
          },
          sessionToken,
        );
        const { data: internetData, error } = res.data || {
          error: res.errorText || "Unknown error",
        };

        if (error) {
          logError(error);
          openModalRef.current(
            t("error"),
            t("errorLoadingStreamers"),
            <Button
              label={t("common.close")}
              handlePress={closeModalRef.current}
            />,
          );
          return;
        }

        const data = Array.isArray(internetData)
          ? internetData
          : internetData
            ? [internetData]
            : [];

        if (data && data.length === 0) return;
        if (!data) {
          openModalRef.current(
            t("error"),
            t("errorLoadingStreamers"),
            <Button
              label={t("common.close")}
              handlePress={closeModalRef.current}
            />,
          );
          return;
        }

        const allStreamers: StreamerWithIsLive[] = data.map(
          (streamer: Streamer) => {
            return { ...streamer, isLive: false } as StreamerWithIsLive;
          },
        );

        let newData: StreamerWithIsLive[] | null = null;
        if (hasInternet)
          newData = await Promise.all(
            allStreamers.map(async (streamer: StreamerWithIsLive) => {
              const res = await fetchToServer("/getIsLiveStreamer", {
                streamer,
              });
              const result = res.data;

              return result?.streamer || { ...streamer, isLive: false };
            }),
          );

        setStreamers(newData ? newData : allStreamers);
        saveDataStorage("STREAMERS", allStreamers);
      } catch (error) {
        logError(error);
      }
    };

    if (!streamersLoaded.current) loadStreamers();
    const id = setIntervalPolyfill(loadStreamers, 15000);

    return () => clearIntervalPolyfill(id);
  }, [
    t,
    userData?.userId,
    language,
    hasInternet,
    openModalRef,
    sessionToken,
    closeModalRef,
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("streamers")}</Text>
      <View style={styles.containerAdd}>
        <TextInput
          style={styles.textInput}
          placeholder={t("addStreamer")}
          onChangeText={setStreamer}
          value={streamer}
        />
        <Button
          label={t("addStreamer")}
          handlePress={askAddStreamer}
          disabled={streamer.trim() === ""}
          touchableOpacity
          replaceStyles={{
            button: styles.buttonAdd,
            textButton: styles.textButton,
          }}
        />
      </View>
      <Text style={styles.yourStreamers}>{t("yourStreamers")}</Text>
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {streamers.map((streamer, index) => {
          const notificationsEnabled =
            notifications?.enabled.streamers?.[streamer.name]?.enabled || false;

          return (
            <Card key={index} style={styles.containerStreamer}>
              <Card.Content>
                <View style={styles.containerImageAndName}>
                  <Avatar.Image
                    size={80}
                    source={
                      streamer.linkImage
                        ? { uri: streamer.linkImage }
                        : ASSETS.icon
                    }
                  />
                  <Text style={styles.nameStreamer}>
                    {capitalize(streamer.name)}
                  </Text>
                </View>

                <View style={styles.containerData}>
                  <Text
                    style={
                      streamer.isLive
                        ? styles.isLiveStreamer
                        : styles.isNotLiveStreamer
                    }
                  >
                    {streamer.isLive ? t("Live") : t("Offline")}
                  </Text>

                  <View style={styles.containerButtons}>
                    <Button
                      label={t("openURL")}
                      argsFuncHandlePress={[streamer.name]}
                      handlePress={openURLStreamer}
                      touchableOpacity
                      replaceStyles={{
                        button: styles.buttonVisit,
                        textButton: styles.textButton,
                      }}
                    />

                    <Button
                      label={t("delete")}
                      argsFuncHandlePress={[streamer]}
                      handlePress={askDeleteStreamer}
                      touchableOpacity
                      replaceStyles={{
                        button: styles.buttonDelete,
                        textButton: styles.textButton,
                      }}
                    />
                  </View>
                </View>
              </Card.Content>
              <View style={styles.notificationsContainer}>
                <Text style={styles.notificationsTitle}>
                  {t("notifications")}
                </Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(value) =>
                    toggleNotifications(streamer.name as string, value)
                  }
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default Streamers;
