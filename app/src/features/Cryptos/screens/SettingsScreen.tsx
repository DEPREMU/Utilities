import {
  memoDeep,
  REPLACERS,
  navigation,
  storageManagement,
  notificationsManager,
} from "@utils";
import Animated, {
  FadeInUp,
  FadeOutUp,
  FadeInDown,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import {
  CRYPTO_NOTIFICATION_INTERVALS,
  CRYPTO_NOTIFICATION_INTERVAL_OPTIONS,
} from "@common";
import TextInput from "@components/TextInput";
import { useLanguage } from "@context/LanguageContext";
import { useTextInput } from "../hooks/useTextInput";
import humanizeDuration from "humanize-duration";
import { CryptoManager } from "../services";
import { useCryptoStore } from "../services/cryptoZustand";
import { useUserContext } from "@context/UserContext";
import { Pressable, View } from "react-native";
import { useStylesCryptosSettings } from "@screens/Cryptos/styles/useStylesCryptosSettings";
import { Chip, Text, Switch, Searchbar, Divider } from "react-native-paper";
import React, { useRef, useMemo, useState, useCallback } from "react";

const MIN_AUTO_REFRESH = 10; //? Minimum auto-refresh interval in seconds

const CryptosSettingsScreen: React.FC = () => {
  const serviceRef = useRef(CryptoManager.instance);

  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { styles, colors } = useStylesCryptosSettings();

  const prices = useCryptoStore((s) => s.prices);
  const currency = useCryptoStore((s) => s.currency);
  const setCurrency = useCryptoStore((s) => s.setCurrency);
  const setSettings = useCryptoStore((s) => s.setSettings);

  const settings = useCryptoStore((s) => s.settings);
  const autoRefresh = useCryptoStore((s) => s.settings.autoRefresh);
  const notifications = useCryptoStore((s) => s.settings.notifications);

  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(currency);

  const cleanTimeout = useCallback(() => {
    return navigation.currentScreen === "Cryptos";
  }, []);

  const {
    styles: stylesAutoRefresh,
    isValid: isValidAutoRefresh,
    valueStr: valueStrAutoRefresh,
    onChangeText: onChangeTextAutoRefresh,
  } = useTextInput({
    onChangeNum: {
      func: (value) => {
        serviceRef.current.setAutoRefreshSettings("valueMs", value * 1000);
      },
      timeoutChange: 500,
      isValid: (value) => value >= MIN_AUTO_REFRESH,
      cleanTimeout,
    },
    initialValue: (settings.autoRefresh.valueMs / 1000).toString(),
  });

  const handleSelectNotifiTime = useCallback(
    (time: DB["Enums"]["CryptoInterval"]) => {
      setSettings((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          time,
        },
      }));
      serviceRef.current.setNotifiSettings("time", time);
    },
    [setSettings],
  );

  const renderItemSearch = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = item === currency;

      const handleSelect = () => {
        setCurrency(item);
        serviceRef.current.selectCurrency(item);
        setShowSearch(false);
        setSearchQuery(item);
      };

      return (
        <Animated.View
          style={styles.itemSearchContainer}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200)}
          entering={FadeInRight.duration(200)}
        >
          <Pressable onPress={handleSelect} disabled={isSelected}>
            <Text style={styles.subtitle}>{item}</Text>
          </Pressable>
        </Animated.View>
      );
    },
    [currency, setCurrency, styles.subtitle, styles.itemSearchContainer],
  );

  const renderCurrentCurrency = useCallback(
    () => (
      <Text style={styles.subtitle}>
        {t("cryptos.currentCurrency", { currency })}
      </Text>
    ),
    [t, styles.subtitle, currency],
  );

  const handleChangeTextSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setShowSearch(text.length > 0);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setSettings((prev) => {
      const newValue = { ...prev };
      const enabled = !prev.autoRefresh.enabled;

      newValue.autoRefresh.enabled = enabled;
      serviceRef.current.toggleAutoRefresh(enabled);

      return newValue;
    });
  }, [setSettings]);

  const toggleNotifications = useCallback(() => {
    setSettings((prev) => {
      const newValue = { ...prev };
      const enabled = !prev.notifications.enabled;

      newValue.notifications.enabled = enabled;
      serviceRef.current.setNotifiSettings("enabled", enabled);
      notificationsManager.editNotifications({
        cryptos: { enabled },
      });

      return newValue;
    });
  }, [setSettings]);

  const dataSearch = useMemo(() => {
    if (!showSearch || !searchQuery) return [];

    const search = searchQuery.toUpperCase();

    const data = [...new Set(prices.map((p) => p.quoteCoin))]
      .filter((p) => p.includes(search))
      .sort((a, b) => (a > b ? 1 : -1));

    return data;
  }, [prices, searchQuery, showSearch]);

  const autoRefreshText = useMemo(() => {
    return t("common.refreshEvery", {
      humanizedText: humanizeDuration(autoRefresh.valueMs, {
        round: true,
        largest: 2,
        language: storageManagement.get("LANGUAGE"),
      }),
    });
  }, [autoRefresh.valueMs, t]);

  const notifiIntervalText = useMemo(() => {
    const selectedTime = notifications?.time ?? "m30";
    const intervalMs =
      CRYPTO_NOTIFICATION_INTERVALS[selectedTime] ??
      CRYPTO_NOTIFICATION_INTERVALS.m30;

    return `${t("settings.notificationInterval")}: ${humanizeDuration(
      intervalMs,
      {
        round: true,
        largest: 2,
        language: storageManagement.get("LANGUAGE"),
      },
    )}`;
  }, [notifications?.time, t]);

  const disabled = !isLoggedIn;

  return (
    <View style={styles.container}>
      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(300).springify()}
      >
        <Text style={styles.title}>{t("cryptos.selectCurrency")}</Text>

        <Divider style={styles.divider} />

        <Searchbar value={searchQuery} onChangeText={handleChangeTextSearch} />

        <Animated.FlatList
          data={dataSearch}
          style={styles.listSearch}
          layout={LinearTransition.duration(200).springify()}
          renderItem={renderItemSearch}
          ListEmptyComponent={renderCurrentCurrency}
        />
      </Animated.View>

      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(300).springify()}
      >
        <Animated.View
          style={styles.rowSwitchText}
          layout={LinearTransition.duration(200).springify()}
        >
          <Text style={styles.subtitle}>{t("common.autoRefresh")}</Text>

          <Switch
            value={autoRefresh.enabled}
            disabled={disabled}
            thumbColor={autoRefresh.enabled ? colors.primary : colors.accent}
            onValueChange={toggleAutoRefresh}
          />
        </Animated.View>

        {autoRefresh.enabled && (
          <>
            <Animated.View
              style={stylesAutoRefresh}
              layout={LinearTransition.duration(200).springify()}
              exiting={FadeOutDown.duration(200)}
              entering={FadeInUp.duration(200)}
            >
              <TextInput
                value={valueStrAutoRefresh}
                label={t("cryptos.refreshIntervalSec")}
                keyboardType="numeric"
                onChangeText={onChangeTextAutoRefresh}
              />
            </Animated.View>

            <Divider style={styles.divider} />

            <Animated.Text
              style={styles.h3}
              exiting={FadeOutDown.duration(200).springify()}
              entering={FadeInUp.duration(200).springify()}
            >
              {autoRefreshText}
            </Animated.Text>

            {!isValidAutoRefresh && (
              <Animated.Text
                style={styles.paragraph}
                exiting={FadeOutUp.duration(200).springify()}
                entering={FadeInDown.duration(200).springify()}
              >
                {t("cryptos.refreshIntervalError", {
                  min: MIN_AUTO_REFRESH.toString(),
                })}
              </Animated.Text>
            )}
          </>
        )}
      </Animated.View>

      {(!REPLACERS.isWeb || REPLACERS.isDev) && (
        <Animated.View
          style={styles.sectionContainer}
          layout={LinearTransition.duration(300).springify()}
        >
          <Animated.View
            style={styles.rowSwitchText}
            layout={LinearTransition.duration(200).springify()}
          >
            <Text style={styles.subtitle}>{t("common.notifications")}</Text>

            <Switch
              value={notifications.enabled}
              disabled={disabled}
              thumbColor={
                notifications.enabled ? colors.primary : colors.accent
              }
              onValueChange={toggleNotifications}
            />
          </Animated.View>

          {notifications.enabled && (
            <>
              <Animated.View
                style={styles.notifiOptionsContainer}
                layout={LinearTransition.duration(200).springify()}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
                {CRYPTO_NOTIFICATION_INTERVAL_OPTIONS.map((option) => {
                  const selected = (notifications?.time ?? "m30") === option;

                  return (
                    <Chip
                      key={option}
                      selected={selected}
                      showSelectedCheck
                      disabled={disabled}
                      onPress={() => handleSelectNotifiTime(option)}
                    >
                      {humanizeDuration(CRYPTO_NOTIFICATION_INTERVALS[option], {
                        round: true,
                        largest: 2,
                        language: storageManagement.get("LANGUAGE"),
                      })}
                    </Chip>
                  );
                })}
              </Animated.View>

              <Divider style={styles.divider} />

              <Animated.Text
                style={styles.h3}
                exiting={FadeOutDown.duration(200).springify()}
                entering={FadeInUp.duration(200).springify()}
              >
                {notifiIntervalText}
              </Animated.Text>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
};

export default memoDeep(CryptosSettingsScreen);
