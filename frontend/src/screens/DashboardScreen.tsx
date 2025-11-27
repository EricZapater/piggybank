import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { CoupleRequest } from "@/api/couples";
import { useCouple } from "@/hooks/useCouple";
import { usePiggyBank } from "@/hooks/usePiggyBank";
import { useAuth } from "@/hooks/useAuth";
import { AppStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { globalStyles } from "@/theme/styles";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const Header: React.FC<{ showBack?: boolean }> = ({ showBack = false }) => {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      {showBack && (
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Enrere</Text>
        </Pressable>
      )}
      <View style={styles.spacer} />
      <Pressable style={styles.logOffButton} onPress={signOut}>
        <Text style={styles.logOffButtonText}>Tanca sessió</Text>
      </Pressable>
    </View>
  );
};

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const {
    state: coupleState,
    loading: coupleLoading,
    acceptInvite,
  } = useCouple();
  const { state: piggyState, refresh: refreshPiggyBanks } = usePiggyBank();
  const { signOut } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      refreshPiggyBanks();
      // Couple data refresh is handled by useCouple internally on mount,
      // but ideally should also be refreshed here if useCouple exposed a refresh method.
      // For now, we focus on piggybanks which is the reported issue.
    }, [refreshPiggyBanks])
  );

  const partner = coupleState.couple?.partner;

  const renderRequestItem = ({ item }: { item: CoupleRequest }) => (
    <View style={styles.requestCard}>
      <Text style={styles.requestPartner}>{item.partner.name}</Text>
      <Text style={styles.requestEmail}>{item.partner.email}</Text>
      <Text style={styles.requestDate}>
        Convidat/da el {new Date(item.createdAt).toLocaleString()}
      </Text>
      <Pressable
        style={styles.acceptButton}
        onPress={() => acceptInvite(item.id)}
      >
        <Text style={styles.acceptButtonText}>Accepta</Text>
      </Pressable>
    </View>
  );

  const renderPiggyBankItem = ({
    item,
  }: {
    item: (typeof piggyState.piggyBanks)[0];
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
      <View style={styles.piggyBankStats}>
        <Text style={styles.statText}>
          {item.totalActions} acció{item.totalActions !== 1 ? "ns" : ""}
        </Text>
        <Text style={styles.statText}>
          €{(item.totalValue / 100).toFixed(2)} estalviats
        </Text>
      </View>
      <Pressable
        style={styles.quickActionButton}
        onPress={() =>
          navigation.navigate("RecordAction", { piggyBankId: item.id })
        }
      >
        <Text style={styles.quickActionButtonText}>+ Registra acció</Text>
      </Pressable>
    </Pressable>
  );

  if (coupleLoading || (piggyState.loading && !piggyState.initialized)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Tauler</Text>

        {/* Partner Info */}
        {partner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>La teva parella</Text>
            <View style={styles.partnerCard}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerEmail}>{partner.email}</Text>
              <Text style={styles.partnerSince}>
                Junts des de{" "}
                {new Date(coupleState.couple!.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Invitations Sent */}
        {coupleState.outgoing.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invitacions enviades</Text>
            {coupleState.outgoing.map((item) => (
              <View key={item.id} style={styles.requestCard}>
                <Text style={styles.requestPartner}>{item.partner.name}</Text>
                <Text style={styles.requestEmail}>{item.partner.email}</Text>
                <Text style={styles.requestDate}>
                  Enviat el {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Invitations Received */}
        {coupleState.incoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invitacions rebudes</Text>
            <FlatList
              data={coupleState.incoming}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Piggy Banks Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Les teves guardioles</Text>
          {piggyState.piggyBanks.length === 0 ? (
            <Text style={styles.emptyText}>Encara no hi ha guardioles</Text>
          ) : (
            <FlatList
              data={piggyState.piggyBanks}
              keyExtractor={(item) => item.id}
              renderItem={renderPiggyBankItem}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accions</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => navigation.navigate("PiggyBankList")}
            >
              <Text style={styles.actionButtonText}>Gestiona guardioles</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => navigation.navigate("PiggyBankList")}
            >
              <Text style={styles.actionButtonText}>Crea val</Text>
            </Pressable>
          </View>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={styles.secondaryButtonText}>El meu perfil</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
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
  scrollContainer: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  partnerCard: {
    ...globalStyles.card,
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.inverted,
  },
  partnerEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  partnerSince: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
  requestCard: {
    ...globalStyles.card,
  },
  requestPartner: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  requestEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  requestDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  acceptButton: {
    marginTop: 16,
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptButtonText: {
    color: colors.text.inverted,
    fontWeight: "600",
  },
  piggyBankCard: {
    ...globalStyles.card,
    padding: 20,
  },
  piggyBankTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 6,
  },
  piggyBankDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  piggyBankMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  piggyBankDate: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: "500",
  },
  voucherCount: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    overflow: "hidden",
  },
  piggyBankStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  quickActionButton: {
    marginTop: 16,
    backgroundColor: "#EEF2FF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  quickActionButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
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
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.text.inverted,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default DashboardScreen;
