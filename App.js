import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SelectionScreen from './screens/SelectionScreen';
import DisplayScreen from './screens/DisplayScreen';
import Configuration from './screens/Configuration';

const Stack = createStackNavigator();

const App = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Selection">
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
                    name="Configuration"
                    component={Configuration}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;
