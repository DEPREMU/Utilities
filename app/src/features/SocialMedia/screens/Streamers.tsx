import {
  ASSETS,
  logger,
  openURL,
  tTyped,
  capitalize,
  deviceInfo,
  fetchToServer,
  sessionManager,
  storageManagement,
  setIntervalPolyfill,
  notificationsManager,
  clearIntervalPolyfill,
} from "@utils";
import Button from "@/common/components/Button/screens";
import { modalRef } from "@refs";
import { Streamer } from "@types";
import { useLanguage } from "@/context/LanguageContext";
import { View, ScrollView } from "react-native";
import { useStylesStreamers } from "@screens/SocialMedia/styles/useStylesStreamers";
import { Text, TextInput, Card, Avatar, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StreamerWithIsLive = Streamer & { isLive: boolean };

const Streamers: React.FC = () => {
  const { styles } = useStylesStreamers();
  const { t, language } = useLanguage();

  const [streamer, setStreamer] = useState<string>("");
  const [streamers, setStreamers] = useState<StreamerWithIsLive[]>([]);
  const streamersLoaded = useRef<boolean | null>(false);

  const deleteStreamerRef = useRef(async (id: string) => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    modalRef.closeModal?.();
    if (!userData?.userId || !id || !sessionToken) return;

    const deviceId = storageManagement.get("DEVICE_ID");

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
      modalRef.openModal?.(
        tTyped("common.error"),
        tTyped("common.errorOccurred", { error }),
        <Button
          label={tTyped("common.close")}
          handlePress={() => modalRef.closeModal?.()}
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
  });

  const askDeleteStreamerRef = useRef((streamer: Streamer) => {
    if (!deviceInfo.hasInternet) return;

    const streamerName = capitalize(streamer.name || streamer.id || "");
    modalRef.openModal?.(
      t("streamers.askDeleteStreamer"),
      t("streamers.askDeleteStreamerBody", { name: streamerName }),
      <>
        <Button
          label={tTyped("common.yes")}
          handlePress={deleteStreamerRef.current}
          argsFuncHandlePress={[streamer.id || ""]}
        />
        <Button
          label={tTyped("common.no")}
          handlePress={() => modalRef.closeModal?.()}
        />
      </>,
    );
  });

  const handleOpenURLStreamerRef = useRef((url: string) => {
    if (!url) return;

    modalRef.closeModal?.();
    openURL(url);
  });

  const openURLStreamerRef = useRef((name: string) => {
    if (!name) return;

    const url = `https://www.twitch.tv/${name?.toLowerCase()}`;
    modalRef.openModal?.(
      t("common.openURL"),
      t("common.askOpenURL", { url }),
      <>
        <Button
          label={tTyped("common.yes")}
          handlePress={handleOpenURLStreamerRef.current}
          argsFuncHandlePress={[url]}
        />
        <Button
          label={tTyped("common.no")}
          handlePress={() => modalRef.closeModal?.()}
        />
      </>,
    );
  });

  const toggleNotificationsRef = useRef(
    async (streamerName: string, newBool: boolean) => {
      if (!streamerName || !deviceInfo.hasInternet) return;

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

      const { userData, sessionToken } = sessionManager.getSessionData();
      if (!userData?.userId || !sessionToken) return;

      const deviceId = storageManagement.get("DEVICE_ID");

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
  );

  const addingStreamer = useCallback(async () => {
    if (!streamer) return;

    const { userData } = sessionManager.getSessionData();
    if (!userData?.userId) return;

    if (
      streamers.find(
        (element) =>
          element.name.replace(/\s/g, "").toLowerCase() ===
          streamer.replace(/\s/g, "").toLowerCase(),
      )
    ) {
      modalRef.openModal?.(
        t("common.error"),
        t("streamers.streamerAlreadyAdded", { name: streamer }),
        <Button
          label={t("common.close")}
          handlePress={() => modalRef.closeModal?.()}
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
  }, [t, streamer, streamers]);

  const askAddStreamer = useCallback(async () => {
    if (!deviceInfo.hasInternet) return;

    const streamerName = capitalize(streamer);
    modalRef.openModal?.(
      t("streamers.askAddStreamerTitle"),
      t("streamers.askAddStreamerBody", { name: streamerName }),
      <>
        <Button
          label={t("common.yes")}
          handlePress={() => {
            addingStreamer();
            modalRef.closeModal?.();
          }}
        />
        <Button
          label={t("common.no")}
          handlePress={() => modalRef.closeModal?.()}
        />
      </>,
    );
  }, [streamer, t, addingStreamer]);

  useEffect(() => {
    streamersLoaded.current = streamers.length > 0;
  }, [streamers]);

  useEffect(() => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId || !deviceInfo.hasInternet) {
      modalRef.openModal?.(
        tTyped("common.error"),
        tTyped("auth.youAreNotLoggedIn"),
        <Button
          label={tTyped("common.close")}
          handlePress={() => modalRef.closeModal?.()}
        />,
      );
      return;
    }

    const loadStreamers = async () => {
      try {
        if (!userData?.userId || !sessionToken) return;

        const deviceId = storageManagement.get("DEVICE_ID");

        const res = await fetchToServer(
          "/database/fetch",
          {
            lang: storageManagement.get("LANGUAGE"),
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
          modalRef.openModal?.(
            tTyped("common.error"),
            tTyped("streamers.errorLoadingStreamers"),
            <Button
              label={tTyped("common.close")}
              handlePress={() => modalRef.closeModal?.()}
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
          modalRef.openModal?.(
            tTyped("common.error"),
            tTyped("streamers.errorLoadingStreamers"),
            <Button
              label={tTyped("common.close")}
              handlePress={() => modalRef.closeModal?.()}
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
        if (deviceInfo.hasInternet)
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
        storageManagement.save("STREAMERS", allStreamers);
      } catch (error) {
        logger.error(error);
      }
    };

    if (!streamersLoaded.current) loadStreamers();
    const id = setIntervalPolyfill(loadStreamers, 15000);

    return () => clearIntervalPolyfill(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("streamers")}</Text>
      <View style={styles.containerAdd}>
        <TextInput
          style={styles.textInput}
          placeholder={t("streamers.addStreamer")}
          onChangeText={setStreamer}
          value={streamer}
        />
        <Button
          label={t("streamers.addStreamer")}
          handlePress={askAddStreamer}
          disabled={streamer.trim() === ""}
          touchableOpacity
          replaceStyles={{
            button: styles.buttonAdd,
            textButton: styles.textButton,
          }}
        />
      </View>
      <Text style={styles.yourStreamers}>{t("streamers.yourStreamers")}</Text>
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
                    {t(`streamers.${streamer.isLive ? "Live" : "Offline"}`)}
                  </Text>

                  <View style={styles.containerButtons}>
                    <Button
                      label={t("common.openURL")}
                      argsFuncHandlePress={[streamer.name]}
                      handlePress={openURLStreamerRef.current}
                      touchableOpacity
                      replaceStyles={{
                        button: styles.buttonVisit,
                        textButton: styles.textButton,
                      }}
                    />

                    <Button
                      label={t("common.delete")}
                      argsFuncHandlePress={[streamer]}
                      handlePress={askDeleteStreamerRef.current}
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
                  onValueChange={(value) => {
                    toggleNotificationsRef.current(
                      streamer.name as string,
                      value,
                    );
                  }}
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
