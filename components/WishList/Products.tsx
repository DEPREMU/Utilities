import React from "react";
import styles from "../../styles/wishlist/stylesWishList";
import { View, Text, Pressable } from "react-native";

interface ProductsProps {
  boolShowAll: boolean;
  products: string;
  toggleBuyingStatus: (id: number, currentStatus: boolean) => void;
}

interface tableProducts {
  id: number;
  ProductName: string;
  ProductPrice: number;
  ProductDescription: string;
  Buying: boolean;
}

const Products: React.FC<ProductsProps> = ({
  boolShowAll,
  products,
  toggleBuyingStatus,
}) =>
  JSON.parse(products).map((value: tableProducts) => {
    if (!value.Buying || boolShowAll)
      return (
        <View key={value.id} style={styles.containerProduct}>
          <Text style={styles.textName}>{value.ProductName}</Text>
          <Text style={styles.textPrice}>Price: ${value.ProductPrice}</Text>
          <Text style={styles.textDescription}>{value.ProductDescription}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.buttonToggleBuying,
              {
                opacity: pressed ? 0.5 : 1,
                backgroundColor: value.Buying ? "red" : "green",
              },
            ]}
            onPress={() => toggleBuyingStatus(value.id, value.Buying)}
          >
            <Text style={styles.textButtons}>
              {value.Buying ? "Remove from Buying" : "Add to Buying"}
            </Text>
          </Pressable>
        </View>
      );
  });

export default Products;
