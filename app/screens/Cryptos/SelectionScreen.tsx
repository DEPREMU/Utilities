import {
  PriceBinanceAPI,
  ResponseCryptos,
  RequestSupabaseDelete,
  RequestSupabaseInsert,
  TablesKeys,
} from "@types";
import {
  logError,
  cleanFloat,
  getRouteAPI,
  fetchOptions,
  stringifyData,
  loadDataSecure,
  saveDataSecure,
  removeDataSecure,
  getCryptosFromSupabase,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import CryptoItem from "@components/Cryptos/CryptoItem";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@/components/common/SkeletonLoading";
import { View, FlatList } from "react-native";
import { useUserContext } from "@context/UserContext";
import { SelectedCryptos } from "@utils";
import { Text, TextInput } from "react-native-paper";
import useStylesCryptoItem from "@styles/components/cryptos/useStylesCryptoItem";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesSelectionScreen from "@styles/components/cryptos/useStylesSelectionScreen";
import React, { useState, useEffect, useCallback } from "react";

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
  const { addTaskQueue } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();
  const { styles: stylesCryptoItem } = useStylesCryptoItem();

  const [loading, setLoading] = useState<boolean>(true);
  const [cryptos, setCryptos] = useState<PriceBinanceAPI | null>(null);
  const [currency, setCurrency] = useState<string>("USDT");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSelected, setShowSelected] = useState<boolean>(false);
  const [ownedCryptos, setOwnedCryptos] =
    useState<SelectedCryptos>(selectedCryptos);

  const handleClearCache = useCallback(async () => {
    await removeDataSecure("_selectedCryptos");
    setShowSelected(false);
    setOwnedCryptos({});
  }, []);

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

  const handleShowSelected = useCallback(() => {
    setShowSelected((prev) => !prev);
  }, []);

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
            <Text style={stylesCryptoItem.text}>{t("noCryptosFound")}</Text>
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
    stylesCryptoItem.checkBoxRow,
    stylesCryptoItem.text,
    stylesCryptoItem.padding0,
    t,
    cryptos,
    loading,
    ownedCryptos,
    showSelected,
  ]);

  const handleKeyExtractor = useCallback(
    (item: PriceBinanceAPI[0]) => item.symbol,
    [],
  );

  useEffect(() => {
    const fetchOwnedCryptos = async () => {
      const owned = (await loadDataSecure("_selectedCryptos")) || {};
      const lengthOwned = Object.keys(owned).length;
      if (owned && lengthOwned < 25 && lengthOwned > 0)
        return setOwnedCryptos(owned);
      if (!userData?.userId || !sessionToken) return;

      const newOwned = await getCryptosFromSupabase(language, sessionToken);
      if (newOwned) setOwnedCryptos(newOwned);
    };

    fetchOwnedCryptos();
  }, [userData?.userId, sessionToken, language]);

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
      const userId = userData?.userId;
      if (!userId || !sessionToken) return;
      const cryptosFromSupabase = await getCryptosFromSupabase(
        language,
        sessionToken,
      );

      const cryptosToUpdate = Object.values(ownedCryptos).filter((crypto) => {
        return (
          !!cryptosFromSupabase?.[`${crypto.id}${crypto.currency}`] &&
          stringifyData(
            cryptosFromSupabase?.[`${crypto.id}${crypto.currency}`],
          ) !==
            stringifyData({
              ...crypto,
              firstPricePurchased: Number(crypto.firstPricePurchased),
              uid: cryptosFromSupabase?.[`${crypto.id}${crypto.currency}`]?.uid,
            })
        );
      });
      if (cryptosToUpdate && cryptosToUpdate.length > 0 && sessionToken) {
        const id = "updateCryptos";
        addTaskQueue(
          async () => {
            fetch(
              await getRouteAPI("/supabase/update"),
              fetchOptions<RequestSupabaseInsert>(
                "POST",
                {
                  lang: language,
                  table: "Cryptos",
                  values: cryptosToUpdate,
                },
                sessionToken,
              ),
            );
          },
          true,
          {
            id,
            functionName: "updateFromSupabase",
            args: ["Cryptos", cryptosToUpdate, null],
          },
        );
      }

      const cryptosToAdd = Object.values(ownedCryptos).filter(
        (crypto) => !cryptosFromSupabase?.[`${crypto.id}${crypto.currency}`],
      );
      if (cryptosToAdd && cryptosToAdd.length > 0 && sessionToken) {
        const id = "insertCryptos";
        const table: TablesKeys = "Cryptos";
        addTaskQueue(
          async () => {
            fetch(
              await getRouteAPI("/supabase/insert"),
              fetchOptions<RequestSupabaseInsert>(
                "POST",
                {
                  lang: language,
                  table,
                  values: cryptosToAdd,
                },
                sessionToken,
              ),
            );
          },
          true,
          {
            id,
            functionName: "insertIntoSupabase",
            args: [table, cryptosToAdd],
          },
          id,
        );
      }

      const cryptosToDelete = Object.values(cryptosFromSupabase || {})
        .filter((crypto) => !ownedCryptos?.[`${crypto.id}${crypto.currency}`])
        .map((c) => c.uid as string);

      if (cryptosToDelete && cryptosToDelete.length > 0) {
        const url = await getRouteAPI("/supabase/delete");

        cryptosToDelete.map((uid) =>
          addTaskQueue(
            async () => {
              fetch(
                url,
                fetchOptions<RequestSupabaseDelete>(
                  "POST",
                  {
                    lang: language,
                    table: "Cryptos",
                    match: { uid },
                  },
                  sessionToken,
                ),
              );
            },
            true,
            {
              id: `deleteCrypto${uid}`,
              functionName: "deleteFromSupabase",
              args: ["Cryptos", { uid }],
            },
          ),
        );
      }

      setSelectedCryptos(ownedCryptos);
      await saveDataSecure("_selectedCryptos", ownedCryptos);
    };

    save();
  }, [
    userData?.userId,
    ownedCryptos,
    addTaskQueue,
    setSelectedCryptos,
    language,
    sessionToken,
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
        keyExtractor={handleKeyExtractor}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={handleEmptyList}
      />

      <View style={styles.buttonsBottom}>
        <Button
          handlePress={handleClearCache}
          label={t("clearCache")}
          touchableOpacity
          replaceStyles={{
            button: styles.clearCacheButton,
            textButton: styles.buttonText,
          }}
        />
        <Button
          handlePress={handleShowSelected}
          label={showSelected ? t("showAll") : t("showSelected")}
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
