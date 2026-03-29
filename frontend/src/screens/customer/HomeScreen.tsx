import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { categoryApi } from '../../api/category.api';
import { bookingApi }  from '../../api/booking.api';
import { Category, Booking } from '../../types/api.types';
import { RootState }   from '../../store';
import { Colors }      from '../../constants/colors';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { formatShortDate } from '../../utils/formatting';

type Nav = NativeStackNavigationProp<CustomerStackParams>;

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 32 - 36) / 4;

function SkeletonBox({
  width, height, borderRadius = 8, light = false, style, anim,
}: {
  width: number | string; height: number; borderRadius?: number;
  light?: boolean; style?: object; anim: Animated.Value;
}) {
  return (
    <Animated.View style={[{
      width, height, borderRadius,
      backgroundColor: light ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
      opacity: anim,
    }, style]} />
  );
}

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  'Electrician':    { icon: 'flash',            color: '#F59E0B', bg: '#FEF3C7' },
  'Plumber':        { icon: 'water',            color: '#3B82F6', bg: '#DBEAFE' },
  'Carpenter':      { icon: 'hammer',           color: '#92400E', bg: '#FDE68A' },
  'Painter':        { icon: 'color-palette',    color: '#8B5CF6', bg: '#EDE9FE' },
  'Cleaner':        { icon: 'sparkles',         color: '#10B981', bg: '#D1FAE5' },
  'AC Technician':  { icon: 'snow',             color: '#06B6D4', bg: '#CFFAFE' },
  'Mason':          { icon: 'construct',        color: '#EF4444', bg: '#FEE2E2' },
  'Welder':         { icon: 'flame',            color: '#F97316', bg: '#FFEDD5' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING:     { color: '#D97706', bg: '#FEF3C7', label: 'Pending',     icon: 'time-outline' },
  CONFIRMED:   { color: '#2563EB', bg: '#DBEAFE', label: 'Confirmed',   icon: 'checkmark-circle-outline' },
  IN_PROGRESS: { color: Colors.primary, bg: '#FFF3EE', label: 'In Progress', icon: 'construct' },
  COMPLETED:   { color: Colors.accent,  bg: '#D1FAE5', label: 'Completed',   icon: 'checkmark-circle' },
  CANCELLED:   { color: Colors.danger,  bg: '#FEE2E2', label: 'Cancelled',   icon: 'close-circle' },
  EXPIRED:     { color: Colors.textMuted, bg: Colors.background, label: 'Expired', icon: 'alert-circle-outline' },
};

const HOW_IT_WORKS = [
  { icon: 'search-outline',           step: '1', title: 'Browse',  sub: 'Find skilled pros' },
  { icon: 'calendar-outline',         step: '2', title: 'Book',    sub: 'Schedule instantly' },
  { icon: 'shield-checkmark-outline', step: '3', title: 'Done',    sub: 'Job guaranteed' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { name }   = useSelector((s: RootState) => s.auth);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animated pulse for active booking indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Skeleton shimmer animation
  const skeletonAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const load = async () => {
    try {
      const [catRes, bookRes] = await Promise.all([
        categoryApi.getAll(),
        bookingApi.getMyBookings(0, 5),
      ]);
      setCategories(catRes.data.data);
      setRecentBookings(bookRes.data.data.content);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSearch = () => {
    if (search.trim()) navigation.navigate('WorkerListing', {});
  };

  const activeBooking = recentBookings.find(b =>
    ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)
  );

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const S = (p: Omit<Parameters<typeof SkeletonBox>[0], 'anim'>) =>
    <SkeletonBox {...p} anim={skeletonAnim} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.headerTop}>
              <View style={{ flex: 1, gap: 8 }}>
                <S light width={100} height={13} borderRadius={6} />
                <S light width={170} height={22} borderRadius={6} />
              </View>
              <View style={styles.avatarBtn} />
            </View>
            <S light width="100%" height={50} borderRadius={16} />
          </View>

          {/* Categories skeleton */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <S width={110} height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                <S width={200} height={12} borderRadius={4} />
              </View>
            </View>
            <View style={styles.categoryGrid}>
              {Array(8).fill(0).map((_, i) => (
                <S key={i} width={CARD_W} height={92} borderRadius={18} />
              ))}
            </View>
          </View>

          {/* Booking cards skeleton */}
          <View style={styles.section}>
            <S width={150} height={18} borderRadius={6} style={{ marginBottom: 16 }} />
            {Array(3).fill(0).map((_, i) => (
              <S key={i} width="100%" height={72} borderRadius={16} style={{ marginBottom: 10 }} />
            ))}
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }>

        {/* ══════════════════════════════
            HEADER
        ══════════════════════════════ */}
        <View style={styles.header}>
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Greeting row */}
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.name}>{name || 'there'}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('CustomerProfile')}>
              <Text style={styles.avatarText}>{(name || 'U')[0].toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search electrician, plumber..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={handleSearch} style={styles.searchGoBtn}>
                <Text style={styles.searchGoBtnText}>Go</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.searchIconRight}>
                <Ionicons name="options-outline" size={16} color={Colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════
            ACTIVE BOOKING BANNER
        ══════════════════════════════ */}
        {activeBooking && (
          <TouchableOpacity
            style={styles.activeBanner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('BookingTracking', { bookingId: activeBooking.id })}>
            <View style={styles.activeBannerInner}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.pulseOuter}>
                  <Animated.View style={[styles.pulseInner, { transform: [{ scale: pulseAnim }] }]} />
                </View>
                <View>
                  <Text style={styles.activeBannerTitle}>Booking Active</Text>
                  <Text style={styles.activeBannerSub}>
                    {activeBooking.categoryName} · {activeBooking.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <View style={styles.trackBtn}>
                <Text style={styles.trackBtnText}>Track</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.white} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════
            CATEGORIES
        ══════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Our Services</Text>
              <Text style={styles.sectionSub}>Book a skilled professional near you</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('WorkerListing', {})}>
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {categories.map(cat => {
              const meta = CATEGORY_META[cat.name] || {
                icon: 'construct-outline', color: Colors.primary, bg: '#FFF3EE',
              };
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  activeOpacity={0.78}
                  onPress={() => navigation.navigate('WorkerListing', {
                    categoryId: cat.id, categoryName: cat.name,
                  })}>
                  <View style={[styles.catIconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                  </View>
                  <Text style={styles.catLabel} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ══════════════════════════════
            HOW IT WORKS  (new users only)
        ══════════════════════════════ */}
        {recentBookings.length === 0 && <View style={styles.howCard}>
          <View style={styles.howHeader}>
            <View style={styles.howBadge}>
              <Text style={styles.howBadgeText}>Quick Guide</Text>
            </View>
            <Text style={styles.howTitle}>How it works</Text>
          </View>
          <View style={styles.howSteps}>
            {HOW_IT_WORKS.map((step, i) => (
              <React.Fragment key={step.step}>
                <View style={styles.howStep}>
                  <View style={styles.howIconBox}>
                    <Ionicons name={step.icon as any} size={18} color={Colors.primary} />
                    <View style={styles.howBadgeNum}>
                      <Text style={styles.howBadgeNumText}>{step.step}</Text>
                    </View>
                  </View>
                  <Text style={styles.howStepTitle}>{step.title}</Text>
                  <Text style={styles.howStepSub}>{step.sub}</Text>
                </View>
                {i < HOW_IT_WORKS.length - 1 && (
                  <View style={styles.howConnector}>
                    <View style={styles.howConnectorLine} />
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>}

        {/* ══════════════════════════════
            RECENT BOOKINGS
        ══════════════════════════════ */}
        {recentBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recent Bookings</Text>
                <Text style={styles.sectionSub}>Your latest service requests</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('MyBookings')}>
                <Text style={styles.seeAllText}>View all</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {recentBookings.map(b => {
              const conf    = STATUS_CONFIG[b.status] || STATUS_CONFIG.EXPIRED;
              const isActive = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.bookingCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('BookingTracking', { bookingId: b.id })}>
                  <View style={[styles.bookingLeftBar, { backgroundColor: conf.color }]} />
                  <View style={[styles.bookingIconWrap, { backgroundColor: conf.bg }]}>
                    <Ionicons name={conf.icon} size={20} color={conf.color} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingCategory}>{b.categoryName}</Text>
                    <View style={styles.bookingWorkerRow}>
                      <Ionicons name="person-circle-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.bookingWorker}>{b.worker.name}</Text>
                    </View>
                    <Text style={styles.bookingDate}>{formatShortDate(b.scheduledAt)}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <View style={[styles.statusPill, { backgroundColor: conf.bg }]}>
                      {isActive && b.status === 'IN_PROGRESS' && (
                        <View style={styles.statusDot} />
                      )}
                      <Text style={[styles.statusPillText, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ══════════════════════════════
            EMPTY STATE
        ══════════════════════════════ */}
        {recentBookings.length === 0 && (
          <View style={styles.emptySection}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="calendar-outline" size={38} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySub}>
                Browse services above and book a verified professional near you.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('WorkerListing', {})}>
                <Ionicons name="search-outline" size={16} color={Colors.white} />
                <Text style={styles.emptyBtnText}>Find Workers</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════════════════════
            TRUST FOOTER
        ══════════════════════════════ */}
        <View style={styles.trustBanner}>
          {[
            { icon: 'shield-checkmark', text: 'Verified Workers' },
            { icon: 'lock-closed',      text: 'Safe Payments' },
            { icon: 'headset',          text: '24/7 Support' },
          ].map(t => (
            <View key={t.text} style={styles.trustItem}>
              <Ionicons name={t.icon as any} size={15} color={Colors.accent} />
              <Text style={styles.trustText}>{t.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 + insets.bottom }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  // ─── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute', top: 30, right: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  greeting:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  name:       { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 2, letterSpacing: -0.4 },
  avatarBtn:  {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: '800' },

  searchBar:  {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 16, paddingHorizontal: 14, height: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 8,
  },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 14, color: Colors.textPrimary },
  searchGoBtn:    { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  searchGoBtnText:{ color: Colors.white, fontWeight: '700', fontSize: 13 },
  searchIconRight:{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },

  // ─── Active booking banner ────────────────────────────────────
  activeBanner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  activeBannerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF3EE', padding: 14,
    borderWidth: 1.5, borderColor: Colors.primary + '40', borderRadius: 18,
  },
  activeBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulseOuter:        { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary + '25', alignItems: 'center', justifyContent: 'center' },
  pulseInner:        { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  activeBannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.secondary },
  activeBannerSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  trackBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  trackBtnText:      { color: Colors.white, fontSize: 12, fontWeight: '700' },

  // ─── Sections ─────────────────────────────────────────────────
  section:      { marginHorizontal: 16, marginTop: 24 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.secondary, letterSpacing: -0.3 },
  sectionSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:   { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // ─── Category grid ────────────────────────────────────────────
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard:      {
    width: CARD_W,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 4,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  catIconWrap:  { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catLabel:     { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', lineHeight: 14 },

  // ─── How it works ─────────────────────────────────────────────
  howCard: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: Colors.white, borderRadius: 22, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  howHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  howBadge:        { backgroundColor: '#FFF3EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  howBadgeText:    { fontSize: 11, fontWeight: '700', color: Colors.primary },
  howTitle:        { fontSize: 15, fontWeight: '800', color: Colors.secondary },
  howSteps:        { flexDirection: 'row', alignItems: 'flex-start' },
  howStep:         { flex: 1, alignItems: 'center' },
  howIconBox:      {
    width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative',
  },
  howBadgeNum:     { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  howBadgeNumText: { fontSize: 9, fontWeight: '800', color: Colors.white },
  howStepTitle:    { fontSize: 12, fontWeight: '700', color: Colors.secondary, textAlign: 'center' },
  howStepSub:      { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 3, lineHeight: 14 },
  howConnector:    { alignItems: 'center', paddingTop: 12, paddingHorizontal: 2 },
  howConnectorLine:{ width: 1, height: 0 },

  // ─── Booking cards ────────────────────────────────────────────
  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  bookingLeftBar:  { width: 4, alignSelf: 'stretch' },
  bookingIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
  bookingInfo:     { flex: 1, paddingVertical: 14 },
  bookingCategory: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  bookingWorkerRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  bookingWorker:   { fontSize: 12, color: Colors.textMuted },
  bookingDate:     { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  bookingRight:    { alignItems: 'flex-end', paddingRight: 12, paddingVertical: 12 },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  statusPillText:  { fontSize: 10, fontWeight: '700' },

  // ─── Empty state ──────────────────────────────────────────────
  emptySection: { marginHorizontal: 16, marginTop: 24 },
  emptyCard:    {
    backgroundColor: Colors.white, borderRadius: 24, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  emptyIconRing:{ width: 88, height: 88, borderRadius: 28, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: Colors.primary + '25' },
  emptyTitle:   { fontSize: 18, fontWeight: '800', color: Colors.secondary },
  emptySub:     { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20, marginBottom: 20 },
  emptyBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // ─── Trust banner ─────────────────────────────────────────────
  trustBanner: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  trustText: { fontSize: 9, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', lineHeight: 12 },
});
