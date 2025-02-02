import {
  FIRST_TIME_KEY,
  NOTIFICATIONS_IP,
  ALL_NOTIFICATIONS,
  MINUTES_STORAGE_KEY,
  BACKGROUND_FETCH_TASK,
  NOTIFICATIONS_KEY_STORAGE,
} from "./utils/globalVariables/constants";
import {
  loadData,
  saveData,
  notificationIP,
  initializateNotis,
  requestPermissions,
  notificationCryptos,
  registerBackgroundFetchCryptos,
} from "./utils/globalVariables/utils";
import IP from "./screens/Connectivity/IP";
import Main from "./components/Main";
import Start from "./screens/Start";
import Faltas from "./screens/School/Faltas";
import AddCash from "./components/Finance/AddCash";
import WishList from "./screens/WishList/WishList";
import ChatsGPT from "./screens/Random/ChatsGPT";
import Camiones from "./screens/Random/Camiones";
import Settings from "./screens/Settings/Settings";
import HomeWorks from "./screens/School/HomeWorks";
import Translator from "./screens/Translator/Translator";
import AddProduct from "./components/Finance/AddProduct";
import DeleteMoney from "./components/Finance/DeleteMoney";
import DisplayScreen from "./screens/Cryptos/DisplayScreen";
import SelectionScreen from "./screens/Cryptos/SelectionScreen";
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

interface interfaceAllNotis {
  [key: string]: boolean;
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const allNotis = await loadData(ALL_NOTIFICATIONS);
  if (!allNotis) return;
  const minutes = Number((await loadData(MINUTES_STORAGE_KEY)) || "2");

  const notis: interfaceAllNotis = JSON.parse(allNotis);

  Object.entries(notis).forEach(([key, value]) => {
    if (!value) return;
    switch (key) {
      case NOTIFICATIONS_IP:
        notificationIP(minutes);
        break;
      case NOTIFICATIONS_KEY_STORAGE:
        notificationCryptos();
        break;
      default:
        break;
    }
  });
});

const App = () => {
  const Stack = createStackNavigator();

  useEffect(() => {
    const firstTime = async () => {
      const dataFirstTime = await loadData(FIRST_TIME_KEY);
      if (dataFirstTime) return;

      await requestPermissions();
      await initializateNotis();
      await saveData(FIRST_TIME_KEY, "value");
    };

    firstTime();
    registerBackgroundFetchCryptos();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Start">
        <Stack.Screen
          name="Start"
          component={Start}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Selection"
          component={SelectionScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Display"
          component={DisplayScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Settings"
          component={Settings}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Main"
          component={Main}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AddCash"
          component={AddCash}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="DeleteMoney"
          component={DeleteMoney}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AddProduct"
          component={AddProduct}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="ChatsGPT"
          component={ChatsGPT}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Translator"
          component={Translator}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="HomeWorks"
          component={HomeWorks}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="WishList"
          component={WishList}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Faltas"
          component={Faltas}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Busses"
          component={Camiones}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="IP"
          component={IP}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
