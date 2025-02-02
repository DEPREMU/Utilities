import {
  insertData,
  getAllData,
  updateColumns,
} from "../../utils/database/dataBaseConnection";
import {
  View,
  Text,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  BackHandler,
} from "react-native";
import styles from "../../styles/wishlist/stylesWishList";
import Products from "../../components/WishList/Products";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

interface WishListProps {
  navigation: any;
}

const WishList: React.FC<WishListProps> = ({ navigation }) => {
  const tableName = "WishList";
  const [buying, setBuying] = useState<boolean>(false);
  const [products, setProducts] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");
  const [productPrice, setProductPrice] = useState<string>("");
  const [boolShowHidden, setBoolShowHidden] = useState<boolean>(false);
  const [productDescription, setProductDescription] = useState<string>("");

  const addProduct = async () => {
    const { success, error } = await insertData(tableName, {
      ProductName: productName,
      ProductPrice: parseFloat(productPrice),
      ProductDescription: productDescription,
      Buying: buying,
    });

    if (success) {
      const { data: products } = await getAllData(tableName);
      if (products) setProducts(JSON.stringify(products.reverse() || {}));
      setProductName("");
      setProductPrice("");
      setProductDescription("");
      setBuying(false);
    } else {
      console.error(error);
    }
  };

  const toggleBuyingStatus = async (id: number, currentStatus: boolean) => {
    await updateColumns(tableName, { Buying: !currentStatus }, "id", id);
    const { data: products } = await getAllData(tableName);
    if (products) setProducts(JSON.stringify(products.reverse() || {}));
  };

  const verifyNewProductPressed = (pressed: boolean): 0.5 | 1 => {
    if (pressed && productName && productPrice && productDescription)
      return 0.5;
    return 1;
  };
  const verifyNewProductColor = (): "#007BFF" | "#ccc" => {
    if (productName && productPrice && productDescription) return "#007BFF";
    return "#ccc";
  };

  useEffect(() => {
    const getProducts = async () => {
      const { data: products } = await getAllData(tableName);
      if (products) setProducts(JSON.stringify(products.reverse() || {}));
    };

    getProducts();
  }, []);

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to go back to the menu?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonToggleVisibility,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        onPress={() => setBoolShowHidden((prev) => !prev)}
      >
        <Text style={[styles.textButtons, { color: "black" }]}>
          {boolShowHidden ? "Hide all hidden products" : "Show all products"}
        </Text>
      </Pressable>
      <View style={styles.formNewProduct}>
        <Text style={styles.textType}>New Product</Text>

        <TextInput
          style={styles.textInput}
          onChangeText={setProductName}
          value={productName}
          placeholder="Product Name"
        />
        <TextInput
          style={styles.textInput}
          onChangeText={setProductPrice}
          value={productPrice}
          placeholder="Product Price"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.textInput}
          onChangeText={setProductDescription}
          value={productDescription}
          placeholder="Product Description"
        />

        <Pressable
          style={({ pressed }) => [
            styles.buttonNewProduct,
            {
              opacity: verifyNewProductPressed(pressed),
              backgroundColor: verifyNewProductColor(),
            },
          ]}
          onPress={() =>
            productName && productPrice && productDescription
              ? addProduct()
              : null
          }
        >
          <Text style={styles.textButtons}>Add New Product</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.containerScrollView}>
        {products != null && (
          <Products
            boolShowAll={boolShowHidden}
            products={products}
            toggleBuyingStatus={toggleBuyingStatus}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default WishList;
