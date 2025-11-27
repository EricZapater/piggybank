import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Pressable,
} from "react-native";
import {
  useRoute,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";

import { usePiggyBank } from "@/hooks/usePiggyBank";
import { useAuth } from "@/hooks/useAuth";
import { PiggyBankStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { globalStyles } from "@/theme/styles";

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

type Route = RouteProp<PiggyBankStackParamList, "History">;

const HistoryScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { piggyBankId } = route.params;
  const { getActionEntries, getPiggyBankStats } = usePiggyBank();

  const [actionGroups, setActionGroups] = useState<
    Awaited<ReturnType<typeof getActionEntries>>
  >([]);
  const [stats, setStats] =
    useState<Awaited<ReturnType<typeof getPiggyBankStats>>>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const [groups, statsData] = await Promise.all([
            getActionEntries(piggyBankId),
            getPiggyBankStats(piggyBankId),
          ]);
          setActionGroups(groups);
          setStats(statsData);
        } catch (error) {
          // Error handled in context
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [piggyBankId, getActionEntries, getPiggyBankStats])
  );

  const renderActionGroup = ({ item }: { item: (typeof actionGroups)[0] }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{item.voucherTemplate.title}</Text>
        <Text style={styles.groupAmount}>
          €{(item.voucherTemplate.amountCents / 100).toFixed(2)} cadascun
        </Text>
      </View>
      <Text style={styles.groupDescription}>
        {item.voucherTemplate.description || "Sense descripció"}
      </Text>

      <View style={styles.entriesContainer}>
        {item.entries.map((entry) => (
          <View key={entry.id} style={styles.entryCard}>
            <Text style={styles.entryDate}>
              {new Date(entry.occurredAt).toLocaleDateString()}
            </Text>
            {entry.notes && (
              <Text style={styles.entryNotes}>{entry.notes}</Text>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.groupTotal}>
        Total: €
        {(
          (item.voucherTemplate.amountCents * item.entries.length) /
          100
        ).toFixed(2)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Header />
      <View style={styles.contentHeader}>
        <Text style={styles.title}>Historial d'accions</Text>
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalActions}</Text>
              <Text style={styles.statLabel}>Accions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                €{(stats.totalValue / 100).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Valor total</Text>
            </View>
          </View>
        )}
      </View>

      {actionGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Encara no s'han registrat accions
          </Text>
          <Text style={styles.emptySubtext}>
            Comença a registrar accions per veure el teu progrés aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={actionGroups}
          keyExtractor={(item) => item.voucherTemplateId}
          renderItem={renderActionGroup}
          scrollEnabled={false}
          contentContainerStyle={styles.groupsList}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentHeader: {
    padding: 24,
    paddingBottom: 24,
  },
  backButton: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.text.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
  logOffButton: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logOffButtonText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
  groupsList: {
    padding: 24,
    paddingTop: 0,
  },
  groupCard: {
    ...globalStyles.card,
    padding: 20,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    color: colors.text.primary,
  },
  groupAmount: {
    fontSize: 16,
    color: colors.success,
    fontWeight: "600",
  },
  groupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  entriesContainer: {
    marginBottom: 16,
    gap: 8,
  },
  entryCard: {
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 8,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  entryNotes: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.success,
    textAlign: "right",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default HistoryScreen;
