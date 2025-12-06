import {
  isFalsy,
  openURL,
  logError,
  capitalize,
  fetchToServer,
  saveDataSecure,
  loadDataSecure,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useBackground } from "@context/BackgroundContext";
import { useUserContext } from "@context/UserContext";
import { View, ScrollView } from "react-native";
import { useNotifications } from "@context/NotificationsContext";
import { useStylesStreamers } from "@styles/screens/SocialMedia/useStylesStreamers";
import { Streamer, Notifications } from "@types";
import { Text, TextInput, Card, Avatar, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StreamerWithIsLive = Streamer & { isLive: boolean };

const Streamers: React.FC = () => {
  const { styles } = useStylesStreamers();
  const { t, language } = useLanguage();
  const { hasInternet } = useBackground();
  const { openModal, closeModal } = useModal();
  const { userData, sessionToken } = useUserContext();
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
      openModal(
        t("error"),
        t("streamerAlreadyAdded", { name: streamer }),
        <Button label={t("close")} handlePress={closeModal} />,
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
          const newNotifications = {
            ...JSON.parse(JSON.stringify(prev)),
            enabled: {
              ...prev.enabled,
              streamers: {
                ...(prev.enabled?.streamers || {}),
                [streamer]: { name: data.streamer?.name, enabled: false },
              },
            },
          } as Notifications;

          return newNotifications;
        });
      }
    } catch (error) {
      logError(error);
      return;
    }

    setStreamer("");
  }, [
    closeModal,
    openModal,
    streamers,
    streamer,
    t,
    userData?.userId,
    setNotifications,
  ]);

  const addStreamer = useCallback(() => {
    addingStreamer();
    closeModal();
  }, [addingStreamer, closeModal]);

  const askAddStreamer = useCallback(async () => {
    if (!hasInternet) return;

    const streamerName = capitalize(streamer);
    openModal(
      t("askAddStreamerTitle"),
      t("askAddStreamerBody", { name: streamerName }),
      <>
        <Button label={t("yes")} handlePress={addStreamer} />
        <Button label={t("no")} handlePress={closeModal} />
      </>,
    );
  }, [addStreamer, closeModal, openModal, streamer, t, hasInternet]);

  const deleteStreamer = useCallback(
    async (id: string) => {
      closeModal();
      if (!userData?.userId || isFalsy(id) || !sessionToken) return;

      const deviceId = await loadDataSecure("_deviceId");

      const res = await fetchToServer(
        "/database/delete",
        {
          deviceId: deviceId || "local-device",
          lang: language,
          table: "Streamers",
          match: { id, userId: userData?.userId },
        },
        sessionToken,
      );
      const { error } = res.data || { error: res.errorText || "Unknown error" };

      if (error) {
        logError(error);
        openModal(
          t("error"),
          t("errorDeletingStreamer", { error }),
          <Button label={t("close")} handlePress={closeModal} />,
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
              deviceId: deviceId || "local-device",
              table: "UserNotificationsConfig",
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
        const streamers = { ...prev.enabled.streamers };
        if (streamers[id]) delete streamers[id];

        const newNotifications = {
          ...JSON.parse(JSON.stringify(prev)),
          enabled: {
            ...prev.enabled,
            streamers,
          },
        } as Notifications;

        return newNotifications;
      });
    },
    [
      closeModal,
      openModal,
      t,
      userData?.userId,
      setNotifications,
      sessionToken,
      language,
    ],
  );

  const askDeleteStreamer = useCallback(
    (streamer: Streamer) => {
      if (!hasInternet) return;

      const streamerName = capitalize(streamer.name || streamer.id || "");
      openModal(
        t("askDeleteStreamer"),
        t("askDeleteStreamerBody", { name: streamerName }),
        <>
          <Button
            label={t("yes")}
            handlePress={deleteStreamer}
            argsFuncHandlePress={streamer.id}
          />
          <Button label={t("no")} handlePress={closeModal} />
        </>,
      );
    },
    [closeModal, openModal, t, deleteStreamer, hasInternet],
  );

  const handleOpenURLStreamer = useCallback(
    (url: string) => {
      if (isFalsy(url)) return;
      closeModal();
      openURL(url);
    },
    [closeModal],
  );

  const openURLStreamer = useCallback(
    (name: string) => {
      if (isFalsy(name)) return;
      const url = `https://www.twitch.tv/${name?.toLowerCase()}`;
      openModal(
        t("openURL"),
        t("askOpenURL", { url }),
        <>
          <Button
            label={t("yes")}
            handlePress={handleOpenURLStreamer}
            argsFuncHandlePress={url}
          />
          <Button label={t("no")} handlePress={closeModal} />
        </>,
      );
    },
    [t, openModal, closeModal, handleOpenURLStreamer],
  );

  const toggleNotifications = useCallback(
    async (streamerName: string, newBool: boolean) => {
      if (!streamerName || !notifications || !setNotifications || !hasInternet)
        return;

      setNotifications((prev) => {
        if (!prev) return prev;

        const newValue: Notifications = JSON.parse(JSON.stringify(prev));
        const newNotifications = {
          ...newValue,
          enabled: {
            ...newValue.enabled,
            streamers: {
              ...newValue.enabled.streamers,
              [streamerName]: {
                ...newValue.enabled.streamers[streamerName],
                enabled: newBool,
              },
            },
          },
        } as Notifications;

        return newNotifications;
      });
      if (!userData?.userId || !sessionToken) return;

      const deviceId = await loadDataSecure("_deviceId");

      await fetchToServer(
        "/database/update",
        {
          lang: language,
          deviceId: deviceId || "local-device",
          table: "UserNotificationsConfig",
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

    return () => {
      streamersLoaded.current = null;
    };
  }, [streamers]);

  useEffect(() => {
    if (!userData?.userId || !hasInternet) {
      openModal(
        t("error"),
        t("youAreNotLoggedIn"),
        <Button label={t("close")} handlePress={closeModal} />,
      );
      return;
    }

    const loadStreamers = async () => {
      try {
        if (!userData?.userId || !sessionToken) return;

        const deviceId = await loadDataSecure("_deviceId");

        const res = await fetchToServer(
          "/database/fetch",
          {
            table: "Streamers",
            deviceId: deviceId || "local-device",
            match: { userId: userData?.userId },
            lang: language,
          },
          sessionToken,
        );
        const { data: internetData, error } = res.data || {
          error: res.errorText || "Unknown error",
        };

        if (error) {
          logError(error);
          openModal(
            t("error"),
            t("errorLoadingStreamers", { error }),
            <Button label={t("close")} handlePress={closeModal} />,
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
          openModal(
            t("error"),
            t("errorLoadingStreamers"),
            <Button label={t("close")} handlePress={closeModal} />,
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
        saveDataSecure("_Streamers", allStreamers);
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
    openModal,
    closeModal,
    hasInternet,
    sessionToken,
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
                        : require("@assets/icon.png")
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
                      argsFuncHandlePress={streamer.name}
                      handlePress={openURLStreamer}
                      touchableOpacity
                      replaceStyles={{
                        button: styles.buttonVisit,
                        textButton: styles.textButton,
                      }}
                    />

                    <Button
                      label={t("delete")}
                      argsFuncHandlePress={streamer}
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
