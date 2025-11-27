import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import { usePiggyBank } from "@/hooks/usePiggyBank";
import { PiggyBankStackParamList } from "@/navigation/types";

const Header: React.FC = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
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

const PiggyBankListScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { state, refresh } = usePiggyBank();
  const { signOut } = useAuth();

  const renderPiggyBankItem = ({
    item,
  }: {
    item: (typeof state.piggyBanks)[0];
  }) => (
    <Pressable
      style={styles.piggyBankCard}
      onPress={() =>
        navigation.navigate("PiggyBankDetail", { piggyBankId: item.id })
      }
    >
      <Text style={styles.piggyBankTitle}>{item.title}</Text>
      <Text style={styles.piggyBankDescription}>
        {item.description || "Sense descripció"}
      </Text>
      <View style={styles.piggyBankMeta}>
        <Text style={styles.piggyBankDate}>
          {new Date(item.startDate).toLocaleDateString()} -{" "}
          {item.endDate
            ? new Date(item.endDate).toLocaleDateString()
            : "En curs"}
        </Text>
        <Text style={styles.voucherCount}>
          {item.voucherTemplatesCount} val
          {item.voucherTemplatesCount !== 1 ? "s" : ""}
        </Text>
      </View>
    </Pressable>
  );

  if (state.loading && !state.initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>Guardioles</Text>

      {state.piggyBanks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Encara no hi ha guardioles</Text>
          <Text style={styles.emptySubtext}>
            Crea la teva primera guardiola per començar a estalviar junts!
          </Text>
          <Pressable
            style={styles.createButton}
            onPress={() => navigation.navigate("CreatePiggyBank")}
          >
            <Text style={styles.createButtonText}>
              Crea la teva primera guardiola
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={state.piggyBanks}
          keyExtractor={(item) => item.id}
          renderItem={renderPiggyBankItem}
          onRefresh={refresh}
          refreshing={state.loading}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  createButton: {
    backgroundColor: "#2f80ed",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  listContainer: {
    padding: 24,
    paddingTop: 0,
  },
  piggyBankCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  piggyBankTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  piggyBankDescription: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
  },
  piggyBankMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  piggyBankDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  voucherCount: {
    fontSize: 12,
    color: "#2f80ed",
    fontWeight: "500",
  },
});

export default PiggyBankListScreen;
