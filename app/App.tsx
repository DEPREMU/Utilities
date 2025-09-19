import AppNavigator from "./navigation/AppNavigator";
import AppProviders from "./context/AppProviders";
import { configureNotificationChannel } from "@utils";

configureNotificationChannel();

const App = () => {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
