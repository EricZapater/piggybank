import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { CoupleProvider } from '@/context/CoupleContext';
import { useCouple } from '@/hooks/useCouple';
import { AppStackParamList, AuthStackParamList, CoupleStackParamList } from '@/navigation/types';
import CoupleInviteScreen from '@/screens/CoupleInviteScreen';
import CoupleStatusScreen from '@/screens/CoupleStatusScreen';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const CoupleStack = createNativeStackNavigator<CoupleStackParamList>();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2f80ed" />
  </View>
);

const AuthenticatedNavigator = () => {
  const { state, loading, initialized } = useCouple();

  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  if (state.couple) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="CoupleStatus" component={CoupleStatusScreen} />
      </AppStack.Navigator>
    );
  }

  return (
    <CoupleStack.Navigator screenOptions={{ headerShown: false }}>
      <CoupleStack.Screen name="CoupleStatus" component={CoupleStatusScreen} />
      <CoupleStack.Screen name="CoupleInvite" component={CoupleInviteScreen} />
    </CoupleStack.Navigator>
  );
};

const Navigator = () => {
  const { token, initialized } = useAuth();

  if (!initialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {token ? (
        <CoupleProvider>
          <AuthenticatedNavigator />
        </CoupleProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={styles.appContainer}>
        <StatusBar style="dark" />
        <Navigator />
        <Toast position="top" />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

