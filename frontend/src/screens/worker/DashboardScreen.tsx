import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workerApi }  from '../../api/worker.api';
import { bookingApi } from '../../api/booking.api';
import { WorkerProfile, Booking } from '../../types/api.types';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatting';

export default function DashboardScreen() {
  const [profile,    setProfile]    = useState<WorkerProfile | null>(null);
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState(false);

  const load = async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        workerApi.getMyProfile(),
        bookingApi.getMyBookings(0, 10),
      ]);
      setProfile(pRes.data.data);
      setBookings(bRes.data.data.content);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleAvailability = async () => {
    if (!profile || profile.verificationStatus !== 'VERIFIED') return;
    setToggling(true);
    try {
      await workerApi.setAvailability(!profile.isAvailable);
      setProfile(p => p ? { ...p, isAvailable: !p.isAvailable } : p);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update availability');
    } finally { setToggling(false); }
  };

  if (loading) return (
    <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></SafeAreaView>
  );

  const activeBooking  = bookings.find(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status));
  const pendingCount   = bookings.filter(b => b.status === 'PENDING').length;
  const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;
  const isVerified     = profile?.verificationStatus === 'VERIFIED';

  const verBannerConfig: Record<string, { icon: any; color: string; bg: string; text: string }> = {
    UNDER_REVIEW: { icon: 'time-outline',       color: '#D97706', bg: '#FEF3C7', text: 'Profile is under review — usually takes 24 hours' },
    REJECTED:     { icon: 'close-circle-outline',color: Colors.danger, bg: '#FEE2E2', text: 'Profile rejected — please update your documents' },
    PENDING:      { icon: 'document-text-outline',color: '#7C3AED', bg: '#EDE9FE', text: 'Complete your profile to start accepting bookings' },
  };
  const verConf = profile?.verificationStatus ? verBannerConfig[profile.verificationStatus] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>Hello, {profile?.name?.split(' ')[0] || 'Worker'} 👋</Text>
              <Text style={styles.headerCategory}>{profile?.categoryName}</Text>
            </View>
            <View style={[styles.verBadge, { backgroundColor: isVerified ? Colors.accent + '20' : '#F59E0B20' }]}>
              <Ionicons
                name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                size={14} color={isVerified ? Colors.accent : '#D97706'}
              />
              <Text style={[styles.verBadgeText, { color: isVerified ? Colors.accent : '#D97706' }]}>
                {isVerified ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Verification banner */}
        {verConf && (
          <View style={[styles.verBanner, { backgroundColor: verConf.bg }]}>
            <Ionicons name={verConf.icon} size={18} color={verConf.color} />
            <Text style={[styles.verBannerText, { color: verConf.color }]}>{verConf.text}</Text>
          </View>
        )}

        {/* Availability toggle */}
        <View style={styles.availCard}>
          <View style={styles.availLeft}>
            <View style={[styles.availIndicator, { backgroundColor: profile?.isAvailable ? Colors.accent : Colors.textMuted }]} />
            <View>
              <Text style={styles.availTitle}>I'm Available</Text>
              <Text style={styles.availSub}>
                {profile?.isAvailable ? 'Customers can find and book you' : 'You are hidden from search'}
              </Text>
            </View>
          </View>
          {toggling
            ? <ActivityIndicator color={Colors.primary} />
            : <Switch
                value={profile?.isAvailable || false}
                onValueChange={toggleAvailability}
                disabled={!isVerified}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={profile?.isAvailable ? Colors.primary : '#f4f3f4'}
                ios_backgroundColor={Colors.border}
              />}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="briefcase" iconColor="#3B82F6" value={String(completedCount)} label="Completed" />
          <StatCard icon="star"      iconColor="#F59E0B" value={profile?.avgRating?.toFixed(1) || '—'} label="Rating" />
          <StatCard icon="time"      iconColor={Colors.warning} value={String(pendingCount)} label="Pending" />
        </View>

        {/* Active job */}
        {activeBooking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Job</Text>
            <View style={styles.activeCard}>
              <View style={styles.activeCardHeader}>
                <View style={[styles.activeStatus, { backgroundColor: activeBooking.status === 'IN_PROGRESS' ? Colors.primary : '#3B82F6' }]}>
                  <Text style={styles.activeStatusText}>{activeBooking.status.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.activeCategory}>{activeBooking.categoryName}</Text>
              </View>
              <Text style={styles.activeCustomer}>{activeBooking.customer.name || 'Customer'}</Text>
              <View style={styles.activeRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.activeAddress} numberOfLines={2}>{activeBooking.address}</Text>
              </View>
              {activeBooking.quotedAmount && (
                <View style={styles.activeRow}>
                  <Ionicons name="cash-outline" size={14} color={Colors.accent} />
                  <Text style={styles.activeAmount}>{formatCurrency(activeBooking.quotedAmount)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick tips when idle */}
        {!activeBooking && isVerified && profile?.isAvailable && (
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={20} color="#7C3AED" />
            <Text style={styles.tipText}>
              You're live! Customers can now find and book your services. Keep your app open to receive booking requests quickly.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, iconColor, value, label }: { icon: any; iconColor: string; value: string; label: string }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header:         { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerCategory: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  verBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  verBadgeText:   { fontSize: 12, fontWeight: '700' },
  verBanner:      { margin: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  verBannerText:  { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  availCard:      {
    backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  availLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availIndicator: { width: 12, height: 12, borderRadius: 6 },
  availTitle:     { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  availSub:       { fontSize: 12, color: Colors.textSecondary, marginTop: 2, maxWidth: 200 },
  statsGrid:      { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard:       {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statIconWrap:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue:      { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  statLabel:      { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  section:        { margin: 16, marginTop: 8 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: Colors.secondary, marginBottom: 10 },
  activeCard:     {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  activeCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  activeStatus:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeStatusText:{ color: Colors.white, fontSize: 11, fontWeight: '700' },
  activeCategory: { fontSize: 15, fontWeight: '700', color: Colors.secondary },
  activeCustomer: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  activeRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  activeAddress:  { flex: 1, fontSize: 13, color: Colors.textSecondary },
  activeAmount:   { fontSize: 15, fontWeight: '700', color: Colors.accent },
  tipCard:        {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', margin: 16,
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DDD6FE',
  },
  tipText:        { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 20 },
});
