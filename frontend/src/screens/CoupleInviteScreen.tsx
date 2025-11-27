import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";

import { useCouple } from "@/hooks/useCouple";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const CoupleInviteScreen: React.FC = () => {
  const { loading, sendInvite } = useCouple();
  const [email, setEmail] = useState("");
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: "Introdueix una adreça de correu electrònic",
      });
      return;
    }

    if (loading) {
      return;
    }

    await sendInvite(email.trim());
    setEmail("");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Convida la teva parella</Text>
      <Text style={styles.subtitle}>
        Envia una invitació per enllaçar els vostres comptes.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="parella@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Envia invitació</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    // paddingTop handled dynamically
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2f80ed",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default CoupleInviteScreen;
