import {
  getRouteAPI,
  fetchOptions,
  stringifyData,
  loadDataSecure,
  saveDataSecure,
  removeDataSecure,
  cleanFloat,
  getCurrentUserId,
  fetchFromTable,
  deleteInTable,
  insertIntoTable,
  log,
  logError,
} from "@utils";
import { SelectedCryptos } from "@utils";
import useStylesSelectionScreen from "@/styles/components/cryptos/useStylesSelectionScreen";
import { Checkbox, Text, TextInput } from "react-native-paper";
import { View, Pressable, FlatList } from "react-native";
import { Cryptos, PriceBinanceAPI, ResponseCryptos } from "@types";
import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useBackgroundTask } from "@context/BackgroundTaskContext";

interface SelectionScreenProps {
  setSelectedCryptos: React.Dispatch<React.SetStateAction<SelectedCryptos>>;
  selectedCryptos: SelectedCryptos;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({
  setSelectedCryptos,
  selectedCryptos,
}) => {
  const thingToLoad = 1;
  const { t } = useLanguage();
  const { userData } = useUserContext();
  const { addTaskQueue } = useBackgroundTask();
  const { styles } = useStylesSelectionScreen();

  const [thingLoaded] = useState<number>(0);
  const [, setLoading] = useState<boolean>(true);
  const [cryptos, setCryptos] = useState<PriceBinanceAPI | null>(null);
  const [currency, setCurrency] = useState<string>("USDT");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSelected, setShowSelected] = useState<boolean>(false);

  const [ownedCryptos, setOwnedCryptos] =
    useState<SelectedCryptos>(selectedCryptos);

  const handleClearCache = useCallback(async () => {
    await removeDataSecure("_selectedCryptos");
    setOwnedCryptos({});
  }, []);

  const getDataFlatList = useCallback((): PriceBinanceAPI => {
    if (!cryptos) return [];

    if (showSelected) {
      const keys = Object.keys(selectedCryptos).map((key) => key.toLowerCase());
      if (searchQuery) {
        const filtered = keys.filter((cryptoId) =>
          cryptoId.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        return cryptos.filter((crypto) =>
          filtered.includes(crypto.symbol.toLowerCase()),
        );
      }
      log(keys);
      return cryptos.filter((crypto) =>
        keys.includes(crypto.symbol.toLowerCase()),
      );
    }
    if (searchQuery) {
      return cryptos?.filter((cryptoId) =>
        cryptoId.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return cryptos;
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
            userId: userData?.uid || "",
          },
        }));
      }
    },
    [currency, ownedCryptos, cryptos, userData],
  );

  const getCryptosFromSupabase = useCallback(async () => {
    const { data: cryptosFromSupabase } = await fetchFromTable<Cryptos>(
      "Cryptos",
      {
        userId: userData?.uid || (await getCurrentUserId()) || "",
      },
    );
    if (!cryptosFromSupabase) return {};
    const newOwned: SelectedCryptos = {};
    cryptosFromSupabase?.forEach((crypto) => {
      newOwned[[crypto.id, crypto.currency].join("")] = crypto;
    });

    return newOwned;
  }, [userData?.uid]);

  const handleShowSelected = useCallback(() => {
    setShowSelected((prev) => !prev);
  }, []);

  const handleTextInputAmount = useCallback(
    async (text: string, id: string) => {
      const userId = userData?.uid || (await getCurrentUserId());
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

  useEffect(() => {
    const fetchOwnedCryptos = async () => {
      const owned =
        (await loadDataSecure<SelectedCryptos>("_selectedCryptos")) || {};
      if (owned && Object.keys(owned).length > 0) return setOwnedCryptos(owned);
      const newOwned = await getCryptosFromSupabase();
      setOwnedCryptos(newOwned);
    };

    fetchOwnedCryptos();
  }, [getCryptosFromSupabase]);

  useEffect(() => {
    const id = setTimeout(() => {
      const loadCryptos = async () => {
        const route = await getRouteAPI("/cryptos");
        const response = await fetch(route, fetchOptions("POST", { currency }));
        const data = ((await response.json()) || {}) as ResponseCryptos;
        if (data?.error || response.status !== 200) {
          logError("Error fetching cryptos:", data?.error);
          setCryptos(null);
          return;
        }
        if (data.cryptos) setCryptos(data.cryptos);
      };

      loadCryptos();
    }, 1000);

    return () => clearTimeout(id);
  }, [currency]);

  useEffect(() => {
    const save = async () => {
      const userId = userData?.uid;
      if (!userId) return;
      await deleteInTable(userId, "Cryptos", {
        userId,
      });
      await Promise.all([
        insertIntoTable<Cryptos>("Cryptos", Object.values(ownedCryptos)),
        saveDataSecure("_selectedCryptos", ownedCryptos),
      ]);
      setSelectedCryptos(ownedCryptos);
    };

    const id = setTimeout(() => addTaskQueue(save), 1000);

    return () => clearTimeout(id);
  }, [
    currency,
    userData,
    ownedCryptos,
    addTaskQueue,
    setSelectedCryptos,
    getCryptosFromSupabase,
  ]);

  useEffect(() => {
    if (thingLoaded >= thingToLoad) setLoading(false);
  }, [thingLoaded]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          label={t("selectCurrency")}
          value={currency}
          textColor="#f0f0f0"
          onChangeText={(t) => setCurrency(t.toUpperCase())}
        />
        <TextInput
          style={styles.input}
          textColor="#f0f0f0"
          label={t("searchCrypto")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        data={getDataFlatList()}
        keyExtractor={(item) => item.symbol}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const crypto = ownedCryptos?.[item.symbol];
          const isSelected = !!crypto;

          return (
            <View style={styles.checkBoxRow}>
              <Checkbox
                status={isSelected ? "checked" : "unchecked"}
                onPress={() => handleCheckBoxChange(item.symbol)}
              />

              <Text style={styles.text}>{item.symbol}</Text>

              {isSelected && (
                <TextInput
                  style={styles.inputAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={String(crypto?.amount || 0)}
                  textColor="#f0f0f0"
                  onChangeText={(text) =>
                    handleTextInputAmount(text, item.symbol)
                  }
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.container}>
            <Text style={styles.text}>{t("noCryptosFound")}</Text>
          </View>
        )}
      />

      <View style={styles.buttonsBottom}>
        <Pressable
          onPress={handleClearCache}
          style={({ pressed }) => [
            styles.clearCacheButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>{t("clearCache")}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.showSelectedButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleShowSelected}
        >
          <Text style={styles.buttonText}>
            {showSelected ? t("showAll") : t("showSelected")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const SelectionScreenMemo = React.memo(
  SelectionScreen,
  (prevProps, nextProps) => {
    return (
      prevProps.setSelectedCryptos === nextProps.setSelectedCryptos &&
      stringifyData(prevProps.selectedCryptos) ===
        stringifyData(nextProps.selectedCryptos)
    );
  },
);

export default SelectionScreenMemo;
