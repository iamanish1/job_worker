import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OtpInput from '../../components/ui/OtpInput';
import { bookingApi } from '../../api/booking.api';
import { Booking } from '../../types/api.types';
import { Colors } from '../../constants/colors';
import { formatDate, formatCurrency } from '../../utils/formatting';

type Tab = 'PENDING' | 'UPCOMING' | 'HISTORY';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'PENDING',  label: 'Requests', icon: 'time-outline' },
  { key: 'UPCOMING', label: 'Active',   icon: 'construct-outline' },
  { key: 'HISTORY',  label: 'History',  icon: 'checkmark-done-outline' },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  PENDING:     { color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED:   { color: '#2563EB', bg: '#DBEAFE' },
  IN_PROGRESS: { color: Colors.primary, bg: '#FFF3EE' },
  COMPLETED:   { color: Colors.accent, bg: '#D1FAE5' },
  CANCELLED:   { color: Colors.danger, bg: '#FEE2E2' },
  EXPIRED:     { color: Colors.textMuted, bg: Colors.background },
};

export default function BookingRequestsScreen() {
  const [tab,       setTab]      = useState<Tab>('PENDING');
  const [bookings,  setBookings] = useState<Booking[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [otpModal,  setOtpModal] = useState<{ bookingId: string } | null>(null);
  const [otp,       setOtp]      = useState('');
  const [otpLoading,setOtpLoading]= useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getMyBookings(0, 50);
      setBookings(res.data.data.content);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = bookings.filter(b => {
    if (tab === 'PENDING')  return b.status === 'PENDING';
    if (tab === 'UPCOMING') return ['CONFIRMED', 'IN_PROGRESS'].includes(b.status);
    return ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status);
  });

  const handleAccept = async (bookingId: string) => {
    try { await bookingApi.confirm(bookingId); load(); }
    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to confirm'); }
  };

  const handleReject = (bookingId: string) => {
    Alert.alert('Decline Booking', 'Are you sure you want to decline this booking?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try { await bookingApi.cancel(bookingId, 'Worker unavailable'); load(); }
        catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to decline'); }
      }},
    ]);
  };

  const submitOtp = async () => {
    if (!otpModal || otp.length !== 6) return;
    setOtpLoading(true);
    try {
      await bookingApi.start(otpModal.bookingId, otp);
      setOtpModal(null); load();
    } catch (e: any) {
      Alert.alert('Invalid OTP', e.response?.data?.message || 'Wrong OTP code');
      setOtp('');
    } finally { setOtpLoading(false); }
  };

  const handleComplete = (bookingId: string) => {
    Alert.alert('Mark Complete', 'Confirm the job is fully done?', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, Complete', onPress: async () => {
        try { await bookingApi.complete(bookingId); load(); }
        catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.EXPIRED;
    return (
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{(item.customer.name || 'C')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customer.name || 'Customer'}</Text>
            <Text style={styles.category}>{item.categoryName}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusPillText, { color: sc.color }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detail}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.detailText}>{formatDate(item.scheduledAt)}</Text>
          </View>
          {item.description && (
            <View style={styles.detail}>
              <Ionicons name="document-text-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.detailText} numberOfLines={2}>{item.description}</Text>
            </View>
          )}
          {item.quotedAmount && (
            <View style={styles.detail}>
              <Ionicons name="cash-outline" size={13} color={Colors.accent} />
              <Text style={[styles.detailText, { color: Colors.accent, fontWeight: '700' }]}>{formatCurrency(item.quotedAmount)}</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        {item.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
              <Ionicons name="close" size={16} color={Colors.danger} />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'CONFIRMED' && (
          <TouchableOpacity style={styles.startBtn} onPress={() => { setOtp(''); setOtpModal({ bookingId: item.id }); }}>
            <Ionicons name="key-outline" size={18} color={Colors.white} />
            <Text style={styles.startBtnText}>Enter OTP to Start Job</Text>
          </TouchableOpacity>
        )}
        {item.status === 'IN_PROGRESS' && (
          <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={styles.completeBtnText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const pendingCount  = bookings.filter(b => b.status === 'PENDING').length;
  const upcomingCount = bookings.filter(b => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const count = t.key === 'PENDING' ? pendingCount : t.key === 'UPCOMING' ? upcomingCount : 0;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon} size={16} color={tab === t.key ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{count}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading
        ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} size="large" />
        : <FlatList
            data={filtered}
            keyExtractor={b => b.id}
            renderItem={renderBooking}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="calendar-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
                <Text style={styles.emptySub}>New requests will appear here</Text>
              </View>
            }
          />}

      {/* OTP Modal */}
      {otpModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setOtpModal(null)}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key" size={28} color={Colors.primary} />
              </View>
              <View style={styles.modalStepBadge}>
                <Text style={styles.modalStepBadgeText}>Job Start Verification</Text>
              </View>
              <Text style={styles.modalTitle}>Verify Customer OTP</Text>
              <Text style={styles.modalSub}>Ask the customer for the 6-digit code shown in their app before you begin work.</Text>
            </View>

            <OtpInput length={6} value={otp} onChange={setOtp} />

            <View style={styles.modalInfoCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#1D4ED8" />
              <Text style={styles.modalInfoText}>This protects both you and the customer. The job will start only after a valid OTP is entered.</Text>
            </View>

            {otpLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setOtpModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, (otp.length !== 6 || otpLoading) && styles.modalSubmitDisabled]}
                onPress={submitOtp} disabled={otp.length !== 6 || otpLoading}>
                <Text style={styles.modalSubmitText}>Verify & Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  tabBar:           { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14 },
  tabActive:        { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabText:          { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive:    { color: Colors.primary, fontWeight: '700' },
  tabBadge:         { backgroundColor: Colors.primary, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText:     { color: Colors.white, fontSize: 10, fontWeight: '700' },
  list:             { padding: 16, gap: 12 },
  card:             {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  customerAvatar:   { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  customerAvatarText:{ color: Colors.white, fontSize: 18, fontWeight: '700' },
  customerInfo:     { flex: 1 },
  customerName:     { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  category:         { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  statusPill:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText:   { fontSize: 11, fontWeight: '700' },
  detailsRow:       { gap: 8, marginBottom: 14, paddingLeft: 4 },
  detail:           { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  detailText:       { flex: 1, fontSize: 13, color: Colors.textSecondary },
  actionRow:        { flexDirection: 'row', gap: 10 },
  rejectBtn:        {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.danger + '50', backgroundColor: Colors.danger + '08',
  },
  rejectBtnText:    { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  acceptBtn:        {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  acceptBtnText:    { color: Colors.white, fontWeight: '700', fontSize: 14 },
  startBtn:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  startBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 14 },
  completeBtn:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  completeBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 14 },
  empty:            { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap:    { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub:         { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  modalOverlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modal:            { backgroundColor: Colors.white, margin: 24, borderRadius: 24, padding: 24, width: '88%', position: 'relative' },
  modalCloseBtn:    { position: 'absolute', right: 14, top: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  modalHeader:      { alignItems: 'center', marginBottom: 20 },
  modalIconWrap:    { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalStepBadge:   { backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
  modalStepBadgeText:{ color: '#1D4ED8', fontSize: 11, fontWeight: '700' },
  modalTitle:       { fontSize: 20, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  modalSub:         { color: Colors.textSecondary, textAlign: 'center', marginTop: 6, fontSize: 13 },
  modalInfoCard:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  modalInfoText:    { flex: 1, color: '#1D4ED8', fontSize: 12, lineHeight: 18 },
  modalBtns:        { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText:  { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  modalSubmitBtn:   { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSubmitDisabled:{ opacity: 0.5 },
  modalSubmitText:  { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
