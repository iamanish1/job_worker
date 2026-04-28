import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useDispatch } from 'react-redux';
import { setAuth } from '../../store/auth.slice';
import { authApi } from '../../api/auth.api';
import { SecureStorage } from '../../utils/storage';
import { Colors } from '../../constants/colors';
import { Config } from '../../constants/config';
import OtpInput from '../../components/ui/OtpInput';
import app, { firebaseAuth } from '../../config/firebase';

type Step = 'phone' | 'otp';
type Role = 'CUSTOMER' | 'WORKER';

export default function AuthScreen() {
  const dispatch = useDispatch();
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const verificationIdRef = useRef<string>('');

  const [step,    setStep]    = useState<Step>('phone');
  const [phone,   setPhone]   = useState('');
  const [role,    setRole]    = useState<Role>('CUSTOMER');
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [firebaseOtpReady, setFirebaseOtpReady] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = () => {
    setResendCountdown(Config.OTP_RESEND_COOLDOWN_S);
    timerRef.current = setInterval(() => {
      setResendCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
    if (!recaptchaVerifier.current) { setError('reCAPTCHA not ready. Try again.'); return; }
    setError(''); setLoading(true);
    try {
      const provider = new PhoneAuthProvider(firebaseAuth);
      const verificationId = await provider.verifyPhoneNumber('+91' + digits, recaptchaVerifier.current);
      verificationIdRef.current = verificationId;
      setFirebaseOtpReady(true);
      setStep('otp'); startResendTimer();
    } catch (e: any) {
      verificationIdRef.current = '';
      setFirebaseOtpReady(false);
      setStep('otp');
      setError(e.message || 'Failed to send OTP. Enter fallback OTP if enabled.');
    }
    finally { setLoading(false); }
  };

  const verifyOtp = async (code: string) => {
    const isFallbackOtp = code === Config.AUTH_FALLBACK_OTP_CODE;
    if (!isFallbackOtp && code.length !== 6) return;
    setLoading(true); setError('');
    try {
      let idToken = '';
      if (!isFallbackOtp) {
        if (!verificationIdRef.current) {
          setError('Firebase OTP was not sent. Enter fallback OTP if enabled.');
          return;
        }
        const credential = PhoneAuthProvider.credential(verificationIdRef.current, code);
        const userCredential = await signInWithCredential(firebaseAuth, credential);
        idToken = await userCredential.user.getIdToken();
      }
      const res = await authApi.verifyOtp('+91' + phone.replace(/\D/g, ''), idToken, role, isFallbackOtp ? code : undefined);
      const { accessToken, refreshToken, user } = res.data.data;
      await SecureStorage.saveTokens(accessToken, refreshToken);
      dispatch(setAuth({ userId: user.id, phone: user.phone, name: user.name, role: user.role as Role }));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={app.options} attemptInvisibleVerification />

      {/* Top orange hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Ionicons name="construct" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>KaamWala</Text>
        <Text style={styles.tagline}>Trusted workers at your doorstep</Text>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetInner} keyboardShouldPersistTaps="handled">
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>Sign in or create an account</Text>

            {/* Role selector */}
            <Text style={styles.fieldLabel}>I want to</Text>
            <View style={styles.roleRow}>
              {([
                { key: 'CUSTOMER', label: 'Hire a Worker', icon: 'home-outline' },
                { key: 'WORKER',   label: 'Find Work',    icon: 'briefcase-outline' },
              ] as { key: Role; label: string; icon: any }[]).map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleBtn, role === r.key && styles.roleBtnActive]}
                  onPress={() => setRole(r.key)}>
                  <Ionicons name={r.icon} size={22} color={role === r.key ? Colors.primary : Colors.textMuted} />
                  <Text style={[styles.roleBtnText, role === r.key && styles.roleBtnTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Phone input */}
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={[styles.phoneRow, error ? styles.inputError : null]}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit number"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={t => { setPhone(t); setError(''); }}
                returnKeyType="done"
                onSubmitEditing={sendOtp}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {error ? <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, (loading || phone.length !== 10) && styles.btnDisabled]}
              onPress={sendOtp} disabled={loading || phone.length !== 10}>
              {loading ? <ActivityIndicator color={Colors.white} /> : (
                <View style={styles.btnInner}>
                  <Text style={styles.btnText}>Send OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <FirebaseRecaptchaBanner style={styles.recaptcha} />
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backRow} onPress={() => { setStep('phone'); setError(''); setOtp(''); }}>
              <Ionicons name="arrow-back" size={18} color={Colors.primary} />
              <Text style={styles.backText}>Change number</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              {firebaseOtpReady ? '6-digit code sent to ' : 'Enter fallback code for '}
              <Text style={styles.phoneHighlight}>+91 {phone}</Text>
            </Text>

            <View style={styles.otpWrap}>
              <OtpInput length={6} value={otp} onChange={code => {
                setOtp(code);
                if (code.length === 6 || code === Config.AUTH_FALLBACK_OTP_CODE) verifyOtp(code);
              }} />
            </View>

            {loading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 8 }} />}
            {error ? <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {error}</Text> : null}

            <TouchableOpacity
              style={styles.resendBtn} onPress={sendOtp}
              disabled={resendCountdown > 0 || loading}>
              {resendCountdown > 0
                ? <Text style={styles.resendWait}>Resend OTP in {resendCountdown}s</Text>
                : <Text style={styles.resendActive}>Resend OTP</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: Colors.primary },
  hero:             { alignItems: 'center', paddingTop: 56, paddingBottom: 32 },
  logoWrap:         {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  appName:          { fontSize: 32, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  tagline:          { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6 },
  sheet:            { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetInner:       { padding: 24, paddingBottom: 40 },
  title:            { fontSize: 24, fontWeight: '800', color: Colors.secondary, marginTop: 4 },
  subtitle:         { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 24 },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow:          { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleBtn:          {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', gap: 6, backgroundColor: Colors.background,
  },
  roleBtnActive:    { borderColor: Colors.primary, backgroundColor: '#FFF3EE' },
  roleBtnText:      { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  roleBtnTextActive:{ color: Colors.primary, fontWeight: '700' },
  phoneRow:         {
    flexDirection: 'row', marginBottom: 8, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.background,
  },
  inputError:       { borderColor: Colors.danger },
  countryCode:      { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: Colors.background, borderRightWidth: 1, borderRightColor: Colors.border },
  countryCodeText:  { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  phoneInput:       { flex: 1, paddingHorizontal: 14, fontSize: 17, letterSpacing: 1, paddingVertical: 14, color: Colors.textPrimary },
  errorText:        { color: Colors.danger, fontSize: 13, marginBottom: 12 },
  btn:              {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled:      { opacity: 0.5, shadowOpacity: 0 },
  btnInner:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:          { color: Colors.white, fontSize: 17, fontWeight: '700' },
  recaptcha:        { marginTop: 16 },
  backRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:         { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  phoneHighlight:   { fontWeight: '700', color: Colors.secondary },
  otpWrap:          { marginVertical: 20 },
  resendBtn:        { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  resendWait:       { color: Colors.textMuted, fontSize: 14 },
  resendActive:     { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
