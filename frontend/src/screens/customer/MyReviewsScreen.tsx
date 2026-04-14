import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import { PageResponse } from '../../types/api.types';
import { Colors } from '../../constants/colors';
import { formatDate } from '../../utils/formatting';

interface MyReview {
  id:           string;
  bookingId:    string;
  workerName:   string | null;
  workerPhoto:  string | null;
  categoryName: string;
  rating:       number;
  comment:      string | null;
  createdAt:    string;
}

const StarRow = ({ rating }: { rating: number }) => (
  <View style={styles.starRow}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={14}
        color="#F59E0B"
      />
    ))}
  </View>
);

export default function MyReviewsScreen() {
  const [reviews,    setReviews]    = useState<MyReview[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(0);
  const [hasMore,    setHasMore]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);

  const fetchReviews = useCallback(async (pageNum = 0, refresh = false) => {
    try {
      const res = await apiClient.get<{ data: PageResponse<MyReview> }>(
        '/reviews/my', { params: { page: pageNum, size: 20 } }
      );
      const data = res.data.data;
      setReviews(prev => refresh || pageNum === 0 ? data.content : [...prev, ...data.content]);
      setHasMore(!data.last);
      setPage(pageNum);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchReviews(0); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews(0, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchReviews(page + 1);
  };

  const renderItem = ({ item }: { item: MyReview }) => (
    <View style={styles.card}>
      {/* Worker info */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.workerName || 'W')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.workerName}>{item.workerName || 'Worker'}</Text>
          <View style={styles.categoryBadge}>
            <Ionicons name="construct-outline" size={11} color={Colors.primary} />
            <Text style={styles.categoryText}>{item.categoryName}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Rating */}
      <View style={styles.ratingRow}>
        <StarRow rating={item.rating} />
        <Text style={styles.ratingLabel}>{item.rating}/5</Text>
      </View>

      {/* Comment */}
      {item.comment ? (
        <Text style={styles.comment}>"{item.comment}"</Text>
      ) : (
        <Text style={styles.noComment}>No comment added</Text>
      )}
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={reviews}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={reviews.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="star-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyHint}>
              After a job is completed, you can rate and review the worker.
              Your reviews help others make better choices.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.primary} /> : null
        }
        ListHeaderComponent={
          reviews.length > 0 ? (
            <View style={styles.summaryBar}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.summaryText}>{reviews.length} review{reviews.length !== 1 ? 's' : ''} given</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent:    { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, padding: 16 },

  summaryBar:     {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10,
    marginBottom: 4,
  },
  summaryText:    { fontSize: 13, fontWeight: '600', color: '#92400E' },

  card:           {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:         {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:     { color: Colors.white, fontSize: 18, fontWeight: '700' },
  headerInfo:     { flex: 1 },
  workerName:     { fontSize: 15, fontWeight: '700', color: Colors.secondary },
  categoryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  categoryText:   { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  dateText:       { fontSize: 11, color: Colors.textMuted },

  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  starRow:        { flexDirection: 'row', gap: 2 },
  ratingLabel:    { fontSize: 13, fontWeight: '700', color: '#92400E' },

  comment:        { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  noComment:      { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },

  empty:          { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon:      {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: Colors.secondary, marginBottom: 10 },
  emptyHint:      { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
