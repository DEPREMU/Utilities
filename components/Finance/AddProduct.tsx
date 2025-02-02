import {
  insertData,
  getAllDataEq,
  updateColumns,
} from "../../utils/database/dataBaseConnection";
import {
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  BackHandler,
} from "react-native";
import { openURL } from "../../utils/globalVariables/utils";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import ErrorComponent from "../common/Error";

interface productsProps {
  id: string;
  productName: string;
  productPrice: string | number;
  dateAdded: string;
  dateBuyed: string;
  link: string;
}

interface AddProductProps {
  navigation: any;
}

const AddProduct: React.FC<AddProductProps> = ({ navigation }) => {
  const [total, setTotal] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState<string>("");
  const [priceProduct, setPriceProduct] = useState<string>("0");
  const [linkProduct, setLinkProduct] = useState<string>("");
  const [error, setError] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loadProducts, setLoadProducts] = useState<boolean>(true);
  const [products, setProducts] = useState<string | null>(null);

  const addProduct = async () => {
    try {
      if (newProduct !== "" && parseFloat(priceProduct) > 0) {
        await insertData("products", {
          productName: newProduct,
          productPrice: parseFloat(priceProduct),
          dateAdded: new Date().toString(),
          dateBuyed: "NULL",
          link: linkProduct,
        });

        setNewProduct("");
        setPriceProduct("0");
        setLinkProduct("");
        setPriceProduct("0");
        setLoadProducts(true);
      }
    } catch (error) {}
  };

  const deleteProduct = async (key: string) => {
    try {
      Alert.alert("You are buying this product", "Are you sure?", [
        {
          text: "Cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            await updateColumns(
              "products",
              { dateBuyed: new Date().toString() },
              "id",
              key
            );
            setLoadProducts(true);
          },
        },
      ]);
    } catch (error) {
      setError(true);
      setErrorText("Error deleting product: " + error);
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        let { data } = await getAllDataEq("products", "dateBuyed", "NULL");

        if (!data || data.length == 0) return;
        setTotal(0);
        let t = 0;
        data.forEach((value: productsProps) => {
          t += parseFloat(String(value.productPrice));
        });
        setTotal(t);
        setProducts(JSON.stringify(data));

        setLoadProducts(false);
      } catch (error) {
        console.error("Error retrieving data", error);
      }
      setLoadProducts(false);
    };
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
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

  if (error)
    return <ErrorComponent errorText={errorText} navigation={navigation} />;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.replace("Main")}>
        <Text>Back</Text>
      </Pressable>

      <Text style={styles.header}>Add a Product</Text>

      <TextInput
        placeholder="Product name"
        value={newProduct}
        onChangeText={setNewProduct}
        style={styles.textInput}
      />
      <TextInput
        placeholder="Price"
        value={priceProduct}
        onChangeText={setPriceProduct}
        style={styles.textInput}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Link product"
        value={linkProduct}
        onChangeText={setLinkProduct}
        style={styles.textInput}
      />

      <Pressable
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
        onPress={() => addProduct()}
      >
        <Text style={styles.buttonText}>Add Product</Text>
      </Pressable>
      <ScrollView>
        {products != null &&
          JSON.parse(products).map((value: productsProps) => (
            <View key={value.id} style={styles.viewArticles}>
              <Text style={styles.costText}>
                {value.id}: ~{value.productPrice}${"\n"}
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
                  onPress={() => {
                    if (value.link != "") openURL(value.link);
                  }}
                >
                  <Text>Link: {value.link}</Text>
                </Pressable>
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonDelete,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                onPress={() => deleteProduct(value.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
      <Text style={styles.totalText}>Total: ${total}</Text>
    </View>
  );
};

export default AddProduct;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  viewArticles: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  costText: {
    fontSize: 18,
  },
  buttonDelete: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
  },
  deleteText: {
    color: "#fff",
    fontSize: 14,
  },
  totalText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
  },
  errorText: {
    color: "red",
    marginTop: 10,
  },
});
