import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import { AppStackParamList } from "@/navigation/types";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const Header: React.FC = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Enrere</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable style={styles.logOffButton} onPress={signOut}>
        <Text style={styles.logOffButtonText}>Tanca sessió</Text>
      </Pressable>
    </View>
  );
};

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.error}>Usuari no trobat</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>El meu perfil</Text>
      <View style={styles.profileCard}>
        <Text style={styles.label}>Nom</Text>
        <Text style={styles.value}>{user.name}</Text>
        <Text style={styles.label}>Correu electrònic</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    // paddingTop handled dynamically
    paddingBottom: 8,
  },
  backButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
  logOffButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logOffButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
  },
  error: {
    fontSize: 16,
    color: "#ef4444",
  },
  profileCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "#f0f4ff",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
});

export default ProfileScreen;
