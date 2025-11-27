import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Linking } from "react-native";
import Toast from "react-native-toast-message";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { CoupleProvider } from "@/context/CoupleContext";
import { useCouple } from "@/hooks/useCouple";
import { PiggyBankProvider } from "@/context/PiggyBankContext";
import {
  AppStackParamList,
  AuthStackParamList,
  CoupleStackParamList,
} from "@/navigation/types";
import CoupleInviteScreen from "@/screens/CoupleInviteScreen";
import CoupleStatusScreen from "@/screens/CoupleStatusScreen";
import CreatePiggyBankScreen from "@/screens/CreatePiggyBankScreen";
import CreateVoucherTemplateScreen from "@/screens/CreateVoucherTemplateScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import LoginScreen from "@/screens/LoginScreen";
import PiggyBankDetailScreen from "@/screens/PiggyBankDetailScreen";
import PiggyBankListScreen from "@/screens/PiggyBankListScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RecordActionScreen from "@/screens/RecordActionScreen";
import RegisterScreen from "@/screens/RegisterScreen";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const CoupleStack = createNativeStackNavigator<CoupleStackParamList>();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2f80ed" />
  </View>
);

const AuthenticatedNavigator = () => {
  const { loading, initialized } = useCouple();

  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  return (
    <PiggyBankProvider>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Dashboard" component={DashboardScreen} />
        <AppStack.Screen name="PiggyBankList" component={PiggyBankListScreen} />
        <AppStack.Screen name="Profile" component={ProfileScreen} />
        <AppStack.Screen
          name="CreatePiggyBank"
          component={CreatePiggyBankScreen}
        />
        <AppStack.Screen
          name="PiggyBankDetail"
          component={PiggyBankDetailScreen}
        />
        <AppStack.Screen
          name="CreateVoucherTemplate"
          component={CreateVoucherTemplateScreen}
        />
        <AppStack.Screen name="RecordAction" component={RecordActionScreen} />
        <AppStack.Screen name="History" component={HistoryScreen} />
        <AppStack.Screen name="CoupleStatus" component={CoupleStatusScreen} />
        <AppStack.Screen name="CoupleInvite" component={CoupleInviteScreen} />
      </AppStack.Navigator>
    </PiggyBankProvider>
  );
};

const Navigator = () => {
  const { token, initialized } = useAuth();

  if (!initialized) {
    return <LoadingScreen />;
  }

  const linking = {
    prefixes: ["http://localhost:8080", "exp://"],
    config: {
      screens: {
        Register: "register",
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      {token ? (
        <CoupleProvider>
          <AuthenticatedNavigator />
        </CoupleProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
