import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/Home";
import Login from "../screens/auth/Login";
import Signin from "../screens/auth/Signin";
import Settings from "../screens/Settings";
import IPScreen from "../screens/connectivity/IPScreen";
import Streamers from "../screens/socialMedia/Streamers";
import ForgotPassword from "../screens/auth/ForgotPassword";
import { useEffect, useRef } from "react";
import {
  ALL_NOTIFICATIONS,
  dictKeyNotifications,
  FIRST_TIME_KEY,
  handleNotificationResponse,
  initializeNotifications,
  loadData,
  registerBackgroundFetchs,
  requestPermissions,
  unRegisterTask,
} from "../utils";

type NavigationProps = {
  themeNavigation: any;
};

const Navigation: React.FC<NavigationProps> = ({ themeNavigation }) => {
  const Stack = createNativeStackNavigator();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const getFirstTime = async () => {
      const firstTime = await loadData(FIRST_TIME_KEY);
      if (!firstTime) await initializeNotifications();
    };
    const getAllNotifications = async () => {
      if (!(await requestPermissions())) return;

      const allNotis = await loadData(ALL_NOTIFICATIONS);
      if (!allNotis) return;
      const notifications = JSON.parse(allNotis) as Record<
        string,
        dictKeyNotifications
      >;

      await Promise.all(
        Object.values(notifications).map(async (notification) => {
          if (!notification.isActive)
            return unRegisterTask(notification.notificationKey);
          await registerBackgroundFetchs(notification);
        })
      );
    };
    if (navigationRef.current)
      handleNotificationResponse(navigationRef.current);

    getFirstTime();
    getAllNotifications();

    getAllNotifications();
    const timer = setInterval(
      async () => await getAllNotifications(),
      1000 * 60 * 10.1
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <NavigationContainer theme={themeNavigation} ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={Settings}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="IPScreen"
          component={IPScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Streamers"
          component={Streamers}
          options={{ headerShown: false }}
        />

        {/*//? Auth */}
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signin"
          component={Signin}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
