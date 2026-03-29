import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookingApi } from '../../api/booking.api';
import { Booking } from '../../types/api.types';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../constants/colors';
import { formatDate } from '../../utils/formatting';

type Props = NativeStackScreenProps<CustomerStackParams, 'MyBookings'>;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:     { color: '#D97706', bg: '#FEF3C7', icon: 'time-outline',           label: 'Pending'     },
  CONFIRMED:   { color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline',label: 'Confirmed'   },
  IN_PROGRESS: { color: Colors.primary, bg: '#FFF3EE', icon: 'construct-outline', label: 'In Progress' },
  COMPLETED:   { color: Colors.accent, bg: '#D1FAE5', icon: 'trophy-outline',     label: 'Completed'   },
  CANCELLED:   { color: Colors.danger, bg: '#FEE2E2', icon: 'close-circle-outline',label: 'Cancelled'   },
  EXPIRED:     { color: Colors.textMuted, bg: Colors.background, icon: 'alert-circle-outline', label: 'Expired' },
};

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'] as const;
type Filter = typeof FILTERS[number];

export default function MyBookingsScreen({ navigation }: Props) {
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<Filter>('All');

  const load = useCallback(async () => {
    try {
      const res = await bookingApi.getMyBookings(0, 50);
      setBookings(res.data.data.content);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = bookings.filter(b => {
    if (filter === 'Active')    return ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status);
    if (filter === 'Completed') return b.status === 'COMPLETED';
    if (filter === 'Cancelled') return ['CANCELLED', 'EXPIRED'].includes(b.status);
    return true;
  });

  const renderItem = ({ item }: { item: Booking }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.EXPIRED;
    const isActive = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(item.status);
    const needsReview = item.status === 'COMPLETED' && !item.reviewed;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingTracking', { bookingId: item.id })}
        activeOpacity={0.75}>

        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon} size={22} color={sc.color} />
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.categoryText}>{item.categoryName}</Text>
            <View style={styles.workerRow}>
              <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.workerText}>{item.worker.name || 'Worker'}</Text>
            </View>
          </View>

          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.scheduledAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
          </View>
          {isActive && (
            <View style={styles.trackBtn}>
              <Text style={styles.trackBtnText}>Track</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
            </View>
          )}
          {needsReview && (
            <View style={styles.reviewBadge}>
              <Ionicons name="star" size={12} color={Colors.primary} />
              <Text style={styles.reviewBadgeText}>Review pending</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySub}>
              {filter === 'All'
                ? 'Your bookings will appear here once you book a worker'
                : `No ${filter.toLowerCase()} bookings`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  filterBar:        {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterChip:       {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:       { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },

  list:             { padding: 16, gap: 12 },
  emptyContainer:   { flex: 1, padding: 16 },

  card:             {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTop:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:         { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardInfo:         { flex: 1 },
  categoryText:     { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  workerRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  workerText:       { fontSize: 12, color: Colors.textMuted },
  statusPill:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:       { fontSize: 11, fontWeight: '700' },

  cardDivider:      { height: 1, backgroundColor: Colors.border, marginVertical: 12 },

  cardBottom:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText:         { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  trackBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackBtnText:     { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  reviewBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3EE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  reviewBadgeText:  { fontSize: 11, color: Colors.primary, fontWeight: '700' },

  empty:            { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap:    { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:       { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub:         { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
});
