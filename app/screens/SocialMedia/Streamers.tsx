import {
  openURL,
  capitalize,
  loadDataSecure,
  saveDataSecure,
  logError,
  isFalsy,
  deleteInTable,
  stringifyData,
  getRouteAPI,
  fetchOptions,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import {
  RequestAddStreamer,
  RequestGetIsLiveStreamer,
  ResponseAddStreamer,
  ResponseGetIsLiveStreamer,
  Streamer,
} from "@types";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { fetchFromTable } from "@utils";
import { useUserContext } from "@context/UserContext";
import { Text, TextInput } from "react-native-paper";
import { useStylesStreamers } from "@styles/screens/SocialMedia/useStylesStreamers";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { View, Image, ScrollView } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StreamerWithIsLive = Streamer & { isLive: boolean };

const Streamers: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useUserContext();
  const { styles } = useStylesStreamers();
  const { hasInternet } = useDeviceInformation();
  const { openModal, closeModal } = useModal();

  const [streamer, setStreamer] = useState<string>("");
  const [streamers, setStreamers] = useState<StreamerWithIsLive[]>([]);
  const streamersLoaded = useRef<boolean>(false);

  const addingStreamer = useCallback(async () => {
    if (isFalsy(streamer)) return;
    if (isFalsy(user?.id)) return;

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
      const res = await fetch(
        await getRouteAPI("/addStreamer"),
        fetchOptions<RequestAddStreamer>("POST", {
          name: streamer,
          userId: user?.id || "",
        }),
      );

      const data = (await res.json()) as ResponseAddStreamer;

      if (data.error) {
        logError(data.error);
        return;
      }
      if (!data.success || !data.streamer) {
        logError("Failed to add streamer");
        return;
      }

      if (Object.keys(data.streamer || {}).length > 3)
        setStreamers((prev) => [...prev, data.streamer as StreamerWithIsLive]);
    } catch (error) {
      logError(error);
      return;
    }

    setStreamer("");
  }, [closeModal, openModal, streamers, streamer, t, user?.id]);

  const addStreamer = useCallback(() => {
    addingStreamer();
    closeModal();
  }, [addingStreamer, closeModal]);

  const askAddStreamer = useCallback(async () => {
    const streamerName = capitalize(streamer);
    openModal(
      t("askAddStreamerTitle"),
      t("askAddStreamerBody", { name: streamerName }),
      <>
        <Button label={t("yes")} handlePress={addStreamer} />
        <Button label={t("no")} handlePress={closeModal} />
      </>,
    );
  }, [addStreamer, closeModal, openModal, streamer, t]);

  const deleteStreamer = useCallback(
    async (id: string) => {
      if (!user?.id) return;

      const { error } = await deleteInTable<Streamer>(user?.id, "Streamers", {
        id,
      });

      if (error) {
        console.error(error);
        openModal(
          t("error"),
          t("errorDeletingStreamer", { error }),
          <Button label={t("close")} handlePress={closeModal} />,
        );
        return;
      }

      setStreamers((prev) => prev.filter((streamer) => streamer.id !== id));
    },
    [closeModal, openModal, t, user?.id],
  );

  const askDeleteStreamer = useCallback(
    (streamer: Streamer) => {
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
    [closeModal, openModal, t, deleteStreamer],
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

  useEffect(() => {
    streamersLoaded.current = streamers.length > 0;
  }, [streamers]);

  useEffect(() => {
    if (!user?.id || !hasInternet) {
      openModal(
        t("error"),
        t("youAreNotLoggedIn"),
        <Button label={t("close")} handlePress={closeModal} />,
      );
      return;
    }

    const loadStreamers = async () => {
      try {
        let data: Streamer[];

        if (hasInternet) {
          const { data: internetData } = await fetchFromTable<Streamer>(
            "Streamers",
            { userId: user.id },
          );
          console.log(internetData);

          data = internetData ?? [];
        } else {
          data = (await loadDataSecure<Streamer[]>("_Streamers")) || [];
        }

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
              const response = await fetch(
                await getRouteAPI("/getIsLiveStreamer"),
                fetchOptions<RequestGetIsLiveStreamer>("POST", {
                  streamer,
                }),
              );
              const result =
                (await response.json()) as ResponseGetIsLiveStreamer;

              return result?.streamer || { ...streamer, isLive: false };
            }),
          );

        setStreamers(newData ? newData : allStreamers);
        saveDataSecure("_Streamers", stringifyData(allStreamers));
      } catch (error) {
        logError(error);
      }
    };

    if (!streamersLoaded.current) loadStreamers();
    const id = setInterval(() => {
      loadStreamers();
    }, 15000);

    return () => clearInterval(id);
  }, [closeModal, hasInternet, openModal, t, user?.id]);

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
      >
        {streamers.map((streamer, index) => (
          <View key={index} style={styles.containerStreamer}>
            <View style={styles.containerImageAndName}>
              <Image
                source={
                  streamer.linkImage ? { uri: streamer.linkImage } : undefined
                }
                style={styles.streamerImage}
              />
              <Text style={styles.nameStreamer}>
                {capitalize(streamer.name)}
              </Text>
            </View>
            <View style={styles.containerData}>
              <Text style={styles.isLiveStreamer}>
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
                    button: styles.buttonVisit,
                    textButton: styles.textButton,
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default Streamers;
