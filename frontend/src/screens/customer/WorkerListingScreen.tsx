import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { workerApi } from '../../api/worker.api';
import { WorkerListing } from '../../types/api.types';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatRating } from '../../utils/formatting';

type Props = NativeStackScreenProps<CustomerStackParams, 'WorkerListing'>;

export default function WorkerListingScreen({ route, navigation }: Props) {
  const { categoryId, categoryName, city } = route.params || {};

  const [workers,   setWorkers]   = useState<WorkerListing[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [page,      setPage]      = useState(0);
  const [hasMore,   setHasMore]   = useState(true);
  const [available, setAvailable] = useState(false);

  const loadWorkers = useCallback(async (pageNum = 0, reset = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      const res = await workerApi.list({ categoryId, city, available: available || undefined, page: pageNum, size: 20 });
      const { content, last } = res.data.data;
      setWorkers(prev => reset ? content : [...prev, ...content]);
      setHasMore(!last);
      setPage(pageNum);
    } finally { setLoading(false); setRefreshing(false); }
  }, [categoryId, city, available]);

  useEffect(() => { loadWorkers(0, true); }, [loadWorkers]);

  const onRefresh = () => { setRefreshing(true); loadWorkers(0, true); };

  const renderWorker = ({ item }: { item: WorkerListing }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('WorkerProfile', { workerId: item.id })}
      activeOpacity={0.7}>

      {/* Photo */}
      <View style={styles.photoWrap}>
        {item.profilePhoto
          ? <Image source={{ uri: item.profilePhoto }} style={styles.photo} />
          : <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>}
        <View style={[styles.availDot, { backgroundColor: item.isAvailable ? Colors.accent : Colors.textMuted }]} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.workerName} numberOfLines={1}>{item.name || 'Worker'}</Text>
          {item.isAvailable
            ? <View style={styles.availBadge}><Text style={styles.availBadgeText}>Available</Text></View>
            : <View style={styles.busyBadge}><Text style={styles.busyBadgeText}>Busy</Text></View>}
        </View>

        <Text style={styles.category}>{item.categoryName}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.location}>{item.locality || item.city}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.statText}>{formatRating(item.avgRating)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.totalJobs} jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.yearsExperience}yr exp</Text>
          </View>
        </View>

        {item.dailyRate && (
          <Text style={styles.rate}>{formatCurrency(item.dailyRate)}<Text style={styles.rateUnit}>/day</Text></Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.border} style={styles.arrow} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, available && styles.filterChipActive]}
          onPress={() => setAvailable(!available)}>
          <Ionicons
            name={available ? 'radio-button-on' : 'radio-button-off'}
            size={15} color={available ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.filterChipText, available && styles.filterChipTextActive]}>Available now</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={workers}
        keyExtractor={w => w.id}
        renderItem={renderWorker}
        contentContainerStyle={styles.list}
        onEndReached={() => { if (!loading && hasMore) loadWorkers(page + 1); }}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListFooterComponent={loading && !refreshing
          ? <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 24 }} />
          : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptySub}>Try removing filters or check a different area</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  filterBar:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:     { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive:{ color: Colors.white, fontWeight: '700' },
  list:               { padding: 16, gap: 12 },
  card:               {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  photoWrap:          { position: 'relative', marginRight: 14 },
  photo:              { width: 70, height: 70, borderRadius: 20 },
  photoPlaceholder:   { width: 70, height: 70, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoInitial:       { color: Colors.white, fontSize: 26, fontWeight: '800' },
  availDot:           { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.white },
  info:               { flex: 1 },
  infoTop:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  workerName:         { fontSize: 16, fontWeight: '700', color: Colors.secondary, flex: 1 },
  availBadge:         { backgroundColor: Colors.accent + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  availBadgeText:     { fontSize: 10, color: Colors.accent, fontWeight: '700' },
  busyBadge:          { backgroundColor: Colors.textMuted + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  busyBadgeText:      { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  category:           { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 3 },
  locationRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  location:           { fontSize: 12, color: Colors.textMuted },
  statsRow:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat:               { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText:           { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  statDivider:        { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },
  rate:               { marginTop: 6, fontSize: 16, fontWeight: '800', color: Colors.primary },
  rateUnit:           { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
  arrow:              { marginLeft: 8 },
  empty:              { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap:      { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:         { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub:           { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
});
