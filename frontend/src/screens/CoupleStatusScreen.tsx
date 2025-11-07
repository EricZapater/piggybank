import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { CoupleRequest } from '@/api/couples';
import { useCouple } from '@/hooks/useCouple';
import { CoupleStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<CoupleStackParamList>;

const CoupleStatusScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { state, loading, acceptInvite } = useCouple();

  const partner = state.couple?.partner;

  const renderRequestItem = ({ item }: { item: CoupleRequest }) => (
    <View style={styles.requestCard}>
      <Text style={styles.requestPartner}>{item.partner.name}</Text>
      <Text style={styles.requestEmail}>{item.partner.email}</Text>
      <Text style={styles.requestDate}>Invited at {new Date(item.createdAt).toLocaleString()}</Text>
      <Pressable style={styles.acceptButton} onPress={() => acceptInvite(item.id)}>
        <Text style={styles.acceptButtonText}>Accept</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  if (partner) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Partner</Text>
        <View style={styles.partnerCard}>
          <Text style={styles.partnerName}>{partner.name}</Text>
          <Text style={styles.partnerEmail}>{partner.email}</Text>
          <Text style={styles.partnerSince}>
            Together since {new Date(state.couple!.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You don't have a partner yet</Text>
      <Text style={styles.subtitle}>Invite your partner or accept an invitation below.</Text>

      <Pressable style={styles.inviteButton} onPress={() => navigation.navigate('CoupleInvite')}>
        <Text style={styles.inviteButtonText}>Invite a Partner</Text>
      </Pressable>

      {state.outgoing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending invites</Text>
          {state.outgoing.map((item) => (
            <View key={item.id} style={styles.requestCard}>
              <Text style={styles.requestPartner}>{item.partner.name}</Text>
              <Text style={styles.requestEmail}>{item.partner.email}</Text>
              <Text style={styles.requestDate}>Sent at {new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {state.incoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations to accept</Text>
          <FlatList
            data={state.incoming}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderRequestItem({ item })}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  partnerCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    marginTop: 16,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '600',
  },
  partnerEmail: {
    fontSize: 16,
    color: '#4f4f4f',
    marginTop: 4,
  },
  partnerSince: {
    fontSize: 14,
    color: '#4f4f4f',
    marginTop: 12,
  },
  inviteButton: {
    marginTop: 16,
    backgroundColor: '#2f80ed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  requestPartner: {
    fontSize: 16,
    fontWeight: '600',
  },
  requestEmail: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
  },
  requestDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  acceptButton: {
    marginTop: 12,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default CoupleStatusScreen;

