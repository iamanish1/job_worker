import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { OnboardingData } from './WorkerOnboardingScreen';
import LocationPicker, { LocationResult } from '../../../components/ui/LocationPicker';

interface Props {
  data:     Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];

export default function Step3LocationRates({ data, onUpdate, onNext, onBack }: Props) {
  const [city,       setCity]       = useState(data.city     || '');
  const [locality,   setLocality]   = useState(data.locality || '');
  const [dailyRate,  setDailyRate]  = useState(data.dailyRate  || '');
  const [hourlyRate, setHourlyRate] = useState(data.hourlyRate || '');
  const [location,   setLocation]   = useState<LocationResult | null>(
    data.latitude && data.longitude
      ? { latitude: data.latitude, longitude: data.longitude, address: data.locality || '' }
      : null
  );

  const onlyNumbers = (val: string) => val.replace(/[^0-9]/g, '');

  const handleLocationSelect = (loc: LocationResult) => {
    setLocation(loc);
    // Auto-fill locality if not already set
    if (!locality.trim()) setLocality(loc.address);
  };

  const handleNext = () => {
    if (!city.trim())  { Alert.alert('Required', 'Please select your city'); return; }
    if (!dailyRate)    { Alert.alert('Required', 'Please enter your daily rate'); return; }
    if (parseInt(dailyRate) < 100) { Alert.alert('Invalid', 'Daily rate must be at least ₹100'); return; }
    onUpdate({
      city:      city.trim(),
      locality:  locality.trim(),
      dailyRate,
      hourlyRate,
      latitude:  location?.latitude,
      longitude: location?.longitude,
    });
    onNext();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      {/* City */}
      <Text style={styles.sectionLabel}>Your City <Text style={styles.required}>*</Text></Text>
      <Text style={styles.sectionHint}>Select the city where you provide services</Text>
      <View style={styles.cityGrid}>
        {CITIES.map(c => {
          const active = city === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.cityChip, active && styles.cityChipActive]}
              onPress={() => setCity(c)}>
              {active && <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />}
              <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Exact location on map */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Exact Location <Text style={styles.optional}>(recommended)</Text>
        </Text>
        <Text style={styles.fieldHint}>Pin your exact location so customers can find you easily</Text>
        <LocationPicker
          value={location}
          onSelect={handleLocationSelect}
          placeholder="Tap to pin your location on map"
        />
      </View>

      {/* Locality */}
      <View style={styles.field}>
        <Text style={styles.label}>Locality / Area <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.inputWrap}>
          <Ionicons name="map-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Andheri West, Bandra"
            placeholderTextColor={Colors.textMuted}
            value={locality}
            onChangeText={setLocality}
          />
        </View>
      </View>

      {/* Rates */}
      <Text style={styles.sectionLabel}>Your Rates</Text>
      <Text style={styles.sectionHint}>Set competitive rates to attract more customers</Text>

      <View style={styles.ratesRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Daily Rate <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrap}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="800"
              placeholderTextColor={Colors.textMuted}
              value={dailyRate}
              onChangeText={v => setDailyRate(onlyNumbers(v))}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.rateNote}>/day</Text>
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Hourly Rate <Text style={styles.optional}>(opt)</Text></Text>
          <View style={styles.inputWrap}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="150"
              placeholderTextColor={Colors.textMuted}
              value={hourlyRate}
              onChangeText={v => setHourlyRate(onlyNumbers(v))}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.rateNote}>/hour</Text>
        </View>
      </View>

      <View style={styles.tipBox}>
        <Ionicons name="bulb-outline" size={16} color="#D97706" />
        <Text style={styles.tipText}>Workers earning ₹700–₹1200/day get 3x more bookings on average.</Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  inner:              { padding: 20, paddingBottom: 40 },

  sectionLabel:       { fontSize: 15, fontWeight: '700', color: Colors.secondary, marginBottom: 4 },
  sectionHint:        { fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
  required:           { color: Colors.danger },
  optional:           { color: Colors.textMuted, fontWeight: '500', fontSize: 11 },

  cityGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  cityChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  cityChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  cityChipText:       { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  cityChipTextActive: { color: Colors.primary, fontWeight: '700' },

  field:              { marginBottom: 8 },
  fieldHint:          { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  label:              { fontSize: 13, fontWeight: '700', color: Colors.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputWrap:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon:          { marginRight: 10 },
  rupee:              { fontSize: 16, fontWeight: '700', color: Colors.primary, marginRight: 6 },
  input:              { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 14 },
  rateNote:           { fontSize: 12, color: Colors.textMuted, marginTop: 4, marginLeft: 4 },

  ratesRow:           { flexDirection: 'row', gap: 12, marginBottom: 16 },

  tipBox:             { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' },
  tipText:            { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  btnRow:             { flexDirection: 'row', gap: 12 },
  backBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary },
  backBtnText:        { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  nextBtn:            { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  nextBtnText:        { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
