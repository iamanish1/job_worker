import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workerApi } from '../../../api/worker.api';
import { userApi }   from '../../../api/user.api';
import { Colors }    from '../../../constants/colors';
import { OnboardingData } from './WorkerOnboardingScreen';

interface Props {
  data:       Partial<OnboardingData>;
  onBack:     () => void;
  onComplete: () => void;
}

export default function Step5Review({ data, onBack, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await userApi.updateProfile({
        name:         data.name,
        email:        data.email || undefined,
        profilePhoto: data.profilePhotoKey || undefined,
      });
      await workerApi.updateProfile({
        categories: (data.categoryExperiences || []).map(c => ({
          categoryId:      c.categoryId,
          yearsExperience: c.yearsExperience,
        })),
        bio:       data.bio || undefined,
        dailyRate: parseFloat(data.dailyRate || '0'),
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        city:      data.city,
        locality:  data.locality || undefined,
        latitude:  data.latitude  || undefined,
        longitude: data.longitude || undefined,
      } as any);
      Alert.alert(
        'Profile Submitted!',
        'Your identity is verified and profile is under review. We\'ll notify you within 24 hours once approved.',
        [{ text: 'Go to Dashboard', onPress: onComplete }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Submission failed. Please retry.');
    } finally { setLoading(false); }
  };

  const sections: Array<{
    title: string; icon: any; iconColor: string; iconBg: string;
    rows: Array<{ label: string; value?: string | number }>;
  }> = [
    {
      title: 'Personal Info', icon: 'person-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE',
      rows: [
        { label: 'Name',  value: data.name },
        { label: 'Email', value: data.email || 'Not provided' },
        { label: 'Photo', value: data.profilePhotoKey ? 'Uploaded' : 'Not uploaded' },
      ],
    },
    {
      title: 'Skills', icon: 'briefcase-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE',
      rows: [
        ...(data.categoryExperiences?.map(c => ({
          label: c.categoryName,
          value: `${c.yearsExperience} yr${c.yearsExperience !== 1 ? 's' : ''}`,
        })) || []),
        { label: 'Bio', value: data.bio ? data.bio.slice(0, 60) + (data.bio.length > 60 ? '…' : '') : 'Not provided' },
      ],
    },
    {
      title: 'Location & Rates', icon: 'location-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7',
      rows: [
        { label: 'City',        value: data.city },
        { label: 'Locality',    value: data.locality || 'Not provided' },
        { label: 'Daily Rate',  value: data.dailyRate ? `₹${data.dailyRate}/day` : undefined },
        { label: 'Hourly Rate', value: data.hourlyRate ? `₹${data.hourlyRate}/hr` : 'Not set' },
      ],
    },
    {
      title: 'Identity Verification', icon: 'shield-checkmark-outline', iconColor: '#10B981', iconBg: '#D1FAE5',
      rows: [
        { label: 'Aadhaar', value: data.aadhaarVerified ? '✓ Verified' : '✗ Not verified' },
        { label: 'Face',    value: data.faceVerified    ? '✓ Verified' : '✗ Not verified' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Almost there!</Text>
        <Text style={styles.heroSub}>Review your profile before submitting for verification.</Text>
      </View>

      {/* Review sections */}
      {sections.map(section => (
        <View key={section.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: section.iconBg }]}>
              <Ionicons name={section.icon} size={16} color={section.iconColor} />
            </View>
            <Text style={styles.cardTitle}>{section.title}</Text>
          </View>
          {section.rows.filter(r => r.value !== undefined && r.value !== '').map(row => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[
                styles.rowValue,
                typeof row.value === 'string' && row.value.startsWith('✓') && styles.rowValueSuccess,
                typeof row.value === 'string' && row.value.startsWith('✗') && styles.rowValueDanger,
              ]}>{row.value}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Verification note */}
      <View style={styles.noteBox}>
        <Ionicons name="time-outline" size={18} color="#D97706" />
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>Profile review takes ~24 hours</Text>
          <Text style={styles.noteText}>Your identity is already verified. An admin will review your profile and approve it. You'll receive a notification once approved.</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={loading}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : (
              <>
                <Ionicons name="send" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Submit Profile</Text>
              </>
            )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  inner:             { padding: 20, paddingBottom: 40 },

  hero:              { alignItems: 'center', marginBottom: 24 },
  heroIconWrap:      { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle:         { fontSize: 22, fontWeight: '800', color: Colors.secondary },
  heroSub:           { fontSize: 13, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },

  card:              { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIconWrap:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:         { fontSize: 14, fontWeight: '700', color: Colors.secondary },

  row:               { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel:          { fontSize: 13, color: Colors.textMuted },
  rowValue:          { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 16 },
  rowValueSuccess:   { color: Colors.accent },
  rowValueDanger:    { color: Colors.danger },

  noteBox:           { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' },
  noteTitle:         { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  noteText:          { fontSize: 12, color: '#92400E', lineHeight: 18 },

  btnRow:            { flexDirection: 'row', gap: 12 },
  backBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary },
  backBtnText:       { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  submitBtn:         { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  submitBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
