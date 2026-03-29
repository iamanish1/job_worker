import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookingApi } from '../../api/booking.api';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';
import { Colors } from '../../constants/colors';
import LocationPicker, { LocationResult } from '../../components/ui/LocationPicker';

type Props = NativeStackScreenProps<CustomerStackParams, 'Booking'>;

export default function BookingScreen({ route, navigation }: Props) {
  const { workerId, categoryId, categoryName } = route.params;

  const [location,     setLocation]     = useState<LocationResult | null>(null);
  const [description,  setDescription]  = useState('');
  const [scheduledAt,  setScheduledAt]  = useState(new Date(Date.now() + 3_600_000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const d = new Date(scheduledAt);
      d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setScheduledAt(d);
      if (Platform.OS === 'android') setShowTimePicker(true);
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const d = new Date(scheduledAt);
      d.setHours(selected.getHours(), selected.getMinutes(), 0);
      setScheduledAt(d);
    }
  };

  const handleBook = async () => {
    if (!location) { Alert.alert('Required', 'Please select your service location on the map'); return; }
    if (scheduledAt <= new Date()) { Alert.alert('Invalid time', 'Scheduled time must be in the future'); return; }

    setLoading(true);
    try {
      const res = await bookingApi.create({
        workerId, categoryId,
        address:        location.address,
        latitude:       location.latitude,
        longitude:      location.longitude,
        description:    description.trim() || undefined,
        scheduledAt:    scheduledAt.toISOString(),
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      const booking = res.data.data;
      navigation.replace('BookingTracking', {
        bookingId:      booking.id,
        initialOtpCode: booking.otpCode || undefined,
      });
    } catch (e: any) {
      Alert.alert('Booking Failed', e.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally { setLoading(false); }
  };

  const formattedDate = scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const formattedTime = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

      {/* Service summary card */}
      <View style={styles.serviceCard}>
        <View style={styles.serviceIconWrap}>
          <Ionicons name="construct" size={24} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.serviceLabel}>Service Requested</Text>
          <Text style={styles.serviceName}>{categoryName}</Text>
        </View>
      </View>

      {/* Location picker */}
      <View style={styles.field}>
        <Text style={styles.label}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} /> Service Address *
        </Text>
        <LocationPicker value={location} onSelect={setLocation} />
      </View>

      {/* Date & Time */}
      <View style={styles.field}>
        <Text style={styles.label}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /> Preferred Schedule *
        </Text>
        <View style={styles.dtRow}>
          <TouchableOpacity style={styles.dtBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.dtBtnText}>{formattedDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dtBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time" size={18} color={Colors.primary} />
            <Text style={styles.dtBtnText}>{formattedTime}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS pickers */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select Date</Text>
              <DateTimePicker value={scheduledAt} mode="date" display="spinner" minimumDate={new Date()} onChange={onDateChange} style={styles.picker} />
              <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <DateTimePicker value={scheduledAt} mode="time" display="spinner" onChange={onTimeChange} style={styles.picker} />
              <TouchableOpacity style={styles.pickerDone} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Android pickers */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker value={scheduledAt} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />
      )}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker value={scheduledAt} mode="time" display="default" onChange={onTimeChange} />
      )}

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} /> Problem Description (optional)
        </Text>
        <TextInput
          style={[styles.input, styles.multiline, { minHeight: 100 }]}
          placeholder="e.g. Ceiling fan not working, kitchen tap leaking..."
          value={description}
          onChangeText={setDescription}
          multiline numberOfLines={4}
          maxLength={500}
          placeholderTextColor={Colors.textMuted}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
        <Text style={styles.infoText}>
          After booking, you'll receive a <Text style={styles.infoBold}>6-digit OTP</Text>. Share it with the worker when they arrive to start the job.
        </Text>
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
        onPress={handleBook} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.white} /> : (
          <View style={styles.confirmBtnInner}>
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  inner:            { padding: 16, paddingBottom: 40 },
  serviceCard:      {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  serviceIconWrap:  { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },
  serviceLabel:     { fontSize: 12, color: Colors.textSecondary },
  serviceName:      { fontSize: 17, fontWeight: '700', color: Colors.secondary, marginTop: 2 },
  field:            { marginBottom: 20 },
  label:            { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:            {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary,
  },
  multiline:        { minHeight: 80 },
  charCount:        { textAlign: 'right', color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  dtRow:            { flexDirection: 'row', gap: 12 },
  dtBtn:            {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, padding: 14,
  },
  dtBtnText:        { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  infoBox:          {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoText:         { flex: 1, color: '#1D4ED8', fontSize: 13, lineHeight: 20 },
  infoBold:         { fontWeight: '700' },
  confirmBtn:       {
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmBtnDisabled:{ opacity: 0.7, shadowOpacity: 0 },
  confirmBtnInner:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmBtnText:   { color: Colors.white, fontSize: 17, fontWeight: '700' },
  pickerOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerCard:       { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  pickerTitle:      { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: Colors.secondary },
  picker:           { height: 200 },
  pickerDone:       { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  pickerDoneText:   { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
