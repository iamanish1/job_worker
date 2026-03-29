import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors }    from '../../../constants/colors';
import { OnboardingData } from './WorkerOnboardingScreen';
import { uploadToCloudinary } from '../../../utils/cloudinaryUpload';

interface Props {
  data:     Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext:   () => void;
}

export default function Step1PersonalInfo({ data, onUpdate, onNext }: Props) {
  const [name,      setName]      = useState(data.name    || '');
  const [email,     setEmail]     = useState(data.email   || '');
  const [uploading, setUploading] = useState(false);
  const [photoUri,  setPhotoUri]  = useState<string | null>(null);
  const [photoKey,  setPhotoKey]  = useState(data.profilePhotoKey || '');

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const { url } = await uploadToCloudinary(asset.uri, 'profiles', 'image/jpeg');
      setPhotoUri(asset.uri);
      setPhotoKey(url);
      onUpdate({ profilePhotoKey: url });
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload photo. Please try again.');
    } finally { setUploading(false); }
  };

  const handleNext = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name'); return; }
    onUpdate({ name: name.trim(), email: email.trim() });
    onNext();
  };

  const initials = name.trim() ? name.trim()[0].toUpperCase() : '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      {/* Avatar upload */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePhotoUpload} disabled={uploading}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{name.trim() ? initials : ''}</Text>
                {!name.trim() && <Ionicons name="person" size={36} color={Colors.textMuted} />}
              </View>
            )}
          <View style={styles.cameraOverlay}>
            {uploading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Ionicons name="camera" size={18} color={Colors.white} />}
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>
          {photoKey ? 'Photo uploaded — tap to change' : 'Tap to add profile photo (optional)'}
        </Text>
      </View>

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.label}>Email <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
        <Text style={styles.infoText}>Your name will be shown to customers when they browse workers.</Text>
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.white} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  inner:            { padding: 24, paddingBottom: 40 },

  avatarSection:    { alignItems: 'center', marginBottom: 32 },
  avatarWrap:       { position: 'relative', marginBottom: 12 },
  avatarImg:        { width: 100, height: 100, borderRadius: 32, borderWidth: 3, borderColor: Colors.primary + '40' },
  avatarPlaceholder:{ width: 100, height: 100, borderRadius: 32, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  avatarInitials:   { fontSize: 36, fontWeight: '800', color: Colors.primary },
  cameraOverlay:    { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  avatarHint:       { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  field:            { marginBottom: 20 },
  label:            { fontSize: 13, fontWeight: '700', color: Colors.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  required:         { color: Colors.danger },
  optional:         { color: Colors.textMuted, fontWeight: '500', textTransform: 'none' },
  inputWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon:        { marginRight: 10 },
  input:            { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 14 },

  infoBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText:         { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },

  nextBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  nextBtnText:      { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
