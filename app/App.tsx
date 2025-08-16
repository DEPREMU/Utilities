import AppNavigator from "./navigation/AppNavigator";
import AppProviders from "./context/AppProviders";

const App = () => {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
