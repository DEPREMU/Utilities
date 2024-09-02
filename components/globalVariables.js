import { Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";

//Variables
const MINUTES_STORAGE_KEY = "@minutesSelected";
const STORAGE_KEY = "@selected_cryptos";
const arrMinutes = [1, 2, 5, 10, 20, 30, 60];
const { height, width } = Dimensions.get("window");
const width_2 = width / 2;
const width_3 = width / 3;
const width_4 = width / 4;
const width_5 = width / 5;
const width_6 = width / 6;
const width_7 = width / 7;
const width_8 = width / 8;
const settingsImage = require("../assets/settingsImage.png");
const cryptosName = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  TRB: "Tellor",
  SOL: "Solana",
  BNB: "Binance Coin",
  PEPE: "Pepe",
  SHIB: "Shiba Inu",
};

//Functions
const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving data", error);
    return null;
  }
};

const getDataJSON = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.stringify(value);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving data", error);
    return null;
  }
};

const loadData = async (key, nameVariable) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(nameVariable));
  } catch (error) {
    console.error("Error saving selected cryptocurrencies to storage", error);
  }
};

const clearKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing selected ${key}: ${error}`);
  }
};

const loadKey = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error(
      "Error loading selected cryptocurrencies from storage",
      error
    );
  }
  return [];
};

export {
  MINUTES_STORAGE_KEY,
  STORAGE_KEY,
  arrMinutes,
  height,
  width,
  width_2,
  width_3,
  width_4,
  width_5,
  width_6,
  width_7,
  width_8,
  getData,
  getDataJSON,
  loadData,
  clearKey,
  loadKey,
  settingsImage,
  cryptosName,
};
