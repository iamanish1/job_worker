import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { workerApi }  from '../../api/worker.api';
import { userApi }    from '../../api/user.api';
import { SecureStorage } from '../../utils/storage';
import { clearAuth }  from '../../store/auth.slice';
import { WorkerProfile } from '../../types/api.types';
import { Colors }     from '../../constants/colors';
import { formatRating } from '../../utils/formatting';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';

export default function WorkerProfileEditScreen() {
  const dispatch      = useDispatch();
  const [profile,   setProfile]   = useState<WorkerProfile | null>(null);
  const [name,      setName]      = useState('');
  const [bio,       setBio]       = useState('');
  const [daily,     setDaily]     = useState('');
  const [hourly,    setHourly]    = useState('');
  const [photoUri,  setPhotoUri]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    workerApi.getMyProfile().then(res => {
      const p = res.data.data;
      setProfile(p);
      setName(p.name || '');
      setBio(p.bio || '');
      setDaily(p.dailyRate?.toString() || '');
      setHourly(p.hourlyRate?.toString() || '');
      if (p.profilePhoto) setPhotoUri(p.profilePhoto);
    }).finally(() => setLoading(false));
  }, []);

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const { url } = await uploadToCloudinary(asset.uri, 'profiles', 'image/jpeg');
      setPhotoUri(url);
      await userApi.updateProfile({ profilePhoto: url });
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload photo. Please try again.');
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    setSaving(true);
    try {
      await Promise.all([
        userApi.updateProfile({ name: name.trim() }),
        workerApi.updateProfile({
          bio: bio.trim() || undefined,
          dailyRate:  parseFloat(daily)  || undefined,
          hourlyRate: parseFloat(hourly) || undefined,
        }),
      ]);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await SecureStorage.clearTokens();
        dispatch(clearAuth());
      }},
    ]);
  };

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );

  const verConfig: Record<string, { color: string; bg: string; icon: any }> = {
    VERIFIED:     { color: Colors.accent, bg: '#D1FAE5', icon: 'shield-checkmark' },
    UNDER_REVIEW: { color: '#D97706',     bg: '#FEF3C7', icon: 'time-outline' },
    REJECTED:     { color: Colors.danger, bg: '#FEE2E2', icon: 'close-circle-outline' },
    PENDING:      { color: '#7C3AED',     bg: '#EDE9FE', icon: 'document-text-outline' },
  };
  const vc = verConfig[profile?.verificationStatus || 'PENDING'] || verConfig.PENDING;

  const initials = (name || '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Profile header with tappable avatar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePhotoUpload} disabled={uploading}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={styles.avatarImg} />
              : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            <View style={styles.cameraOverlay}>
              {uploading
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Ionicons name="camera" size={14} color={Colors.white} />}
            </View>
          </TouchableOpacity>

          <Text style={styles.headerName}>{name || 'Worker'}</Text>
          <Text style={styles.headerCategory}>{profile?.categoryName}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FCD34D" />
              <Text style={styles.statValue}>{formatRating(profile?.avgRating || 0)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="briefcase" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statValue}>{profile?.totalJobs || 0}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statValue}>{profile?.yearsExperience || 0}yr</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
          </View>

          <View style={[styles.verBadge, { backgroundColor: vc.bg }]}>
            <Ionicons name={vc.icon} size={14} color={vc.color} />
            <Text style={[styles.verBadgeText, { color: vc.color }]}>
              {profile?.verificationStatus?.replace('_', ' ') || 'PENDING'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Personal Info</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="Your full name" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[styles.field, { marginBottom: 0 }]}>
              <Text style={styles.label}>About / Bio</Text>
              <TextInput style={[styles.input, styles.multiline]} value={bio}
                onChangeText={setBio} multiline numberOfLines={4} maxLength={500}
                placeholder="Describe your skills and experience..."
                placeholderTextColor={Colors.textMuted} textAlignVertical="top" />
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rateRow}>
              <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.label}>Daily Rate (₹)</Text>
                <View style={styles.rateInput}>
                  <Text style={styles.ratePrefix}>₹</Text>
                  <TextInput style={styles.rateTextInput} value={daily}
                    onChangeText={setDaily} keyboardType="number-pad"
                    placeholder="0" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>
              <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.label}>Hourly Rate (₹)</Text>
                <View style={styles.rateInput}>
                  <Text style={styles.ratePrefix}>₹</Text>
                  <TextInput style={styles.rateTextInput} value={hourly}
                    onChangeText={setHourly} keyboardType="number-pad"
                    placeholder="0" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : (
                <View style={styles.saveBtnInner}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </View>
              )}
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={16} color={Colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Account</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.accountRow} onPress={handleLogout}>
              <View style={[styles.accountIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
              </View>
              <Text style={styles.accountRowText}>Logout</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header:          { backgroundColor: Colors.primary, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 },
  avatarWrap:      { position: 'relative', marginBottom: 14 },
  avatarImg:       { width: 88, height: 88, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarPlaceholder:{ width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:      { fontSize: 34, fontWeight: '800', color: Colors.white },
  cameraOverlay:   { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },

  headerName:      { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerCategory:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginTop: 4 },
  statsRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  statItem:        { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:     { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
  statValue:       { fontSize: 18, fontWeight: '800', color: Colors.white },
  statLabel:       { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  verBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  verBadgeText:    { fontWeight: '700', fontSize: 12 },

  form:            { padding: 16 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 8 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:            { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  field:           { marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  multiline:       { minHeight: 100 },
  charCount:       { textAlign: 'right', color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  rateRow:         { flexDirection: 'row', gap: 12 },
  rateInput:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 12 },
  ratePrefix:      { fontSize: 16, fontWeight: '700', color: Colors.primary, marginRight: 4 },
  rateTextInput:   { flex: 1, fontSize: 15, color: Colors.textPrimary },
  saveBtn:         { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24, marginTop: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7, shadowOpacity: 0 },
  saveBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 16 },
  accountRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accountRowText:  { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.danger },
});
