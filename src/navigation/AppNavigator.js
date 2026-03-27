import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SurveysScreen from '../screens/SurveysScreen';
import SessionScreen from '../screens/SessionScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Surveys" component={SurveysScreen} />
                <Stack.Screen name="Session" component={SessionScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
