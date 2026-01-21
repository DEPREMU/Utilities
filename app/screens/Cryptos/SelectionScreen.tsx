import {
  logError,
  memoDeep,
  cleanFloat,
  fetchToServer,
  stringifyData,
  loadDataStorage,
  saveDataStorage,
  removeDataStorage,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  getCryptosFromDatabase,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import CryptoItem from "@components/Cryptos/CryptoItem";
import { TablesKeys } from "@types";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@/components/common/SkeletonLoading";
import { View, FlatList } from "react-native";
import { useUserContext } from "@context/UserContext";
import { Text, TextInput } from "react-native-paper";
import useStylesCryptoItem from "@styles/components/cryptos/useStylesCryptoItem";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesSelectionScreen from "@styles/components/cryptos/useStylesSelectionScreen";
import { SelectedCryptos, PriceBinanceAPI } from "@common";
import React, { useState, useEffect, useCallback, useRef } from "react";

interface SelectionScreenProps {
  setSelectedCryptos: React.Dispatch<React.SetStateAction<SelectedCryptos>>;
  selectedCryptos: SelectedCryptos;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({
  setSelectedCryptos,
  selectedCryptos,
}) => {
  const { styles } = useStylesSelectionScreen();
  const { t, language } = useLanguage();
  const { addTaskQueueRef } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();
  const { styles: stylesCryptoItem } = useStylesCryptoItem();

  const [loading, setLoading] = useState<boolean>(true);
  const [cryptos, setCryptos] = useState<PriceBinanceAPI | null>(null);
  const [currency, setCurrency] = useState<string>("USDT");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSelected, setShowSelected] = useState<boolean>(false);
  const [ownedCryptos, setOwnedCryptos] =
    useState<SelectedCryptos>(selectedCryptos);

  const handleClearCacheRef = useRef(async () => {
    await removeDataStorage("SELECTED_CRYPTOS");
    setShowSelected(false);
    setOwnedCryptos({});
  });

  const handleShowSelectedRef = useRef(() => {
    setShowSelected((prev) => !prev);
  });

  const handleKeyExtractorRef = useRef(
    (item: PriceBinanceAPI[0]) => item.symbol,
  );

  const getDataFlatList = useCallback((): PriceBinanceAPI => {
    if (!cryptos) return [];

    if (showSelected) {
      const keys = Object.keys(selectedCryptos).map((key) => key.toLowerCase());
      if (!searchQuery.trim())
        return cryptos.filter((crypto) =>
          keys.includes(crypto.symbol.toLowerCase()),
        );

      const filtered = keys.filter((cryptoId) =>
        cryptoId.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      return cryptos.filter((crypto) =>
        filtered.includes(crypto.symbol.toLowerCase()),
      );
    }
    if (!searchQuery.trim()) return cryptos;

    return cryptos?.filter((cryptoId) =>
      cryptoId.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [cryptos, searchQuery, selectedCryptos, showSelected]);

  const handleCheckBoxChange = useCallback(
    (cryptoId: string) => {
      if (!ownedCryptos) return;
      const isSelected = ownedCryptos[cryptoId];
      if (isSelected) {
        setOwnedCryptos((prevOwned) => {
          const newOwned = { ...prevOwned };
          delete newOwned[cryptoId];
          return newOwned;
        });
      } else {
        setOwnedCryptos((prevOwned) => ({
          ...prevOwned,
          [cryptoId]: {
            id: cryptoId.replace(currency, ""),
            amount: "0",
            firstPricePurchased:
              cryptos?.find((c) => c.symbol === cryptoId)?.price || 0,
            datePurchased: new Date().toISOString(),
            currency,
            userId: userData?.userId || "",
          },
        }));
      }
    },
    [currency, ownedCryptos, cryptos, userData],
  );

  const handleTextInputAmount = useCallback(
    async (text: string, id: string) => {
      if (!userData?.userId) return;

      const userId = userData?.userId;
      if (!userId) return;
      setOwnedCryptos((prev) => {
        const newOwned = { ...prev };

        newOwned[id] = {
          id: id.replace(currency, ""),
          currency,
          firstPricePurchased:
            cryptos?.find((c) => c.symbol === id)?.price || 0,
          datePurchased: new Date().toISOString(),
          amount: cleanFloat(text),
          userId,
        };
        return newOwned;
      });
    },
    [cryptos, currency, userData],
  );

  const renderItem = useCallback(
    ({ item }: { item: PriceBinanceAPI[0] }) => {
      const crypto = ownedCryptos?.[item.symbol];
      const isSelected = !!crypto;

      return (
        <CryptoItem
          item={item}
          isSelected={isSelected}
          crypto={crypto}
          onCheckBoxChange={handleCheckBoxChange}
          onAmountChange={handleTextInputAmount}
        />
      );
    },
    [handleCheckBoxChange, handleTextInputAmount, ownedCryptos],
  );

  const handleEmptyList = useCallback(() => {
    const lengthCryptos = Object.keys(
      showSelected ? ownedCryptos : cryptos || {},
    ).length;

    return (
      <>
        {!loading && lengthCryptos === 0 && (
          <View style={stylesCryptoItem.checkBoxRow}>
            <Text style={stylesCryptoItem.text}>
              {t("Cryptos.noCryptosFound")}
            </Text>
          </View>
        )}
        {loading &&
          Array.from({ length: 10 }).map((_, index) => (
            <SkeletonLoading
              key={index}
              showChildren={false}
              style={[stylesCryptoItem.checkBoxRow, stylesCryptoItem.padding0]}
            >
              <View />
            </SkeletonLoading>
          ))}
      </>
    );
  }, [
    t,
    cryptos,
    loading,
    ownedCryptos,
    showSelected,
    stylesCryptoItem.text,
    stylesCryptoItem.padding0,
    stylesCryptoItem.checkBoxRow,
  ]);

  useEffect(() => {
    const fetchOwnedCryptos = async () => {
      const owned = await loadDataStorage("SELECTED_CRYPTOS", {});
      const lengthOwned = Object.keys(owned).length;
      if (owned && lengthOwned < 25 && lengthOwned > 0)
        return setOwnedCryptos(owned);
      if (!userData?.userId || !sessionToken) return;

      const newOwned = await getCryptosFromDatabase(language, sessionToken);
      if (newOwned) setOwnedCryptos(newOwned);
    };

    fetchOwnedCryptos();
  }, [userData?.userId, sessionToken, language]);

  useEffect(() => {
    const id = setTimeoutPolyfill(() => {
      const loadCryptos = async () => {
        const response = await fetchToServer("/cryptos", {
          currency,
        });
        const data = response.data;
        if (!data || data?.error || !response.ok) {
          logError(
            "Error fetching cryptos:",
            data?.error || response.errorText || "Unknown error",
          );
          setCryptos(null);
          return;
        }
        if (data.cryptos) setCryptos(data.cryptos);
      };

      loadCryptos();
    }, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [currency]);

  useEffect(() => {
    const save = async () => {
      const userId = userData?.userId;
      if (!userId || !sessionToken) return;
      const cryptosFromDatabase = await getCryptosFromDatabase(
        language,
        sessionToken,
      );

      const cryptosToUpdate = Object.values(ownedCryptos).filter((crypto) => {
        return (
          !!cryptosFromDatabase?.[`${crypto.id}${crypto.currency}`] &&
          stringifyData(
            cryptosFromDatabase?.[`${crypto.id}${crypto.currency}`],
          ) !==
            stringifyData({
              ...crypto,
              firstPricePurchased: Number(crypto.firstPricePurchased),
              uid: cryptosFromDatabase?.[`${crypto.id}${crypto.currency}`]?.uid,
            })
        );
      });
      if (cryptosToUpdate && cryptosToUpdate.length > 0 && sessionToken) {
        const id = "updateCryptos";
        addTaskQueueRef.current(
          {
            requiresInternet: true,
            func: async () => {
              const deviceId = await loadDataStorage("DEVICE_ID");

              fetchToServer(
                "/database/update",
                {
                  lang: language,
                  table: "Cryptos",
                  values: cryptosToUpdate,
                  deviceId,
                },
                sessionToken,
              );
            },
          },
          {
            id,
            functionName: "updateFromDatabase",
            args: ["Cryptos", cryptosToUpdate, null],
          },
        );
      }

      const cryptosToAdd = Object.values(ownedCryptos).filter(
        (crypto) => !cryptosFromDatabase?.[`${crypto.id}${crypto.currency}`],
      );
      if (cryptosToAdd && cryptosToAdd.length > 0 && sessionToken) {
        const id = "insertCryptos";
        const table: TablesKeys = "Cryptos";
        addTaskQueueRef.current(
          {
            requiresInternet: true,
            func: async () => {
              const deviceId = await loadDataStorage("DEVICE_ID");

              fetchToServer(
                "/database/insert",
                {
                  lang: language,
                  table,
                  values: cryptosToAdd,
                  deviceId,
                },
                sessionToken,
              );
            },
          },
          {
            id,
            functionName: "insertIntoDatabase",
            args: [table, cryptosToAdd],
          },
          id,
        );
      }

      const cryptosToDelete = Object.values(cryptosFromDatabase || {})
        .filter((crypto) => !ownedCryptos?.[`${crypto.id}${crypto.currency}`])
        .map((c) => c.uid as string);

      if (cryptosToDelete && cryptosToDelete.length > 0) {
        const deviceId = await loadDataStorage("DEVICE_ID");

        cryptosToDelete.map((uid) =>
          addTaskQueueRef.current(
            {
              requiresInternet: true,
              func: async () => {
                fetchToServer(
                  "/database/delete",
                  {
                    lang: language,
                    match: { uid },
                    table: "Cryptos",
                    deviceId,
                  },
                  sessionToken,
                );
              },
            },
            {
              id: `deleteCrypto${uid}`,
              functionName: "deleteFromDatabase",
              args: ["Cryptos", { uid }],
            },
          ),
        );
      }

      setSelectedCryptos(ownedCryptos);
      await saveDataStorage("SELECTED_CRYPTOS", ownedCryptos);
    };

    save();
  }, [
    userData?.userId,
    language,
    sessionToken,
    ownedCryptos,
    addTaskQueueRef,
    setSelectedCryptos,
  ]);

  useEffect(() => {
    if (!cryptos) return;

    setLoading(false);
  }, [cryptos]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          label={t("Cryptos.selectCurrency")}
          value={currency}
          textColor="#f0f0f0"
          onChangeText={(t) => setCurrency(t.toUpperCase())}
        />
        <TextInput
          style={styles.input}
          textColor="#f0f0f0"
          label={t("Cryptos.searchCrypto")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        data={getDataFlatList()}
        keyExtractor={handleKeyExtractorRef.current}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={handleEmptyList}
      />

      <View style={styles.buttonsBottom}>
        <Button
          handlePress={handleClearCacheRef.current}
          label={t("Cryptos.clearCache")}
          touchableOpacity
          replaceStyles={{
            button: styles.clearCacheButton,
            textButton: styles.buttonText,
          }}
        />
        <Button
          handlePress={handleShowSelectedRef.current}
          label={showSelected ? t("common.showAll") : t("common.showSelected")}
          touchableOpacity
          replaceStyles={{
            button: styles.showSelectedButton,
            textButton: styles.buttonText,
          }}
        />
      </View>
    </View>
  );
};

const SelectionScreenMemo = memoDeep(SelectionScreen);

export default SelectionScreenMemo;
