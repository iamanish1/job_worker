import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { workerApi } from '../../api/worker.api';
import { reviewApi } from '../../api/review.api';
import { Review, WorkerProfile } from '../../types/api.types';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate, formatRating } from '../../utils/formatting';

type Props = NativeStackScreenProps<CustomerStackParams, 'WorkerProfile'>;

export default function WorkerProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { workerId } = route.params;
  const [worker,  setWorker]  = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      workerApi.getProfile(workerId),
      reviewApi.getWorkerReviews(workerId, 0, 5),
    ])
      .then(([profileRes, reviewRes]) => {
        setWorker(profileRes.data.data);
        setReviews(reviewRes.data.data.content);
      })
      .finally(() => setLoading(false));
  }, [workerId]);

  if (loading) return (
    <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></SafeAreaView>
  );
  if (!worker) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.heroBg} />
          <View style={styles.heroContent}>
            {worker.profilePhoto
              ? <Image source={{ uri: worker.profilePhoto }} style={styles.photo} />
              : <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitial}>{(worker.name || '?')[0].toUpperCase()}</Text>
                </View>}

            <View style={[styles.availBadge, { backgroundColor: worker.isAvailable ? Colors.accent : Colors.textMuted }]}>
              <View style={styles.availDot} />
              <Text style={styles.availText}>{worker.isAvailable ? 'Available' : 'Busy'}</Text>
            </View>

            <Text style={styles.name}>{worker.name || 'Worker'}</Text>
            <Text style={styles.category}>{worker.categoryName}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.location}>{worker.locality || worker.city}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsContainer}>
          <StatCard icon="star" iconColor="#F59E0B" value={formatRating(worker.avgRating)} label="Rating" />
          <View style={styles.statDivider} />
          <StatCard icon="checkmark-circle" iconColor={Colors.accent} value={String(worker.totalJobs)} label="Jobs Done" />
          <View style={styles.statDivider} />
          <StatCard icon="trophy" iconColor={Colors.primary} value={`${worker.yearsExperience}yr`} label="Experience" />
        </View>

        {/* Pricing */}
        {(worker.dailyRate || worker.hourlyRate) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Pricing</Text>
            </View>
            <View style={styles.priceGrid}>
              {worker.dailyRate && (
                <View style={styles.priceBox}>
                  <Text style={styles.priceAmount}>{formatCurrency(worker.dailyRate)}</Text>
                  <Text style={styles.priceLabel}>per day</Text>
                </View>
              )}
              {worker.hourlyRate && (
                <View style={styles.priceBox}>
                  <Text style={styles.priceAmount}>{formatCurrency(worker.hourlyRate)}</Text>
                  <Text style={styles.priceLabel}>per hour</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* About */}
        {worker.bio && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>About</Text>
            </View>
            <Text style={styles.bio}>{worker.bio}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Ratings & Reviews</Text>
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.reviewEmpty}>No customer reviews yet.</Text>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewRow}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{(review.reviewerName || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.reviewBody}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewName}>{review.reviewerName}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                  </View>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Ionicons
                        key={index}
                        name={index < review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Documents verified */}
        {worker.documents && worker.documents.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.accent} />
              <Text style={styles.cardTitle}>Verification</Text>
            </View>
            {worker.documents.map(doc => (
              <View key={doc.id} style={styles.docRow}>
                <Ionicons
                  name={doc.status === 'VERIFIED' ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={doc.status === 'VERIFIED' ? Colors.accent : Colors.warning}
                />
                <Text style={styles.docLabel}>{doc.docType.replace('_', ' ')}</Text>
                <Text style={[styles.docStatus, { color: doc.status === 'VERIFIED' ? Colors.accent : Colors.warning }]}>
                  {doc.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 110 + insets.bottom }} />
      </ScrollView>

      {/* Book Now CTA */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {worker.dailyRate && (
          <View style={styles.ctaPrice}>
            <Text style={styles.ctaPriceAmount}>{formatCurrency(worker.dailyRate)}</Text>
            <Text style={styles.ctaPriceUnit}>/day</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.ctaBtn, !worker.isAvailable && styles.ctaBtnDisabled]}
          disabled={!worker.isAvailable}
          onPress={() => navigation.navigate('Booking', {
            workerId: worker.id, categoryId: worker.categoryId, categoryName: worker.categoryName,
          })}>
          <Text style={styles.ctaBtnText}>
            {worker.isAvailable ? 'Book Now' : 'Currently Unavailable'}
          </Text>
          {worker.isAvailable && <Ionicons name="arrow-forward" size={18} color={Colors.white} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, iconColor, value, label }: { icon: any; iconColor: string; value: string; label: string }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={22} color={iconColor} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  hero:             { backgroundColor: Colors.white, paddingBottom: 0 },
  heroBg:           { height: 100, backgroundColor: Colors.primary },
  heroContent:      { alignItems: 'center', paddingBottom: 24, marginTop: -50 },
  photo:            { width: 96, height: 96, borderRadius: 28, borderWidth: 4, borderColor: Colors.white },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.white,
  },
  photoInitial:     { color: Colors.white, fontSize: 36, fontWeight: '800' },
  availBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10, marginBottom: 8 },
  availDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  availText:        { color: Colors.white, fontSize: 12, fontWeight: '700' },
  name:             { fontSize: 22, fontWeight: '800', color: Colors.secondary },
  category:         { fontSize: 14, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  locationRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location:         { fontSize: 13, color: Colors.textSecondary },
  statsContainer:   {
    flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statCard:         { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:      { width: 1, backgroundColor: Colors.border },
  statValue:        { fontSize: 18, fontWeight: '800', color: Colors.secondary },
  statLabel:        { fontSize: 12, color: Colors.textSecondary },
  card:             {
    backgroundColor: Colors.white, borderRadius: 16, margin: 16, marginTop: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle:        { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  priceGrid:        { flexDirection: 'row', gap: 12 },
  priceBox:         { flex: 1, backgroundColor: Colors.background, borderRadius: 12, padding: 14, alignItems: 'center' },
  priceAmount:      { fontSize: 20, fontWeight: '800', color: Colors.primary },
  priceLabel:       { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bio:              { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  reviewEmpty:      { fontSize: 13, color: Colors.textMuted },
  reviewRow:        { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  reviewAvatar:     { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  reviewBody:       { flex: 1 },
  reviewTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  reviewName:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  reviewDate:       { fontSize: 11, color: Colors.textMuted },
  reviewStars:      { flexDirection: 'row', gap: 2, marginTop: 4 },
  reviewComment:    { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 6 },
  docRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  docLabel:         { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  docStatus:        { fontSize: 12, fontWeight: '700' },
  ctaBar:           {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center',
    padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  ctaPrice:         { marginRight: 16 },
  ctaPriceAmount:   { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  ctaPriceUnit:     { fontSize: 12, color: Colors.textSecondary },
  ctaBtn:           {
    flex: 1, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaBtnDisabled:   { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  ctaBtnText:       { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
