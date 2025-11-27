import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { useAuth } from "@/hooks/useAuth";
import { usePiggyBank } from "@/hooks/usePiggyBank";
import { PiggyBankStackParamList } from "@/navigation/types";

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

type Navigation = NativeStackNavigationProp<PiggyBankStackParamList>;
type Route = RouteProp<PiggyBankStackParamList, "CreateVoucherTemplate">;

const CreateVoucherTemplateScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { piggyBankId } = route.params;
  const { createVoucherTemplate, state } = usePiggyBank();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountEuros, setAmountEuros] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !amountEuros.trim()) {
      return;
    }

    const amountCents = Math.round(parseFloat(amountEuros) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      return;
    }

    const voucherTemplateData = {
      piggyBankId,
      title: title.trim(),
      description: description.trim() || undefined,
      amountCents,
    };

    await createVoucherTemplate(voucherTemplateData);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Header />
      <Text style={styles.title}>Crea plantilla de val</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Títol *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Introdueix el títol del val"
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripció</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Introdueix la descripció (opcional)"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Import (€) *</Text>
          <TextInput
            style={styles.input}
            value={amountEuros}
            onChangeText={setAmountEuros}
            placeholder="0,00"
            keyboardType="decimal-pad"
            maxLength={10}
          />
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (!title.trim() || !amountEuros.trim() || state.loading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !amountEuros.trim() || state.loading}
        >
          {state.loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Crea plantilla de val</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
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
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  form: {
    padding: 24,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CreateVoucherTemplateScreen;
