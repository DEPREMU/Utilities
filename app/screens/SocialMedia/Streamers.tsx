import {
  ASSETS,
  logger,
  isFalsy,
  openURL,
  clearRefs,
  capitalize,
  fetchToServer,
  saveDataStorage,
  loadDataStorage,
  setIntervalPolyfill,
  notificationsManager,
  clearIntervalPolyfill,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { Streamer } from "@types";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { useBackground } from "@context/BackgroundContext";
import { useUserContext } from "@context/UserContext";
import { View, ScrollView } from "react-native";
import { useStylesStreamers } from "@styles/screens/SocialMedia/useStylesStreamers";
import { Text, TextInput, Card, Avatar, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StreamerWithIsLive = Streamer & { isLive: boolean };

const Streamers: React.FC = () => {
  const { styles } = useStylesStreamers();
  const { statesRef } = useBackground();
  const { t, language } = useLanguage();
  const { userData, sessionToken } = useUserContext();
  const { openModalRef, closeModalRef } = useModal();

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
        logger.error(
          data?.error || res.errorText || "Unknown error adding streamer",
        );
        return;
      }
      if (!data.success || !data.streamer) {
        logger.error("Failed to add streamer");
        return;
      }

      if (Object.keys(data.streamer || {}).length > 3) {
        setStreamers((prev) => [...prev, data.streamer as StreamerWithIsLive]);
        notificationsManager.editNotification("streamers", (prev) => {
          return {
            ...prev,
            streamersList: [
              ...(prev.streamersList || []),
              { name: data.streamer?.name || "", enabled: false },
            ],
          };
        });
      }
    } catch (error) {
      logger.error(error);
      return;
    }

    setStreamer("");
  }, [t, streamer, streamers, openModalRef, closeModalRef, userData?.userId]);

  const askAddStreamer = useCallback(async () => {
    if (!statesRef.current.hasInternet) return;

    const streamerName = capitalize(streamer);
    openModalRef.current(
      t("askAddStreamerTitle"),
      t("askAddStreamerBody", { name: streamerName }),
      <>
        <Button
          label={t("yes")}
          handlePress={() => {
            addingStreamer();
            closeModalRef.current();
          }}
        />
        <Button label={t("no")} handlePress={closeModalRef.current} />
      </>,
    );
  }, [closeModalRef, openModalRef, streamer, t, statesRef, addingStreamer]);

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
        logger.error(error);
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

      notificationsManager.editNotification("streamers", (prev) => {
        const streamerExists = prev.streamersList.find(
          (streamer) => streamer.name === id,
        );

        if (!streamerExists) return prev;

        const newStreamersList = prev.streamersList.filter(
          (streamer) => streamer.name !== streamerExists?.name,
        );
        return {
          ...prev,
          streamersList: newStreamersList,
        };
      });
    },
    [t, language, openModalRef, sessionToken, closeModalRef, userData?.userId],
  );

  const askDeleteStreamer = useCallback(
    (streamer: Streamer) => {
      if (!statesRef.current.hasInternet) return;

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
    [closeModalRef, openModalRef, t, deleteStreamer, statesRef],
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
      if (!streamerName || !statesRef.current.hasInternet) return;

      notificationsManager.editNotification("streamers", (prev) => {
        return {
          ...prev,
          streamersList: prev.streamersList.map((streamer) =>
            streamer.name === streamerName
              ? { ...streamer, enabled: newBool }
              : streamer,
          ),
        };
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
    [userData?.userId, statesRef, language, sessionToken],
  );

  useEffect(() => {
    streamersLoaded.current = streamers.length > 0;

    return () => clearRefs(streamersLoaded);
  }, [streamers]);

  useEffect(() => {
    if (!userData?.userId || !statesRef.current.hasInternet) {
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
          logger.error(error);
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
        if (statesRef.current.hasInternet)
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
        logger.error(error);
      }
    };

    if (!streamersLoaded.current) loadStreamers();
    const id = setIntervalPolyfill(loadStreamers, 15000);

    return () => clearIntervalPolyfill(id);
  }, [
    t,
    userData?.userId,
    language,
    statesRef,
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
            notificationsManager
              .getNotification("streamers")
              .streamersList.find((s) => s.name === streamer.name)?.enabled ||
            false;

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
                  {t("common.notifications")}
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
