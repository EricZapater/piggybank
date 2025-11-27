import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { usePiggyBank } from "@/hooks/usePiggyBank";
import { PiggyBankStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { globalStyles } from "@/theme/styles";

import { useSafeAreaInsets } from "react-native-safe-area-context";

type Navigation = NativeStackNavigationProp<PiggyBankStackParamList>;
type Route = RouteProp<PiggyBankStackParamList, "RecordAction">;

const RecordActionScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { piggyBankId } = route.params;
  const { getVoucherTemplates, createActionEntry, state } = usePiggyBank();
  const insets = useSafeAreaInsets();

  const [voucherTemplates, setVoucherTemplates] = useState<
    Awaited<ReturnType<typeof getVoucherTemplates>>
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const templates = await getVoucherTemplates(piggyBankId);
        setVoucherTemplates(templates);
      } catch (error) {
        // Error handled in context
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [piggyBankId, getVoucherTemplates]);

  const handleRecordAction = async () => {
    if (!selectedTemplateId) return;

    const actionEntry = {
      voucherTemplateId: selectedTemplateId,
      occurredAt: new Date().toISOString(),
    };

    await createActionEntry(actionEntry);
    navigation.goBack();
  };

  const renderTemplateItem = ({
    item,
  }: {
    item: (typeof voucherTemplates)[0];
  }) => (
    <Pressable
      style={[
        styles.templateCard,
        selectedTemplateId === item.id && styles.templateCardSelected,
      ]}
      onPress={() => setSelectedTemplateId(item.id)}
    >
      <Text style={styles.templateTitle}>{item.title}</Text>
      <Text style={styles.templateDescription}>
        {item.description || "Sense descripció"}
      </Text>
      <Text style={styles.templateAmount}>
        €{(item.amountCents / 100).toFixed(2)}
      </Text>
    </Pressable>
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
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Registra acció</Text>
        <Text style={styles.subtitle}>
          Selecciona una plantilla de val per registrar la teva acció
        </Text>
      </View>

      {voucherTemplates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No hi ha plantilles de vals disponibles
          </Text>
          <Text style={styles.emptySubtext}>
            Crea primer plantilles de vals per registrar accions
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={voucherTemplates}
            keyExtractor={(item) => item.id}
            renderItem={renderTemplateItem}
            scrollEnabled={false}
            contentContainerStyle={styles.templatesList}
          />

          <Pressable
            style={[
              styles.recordButton,
              (!selectedTemplateId || state.loading) &&
                styles.recordButtonDisabled,
            ]}
            onPress={handleRecordAction}
            disabled={!selectedTemplateId || state.loading}
          >
            {state.loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.recordButtonText}>Registra acció</Text>
            )}
          </Pressable>
        </>
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
    paddingHorizontal: 24,
    // paddingTop handled dynamically
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
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
  templatesList: {
    padding: 24,
    paddingTop: 0,
  },
  templateCard: {
    ...globalStyles.card,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EEF2FF",
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  templateAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.success,
  },
  recordButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    margin: 24,
    marginTop: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  recordButtonText: {
    color: colors.text.inverted,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RecordActionScreen;
