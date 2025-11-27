import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { useAuth } from "@/hooks/useAuth";
import { usePiggyBank } from "@/hooks/usePiggyBank";
import { PiggyBankStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { globalStyles } from "@/theme/styles";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const Header: React.FC = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
type Route = RouteProp<PiggyBankStackParamList, "PiggyBankDetail">;

const PiggyBankDetailScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { piggyBankId } = route.params;
  const {
    getPiggyBank,
    getVoucherTemplates,
    getPiggyBankStats,
    closePiggyBank,
  } = usePiggyBank();

  const [piggyBank, setPiggyBank] =
    useState<Awaited<ReturnType<typeof getPiggyBank>>>(null);
  const [voucherTemplates, setVoucherTemplates] = useState<
    Awaited<ReturnType<typeof getVoucherTemplates>>
  >([]);
  const [stats, setStats] =
    useState<Awaited<ReturnType<typeof getPiggyBankStats>>>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const [pb, vts, statsData] = await Promise.all([
            getPiggyBank(piggyBankId),
            getVoucherTemplates(piggyBankId),
            getPiggyBankStats(piggyBankId),
          ]);
          setPiggyBank(pb);
          setVoucherTemplates(vts);
          setStats(statsData);
        } catch (error) {
          // Error handled in context
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [piggyBankId, getPiggyBank, getVoucherTemplates, getPiggyBankStats])
  );

  const renderVoucherTemplateItem = ({
    item,
  }: {
    item: (typeof voucherTemplates)[0];
  }) => (
    <View style={styles.voucherCard}>
      <Text style={styles.voucherTitle}>{item.title}</Text>
      <Text style={styles.voucherDescription}>
        {item.description || "Sense descripció"}
      </Text>
      <Text style={styles.voucherAmount}>
        €{(item.amountCents / 100).toFixed(2)}
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

  if (!piggyBank) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Guardiola no trobada</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <Header />
      <Text style={styles.title}>{piggyBank.title}</Text>
      <Pressable
        style={styles.createButton}
        onPress={() =>
          navigation.navigate("CreateVoucherTemplate", {
            piggyBankId: piggyBank.id,
          })
        }
      >
        <Text style={styles.createButtonText}>Afegeix val</Text>
      </Pressable>

      <View style={styles.detailsCard}>
        <Text style={styles.description}>
          {piggyBank.description || "Sense descripció"}
        </Text>
        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>Data d'inici:</Text>
          <Text style={styles.metaValue}>
            {new Date(piggyBank.startDate).toLocaleDateString()}
          </Text>
        </View>
        {piggyBank.endDate && (
          <View style={styles.metaContainer}>
            <Text style={styles.metaLabel}>Data de fi:</Text>
            <Text style={styles.metaValue}>
              {new Date(piggyBank.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>Creat:</Text>
          <Text style={styles.metaValue}>
            {new Date(piggyBank.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Progrés</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalActions}</Text>
              <Text style={styles.statLabel}>Accions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                €{(stats.totalValue / 100).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Guanyats</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("RecordAction", { piggyBankId })}
        >
          <Text style={styles.actionButtonText}>Registra acció</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => navigation.navigate("History", { piggyBankId })}
        >
          <Text style={styles.historyButtonText}>Veure historial</Text>
        </Pressable>
      </View>

      <View style={styles.vouchersSection}>
        <Text style={styles.sectionTitle}>Plantilles de vals</Text>
        {voucherTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Encara no hi ha plantilles de vals
            </Text>
            <Text style={styles.emptySubtext}>
              Crea plantilles de vals per definir recompenses pels teus
              objectius d'estalvi!
            </Text>
          </View>
        ) : (
          <FlatList
            data={voucherTemplates}
            keyExtractor={(item) => item.id}
            renderItem={renderVoucherTemplateItem}
            scrollEnabled={false}
            contentContainerStyle={styles.vouchersList}
          />
        )}
      </View>

      <Pressable
        style={styles.closeButton}
        onPress={() => {
          // Add confirmation alert here if desired
          closePiggyBank(piggyBankId).then(() => {
            navigation.goBack();
          });
        }}
      >
        <Text style={styles.closeButtonText}>Tanca guardiola</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    // paddingTop handled dynamically
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    letterSpacing: -0.5,
  },
  createButton: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginLeft: 24,
    marginBottom: 24,
  },
  createButtonText: {
    color: colors.text.inverted,
    fontWeight: "600",
  },
  detailsCard: {
    ...globalStyles.card,
    margin: 24,
    marginTop: 0,
    backgroundColor: colors.surface,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  metaValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "500",
  },
  vouchersSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  vouchersList: {
    paddingBottom: 24,
  },
  voucherCard: {
    ...globalStyles.card,
    padding: 20,
  },
  voucherTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  voucherAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.success,
  },
  statsCard: {
    ...globalStyles.card,
    margin: 24,
    marginTop: 0,
    backgroundColor: "#EEF2FF", // Light indigo background
    borderWidth: 0,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    margin: 24,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: colors.text.inverted,
    fontSize: 16,
    fontWeight: "600",
  },
  historyButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  historyButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: "center",
    marginTop: 24,
  },
  closeButton: {
    margin: 24,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  closeButtonText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PiggyBankDetailScreen;
