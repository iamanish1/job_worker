import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookingApi } from '../../api/booking.api';
import { reviewApi } from '../../api/review.api';
import { Booking, BookingStatus } from '../../types/api.types';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../constants/colors';
import { formatDate, formatCurrency } from '../../utils/formatting';
import { Config } from '../../constants/config';

type Props = NativeStackScreenProps<CustomerStackParams, 'BookingTracking'>;

const STEPS: { key: BookingStatus; label: string; icon: any }[] = [
  { key: 'PENDING',     label: 'Waiting',    icon: 'time-outline' },
  { key: 'CONFIRMED',   label: 'Confirmed',  icon: 'checkmark-circle-outline' },
  { key: 'IN_PROGRESS', label: 'In Progress',icon: 'construct-outline' },
  { key: 'COMPLETED',   label: 'Done',       icon: 'trophy-outline' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Waiting for worker to confirm', color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED:   { label: 'Worker confirmed your booking', color: '#2563EB', bg: '#DBEAFE' },
  IN_PROGRESS: { label: 'Job is in progress',            color: Colors.primary, bg: '#FFF3EE' },
  COMPLETED:   { label: 'Job completed successfully!',   color: Colors.accent, bg: '#D1FAE5' },
  CANCELLED:   { label: 'Booking was cancelled',         color: Colors.danger, bg: '#FEE2E2' },
  EXPIRED:     { label: 'Booking expired',               color: Colors.textMuted, bg: Colors.background },
};

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

export default function BookingTrackingScreen({ route, navigation }: Props) {
  const { bookingId, initialOtpCode } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  // OTP is only returned on booking creation — keep it in state from navigation param
  const [displayOtp, setDisplayOtp] = useState<string | null>(initialOtpCode || null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = useRef(false);

  const fetchBooking = async () => {
    try {
      const res = await bookingApi.getById(bookingId);
      const b = res.data.data;
      setBooking(b);
      setDisplayOtp(b.otpCode ?? null);
      if (TERMINAL_STATUSES.includes(b.status)) {
        terminalRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBooking();
    pollRef.current = setInterval(() => {
      if (!terminalRef.current) fetchBooking();
    }, Config.BOOKING_POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [bookingId]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive',
        onPress: async () => {
          try { await bookingApi.cancel(bookingId); fetchBooking(); }
          catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to cancel'); }
        },
      },
    ]);
  };

  const submitReview = async () => {
    if (!booking || rating < 1) {
      Alert.alert('Rating required', 'Please select a star rating first.');
      return;
    }
    setReviewLoading(true);
    try {
      await reviewApi.create({
        bookingId: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });
      setReviewVisible(false);
      setRating(0);
      setComment('');
      await fetchBooking();
      Alert.alert('Review submitted', 'Thanks for rating this worker.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></SafeAreaView>
  );
  if (!booking) return null;

  const isTerminal = TERMINAL_STATUSES.includes(booking.status);
  const isActive   = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);
  const stepIndex  = STEPS.findIndex(s => s.key === booking.status);
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.EXPIRED;
  // Show OTP while booking is active (PENDING = just booked, CONFIRMED = worker arriving)
  const showOtp = isActive && booking.status !== 'IN_PROGRESS' && displayOtp;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConf.bg }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusConf.color + '20' }]}>
            <Ionicons
              name={booking.status === 'COMPLETED' ? 'trophy' : booking.status === 'CANCELLED' ? 'close-circle' : 'construct'}
              size={28} color={statusConf.color}
            />
          </View>
          <Text style={[styles.statusBannerText, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>

        {/* Progress timeline — only for active bookings */}
        {!isTerminal && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Progress</Text>
            <View style={styles.timeline}>
              {STEPS.map((step, i) => {
                const done    = i <= stepIndex;
                const current = i === stepIndex;
                return (
                  <View key={step.key} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, done && styles.timelineDotDone, current && styles.timelineDotCurrent]}>
                        <Ionicons name={done ? 'checkmark' : step.icon} size={14} color={done ? Colors.white : Colors.textMuted} />
                      </View>
                      {i < STEPS.length - 1 && (
                        <View style={[styles.timelineLine, i < stepIndex && styles.timelineLineDone]} />
                      )}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={[styles.timelineLabel, current && styles.timelineLabelCurrent]}>{step.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* OTP card — shown while booking is active and OTP is available */}
        {showOtp && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.otpTitle}>Job Start OTP</Text>
            </View>
            <View style={styles.otpCodeRow}>
              {displayOtp!.split('').map((digit, i) => (
                <View key={i} style={styles.otpDigitBox}>
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.otpHint}>Share this code with the worker when they arrive</Text>
          </View>
        )}

        {/* Worker details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Worker Details</Text>
          <View style={styles.workerRow}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>{(booking.worker.name || 'W')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{booking.worker.name || 'Worker'}</Text>
              <Text style={styles.workerPhone}>{booking.worker.phone}</Text>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${booking.worker.phone}`)}>
              <Ionicons name="call" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <DetailRow icon="construct-outline"  label="Service"   value={booking.categoryName} />
          <DetailRow icon="calendar-outline"   label="Scheduled" value={formatDate(booking.scheduledAt)} />
          <DetailRow icon="location-outline"   label="Address"   value={booking.address} />
          {booking.description && <DetailRow icon="document-text-outline" label="Description" value={booking.description} />}
          {booking.quotedAmount && <DetailRow icon="cash-outline" label="Amount" value={formatCurrency(booking.quotedAmount)} />}
          {booking.completedAt && <DetailRow icon="checkmark-done-outline" label="Completed" value={formatDate(booking.completedAt)} />}
        </View>

        {/* Cancel button */}
        {isActive && booking.status !== 'IN_PROGRESS' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'COMPLETED' && !booking.reviewed && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => setReviewVisible(true)}>
            <Ionicons name="star" size={18} color={Colors.white} />
            <Text style={styles.reviewBtnText}>Rate & Review Worker</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'COMPLETED' && booking.reviewed && (
          <View style={styles.reviewedCard}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
            <Text style={styles.reviewedText}>You already reviewed this worker.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={() => setReviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewModalTitle}>Rate Your Worker</Text>
            <Text style={styles.reviewModalSub}>Your feedback helps other customers choose better workers.</Text>

            <View style={styles.starRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1;
                return (
                  <TouchableOpacity key={starValue} onPress={() => setRating(starValue)}>
                    <Ionicons
                      name={starValue <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write a short review (optional)"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={comment}
              onChangeText={setComment}
              maxLength={300}
              textAlignVertical="top"
            />

            <View style={styles.reviewModalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReviewVisible(false)} disabled={reviewLoading}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, reviewLoading && styles.modalSubmitDisabled]} onPress={submitReview} disabled={reviewLoading}>
                {reviewLoading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.modalSubmitText}>Submit Review</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: Colors.background },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  statusBanner:       { margin: 16, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 },
  statusIconWrap:     { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusBannerText:   { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  card:               {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: Colors.secondary, marginBottom: 14 },
  timeline:           { gap: 0 },
  timelineItem:       { flexDirection: 'row', gap: 14 },
  timelineLeft:       { alignItems: 'center', width: 28 },
  timelineDot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone:    { backgroundColor: Colors.primary + '30' },
  timelineDotCurrent: { backgroundColor: Colors.primary },
  timelineLine:       { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 4, minHeight: 20 },
  timelineLineDone:   { backgroundColor: Colors.primary },
  timelineRight:      { flex: 1, paddingBottom: 20, justifyContent: 'center' },
  timelineLabel:      { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  timelineLabelCurrent:{ color: Colors.primary, fontWeight: '700', fontSize: 15 },
  otpCard:            {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: Colors.primary + '30',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  otpHeader:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  otpTitle:           { fontSize: 16, fontWeight: '700', color: Colors.primary },
  otpCodeRow:         { flexDirection: 'row', gap: 6, marginBottom: 12 },
  otpDigitBox:        {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: '#FFF3EE',
    borderWidth: 2, borderColor: Colors.primary + '40', alignItems: 'center', justifyContent: 'center',
  },
  otpDigit:           { fontSize: 20, fontWeight: '800', color: Colors.primary },
  otpHint:            { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  workerRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerAvatar:       { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText:   { color: Colors.white, fontSize: 20, fontWeight: '700' },
  workerInfo:         { flex: 1 },
  workerName:         { fontSize: 16, fontWeight: '700', color: Colors.secondary },
  workerPhone:        { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  callBtn:            { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  detailRow:          { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailIcon:         { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  detailContent:      { flex: 1 },
  detailLabel:        { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:        { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', marginTop: 2 },
  cancelBtn:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.danger + '60', backgroundColor: Colors.danger + '08',
  },
  cancelBtnText:      { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  reviewBtn:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  reviewBtnText:      { color: Colors.white, fontWeight: '700', fontSize: 15 },
  reviewedCard:       {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 14,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  reviewedText:       { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  reviewModal:        { backgroundColor: Colors.white, borderRadius: 20, padding: 20 },
  reviewModalTitle:   { fontSize: 20, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  reviewModalSub:     { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  starRow:            { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18, marginBottom: 18 },
  reviewInput:        { minHeight: 110, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 14, color: Colors.textPrimary },
  reviewModalBtns:    { flexDirection: 'row', gap: 12, marginTop: 18 },
  modalCancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText:    { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  modalSubmitBtn:     { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSubmitDisabled:{ opacity: 0.6 },
  modalSubmitText:    { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
