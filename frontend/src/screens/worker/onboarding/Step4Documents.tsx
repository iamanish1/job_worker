import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors }    from '../../../constants/colors';
import { workerApi } from '../../../api/worker.api';
import { OnboardingData } from './WorkerOnboardingScreen';

interface Props {
  data:     Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

type Substate = 'enterNumber' | 'enterOtp' | 'takeSelfie' | 'verifyingFace' | 'done';

export default function Step4Documents({ onUpdate, onNext, onBack }: Props) {
  const [substate,      setSubstate]      = useState<Substate>('enterNumber');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [clientId,      setClientId]      = useState('');
  const [otp,           setOtp]           = useState('');
  const [selfieUri,     setSelfieUri]     = useState('');
  const [loading,       setLoading]       = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState('');
  const [otpSentTo,     setOtpSentTo]     = useState(''); // last 4 digits for display

  const handleAadhaarChange = (val: string) => {
    setAadhaarNumber(val.replace(/[^0-9]/g, '').slice(0, 12));
  };

  const maskedAadhaar = aadhaarNumber.length >= 8
    ? `XXXX-XXXX-${aadhaarNumber.slice(8)}`
    : aadhaarNumber;

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (aadhaarNumber.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setLoading(true);
    setLoadingMsg('Sending OTP to your Aadhaar-linked mobile…');
    try {
      const res = await workerApi.sendAadhaarOtp(aadhaarNumber);
      setClientId(res.data.data.clientId);
      setOtpSentTo(aadhaarNumber.slice(-4));
      setSubstate('enterOtp');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      if (msg) {
        Alert.alert('OTP Failed', msg);
      } else {
        Alert.alert(
          'OTP Failed',
          'Could not send OTP. Please check your Aadhaar number and try again.',
        );
      }
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setLoadingMsg('Verifying OTP…');
    try {
      await workerApi.verifyAadhaarOtp(clientId, otp);
      setSubstate('takeSelfie');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      Alert.alert(
        'OTP Verification Failed',
        msg || 'Incorrect or expired OTP. Please try again.',
      );
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleResendOtp = () => {
    setOtp('');
    setSubstate('enterNumber');
  };

  // ── Step 3: Capture selfie & verify face ────────────────────────────────────
  const handleCaptureSelfieAndVerify = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access in Settings to complete face verification.',
      );
      return;
    }

    setLoading(true);
    setLoadingMsg('Opening camera…');

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.8,
        base64:        true,
        cameraType:    ImagePicker.CameraType.front,
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        setLoadingMsg('');
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not read image. Please try again.');
        setLoading(false);
        setLoadingMsg('');
        return;
      }

      setSelfieUri(asset.uri);
      setSubstate('verifyingFace');
      setLoadingMsg('Matching your face with Aadhaar…');

      // Strip any data-URL prefix if present (expo usually returns raw base64)
      const base64 = asset.base64.replace(/^data:image\/\w+;base64,/, '');

      await workerApi.matchFace(base64);

      onUpdate({ aadhaarVerified: true, faceVerified: true });
      setSubstate('done');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setSelfieUri('');
      setSubstate('takeSelfie');

      if (msg?.toLowerCase().includes('does not match') || msg?.toLowerCase().includes('face')) {
        Alert.alert(
          'Face Mismatch',
          'Your selfie did not match the Aadhaar photo.\n\nTips:\n• Use good lighting\n• Face the camera directly\n• Remove glasses or cap',
          [{ text: 'Try Again' }],
        );
      } else {
        Alert.alert(
          'Face Verification Failed',
          msg || 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.inner}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Enter Aadhaar number ─────────────────────────────────────────────── */}
      {substate === 'enterNumber' && (
        <>
          <View style={styles.iconHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="card-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Aadhaar Verification</Text>
            <Text style={styles.subtitle}>
              Enter your 12-digit Aadhaar number. A one-time password will be sent
              to the mobile number linked with your Aadhaar.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Aadhaar Number <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 12-digit number"
                placeholderTextColor={Colors.textMuted}
                value={aadhaarNumber}
                onChangeText={handleAadhaarChange}
                keyboardType="number-pad"
                maxLength={12}
              />
              {aadhaarNumber.length === 12 && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              )}
            </View>
            {aadhaarNumber.length >= 8 && (
              <Text style={styles.hint}>{maskedAadhaar}</Text>
            )}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#1D4ED8" />
            <Text style={styles.infoText}>
              Your Aadhaar data is used only for identity verification and is never stored on our servers.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (aadhaarNumber.length !== 12 || loading) && styles.btnDisabled]}
            disabled={aadhaarNumber.length !== 12 || loading}
            onPress={handleSendOtp}
          >
            {loading
              ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.primaryBtnText}>{loadingMsg || 'Sending…'}</Text>
                </View>
              )
              : (
                <>
                  <Ionicons name="send" size={18} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                </>
              )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={Colors.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Enter OTP ─────────────────────────────────────────────────────────── */}
      {substate === 'enterOtp' && (
        <>
          <View style={styles.iconHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="key-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              A 6-digit OTP has been sent to the mobile number linked with Aadhaar ending in{' '}
              <Text style={styles.highlighted}>XXXX-XXXX-{otpSentTo}</Text>
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>6-Digit OTP <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.otpInput}
              placeholder="• • • • • •"
              placeholderTextColor={Colors.border}
              value={otp}
              onChangeText={v => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (otp.length !== 6 || loading) && styles.btnDisabled]}
            disabled={otp.length !== 6 || loading}
            onPress={handleVerifyOtp}
          >
            {loading
              ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.primaryBtnText}>{loadingMsg || 'Verifying…'}</Text>
                </View>
              )
              : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Verify OTP</Text>
                </>
              )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.textBtn} onPress={handleResendOtp} disabled={loading}>
            <Text style={styles.textBtnText}>Didn't receive OTP? Go back and resend</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Face verification ─────────────────────────────────────────────────── */}
      {(substate === 'takeSelfie' || substate === 'verifyingFace') && (
        <>
          <View style={styles.iconHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.successLabel}>Aadhaar Verified!</Text>

            <View style={[styles.iconWrap, { marginTop: 20 }]}>
              <Ionicons name="camera-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Face Verification</Text>
            <Text style={styles.subtitle}>
              Take a clear front-facing selfie. Your face will be matched against
              your Aadhaar photograph.
            </Text>
          </View>

          <View style={styles.selfieGuideRow}>
            <SelfieGuideItem icon="sunny-outline"     text="Good lighting" />
            <SelfieGuideItem icon="glasses-outline"   text="No glasses" />
            <SelfieGuideItem icon="eye-outline"       text="Look straight" />
          </View>

          {selfieUri ? (
            <View style={styles.selfiePreview}>
              <Image source={{ uri: selfieUri }} style={styles.selfieImg} />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (loading || substate === 'verifyingFace') && styles.btnDisabled]}
            disabled={loading || substate === 'verifyingFace'}
            onPress={handleCaptureSelfieAndVerify}
          >
            {loading
              ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.primaryBtnText}>{loadingMsg || 'Processing…'}</Text>
                </View>
              )
              : (
                <>
                  <Ionicons name="camera" size={18} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Take Selfie & Verify</Text>
                </>
              )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────────── */}
      {substate === 'done' && (
        <>
          <View style={styles.doneContainer}>
            <View style={styles.doneIconWrap}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.accent} />
            </View>
            <Text style={styles.doneTitle}>Identity Verified!</Text>
            <Text style={styles.doneSub}>
              Both Aadhaar and face verification passed successfully.
              Your profile will be reviewed shortly.
            </Text>

            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.doneSelfie} />
            ) : null}

            <View style={styles.doneCheckRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              <Text style={styles.doneCheckText}>Aadhaar verified</Text>
            </View>
            <View style={styles.doneCheckRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              <Text style={styles.doneCheckText}>Face matched</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
            <Text style={styles.primaryBtnText}>Continue to Review</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function SelfieGuideItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.guideItem}>
      <View style={styles.guideIconWrap}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.guideText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  inner:           { padding: 20, paddingBottom: 40 },

  iconHeader:      { alignItems: 'center', marginBottom: 28 },
  iconWrap:        { width: 72, height: 72, borderRadius: 22, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:           { fontSize: 20, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  subtitle:        { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  highlighted:     { fontWeight: '700', color: Colors.textPrimary },
  successLabel:    { fontSize: 14, fontWeight: '700', color: Colors.accent },

  field:           { marginBottom: 20 },
  label:           { fontSize: 13, fontWeight: '700', color: Colors.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  required:        { color: Colors.danger },
  inputWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14 },
  inputIcon:       { marginRight: 10 },
  input:           { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 14 },
  hint:            { fontSize: 12, color: Colors.textMuted, marginTop: 6, marginLeft: 4 },

  otpInput:        {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 2, borderColor: Colors.primary,
    fontSize: 30, fontWeight: '800', color: Colors.primary, paddingVertical: 18, letterSpacing: 14,
  },

  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText:        { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  loadingRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },

  selfieGuideRow:  { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  guideItem:       { alignItems: 'center', gap: 6 },
  guideIconWrap:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },
  guideText:       { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },

  primaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.primary, marginBottom: 12, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled:     { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  primaryBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 16 },

  backBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary },
  backBtnText:     { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  textBtn:         { alignItems: 'center', paddingVertical: 12 },
  textBtnText:     { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  selfiePreview:   { alignItems: 'center', marginBottom: 20 },
  selfieImg:       { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.accent },

  doneContainer:   { alignItems: 'center', paddingVertical: 24 },
  doneIconWrap:    { width: 96, height: 96, borderRadius: 28, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle:       { fontSize: 22, fontWeight: '800', color: Colors.secondary },
  doneSub:         { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  doneSelfie:      { width: 80, height: 80, borderRadius: 40, marginBottom: 16, borderWidth: 2, borderColor: Colors.accent },
  doneCheckRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  doneCheckText:   { fontSize: 15, fontWeight: '600', color: Colors.secondary },
});
