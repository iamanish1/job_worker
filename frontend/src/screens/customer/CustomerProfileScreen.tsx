import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { userApi } from '../../api/user.api';
import { SecureStorage } from '../../utils/storage';
import { clearAuth, updateName } from '../../store/auth.slice';
import { RootState } from '../../store';
import { Colors } from '../../constants/colors';
import { CustomerStackParams } from '../../navigation/CustomerNavigator';

type Nav = NativeStackNavigationProp<CustomerStackParams>;

export default function CustomerProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<Nav>();
  const { name, phone } = useSelector((s: RootState) => s.auth);

  const [editing,  setEditing]  = useState(false);
  const [newName,  setNewName]  = useState(name || '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await userApi.updateProfile({ name: newName.trim() });
      dispatch(updateName(newName.trim()));
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update name');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await SecureStorage.clearTokens();
          dispatch(clearAuth());
        },
      },
    ]);
  };

  const initials = (name || phone || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255,255,255,0.6)"
                autoFocus
              />
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveIconBtn}>
                {saving
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Ionicons name="checkmark" size={22} color={Colors.white} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditing(false); setNewName(name || ''); }} style={styles.cancelIconBtn}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{name || 'Set your name'}</Text>
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.heroPhone}>{phone}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="person-circle-outline" size={13} color={Colors.primary} />
            <Text style={styles.roleBadgeText}>Customer</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Info</Text>
          <InfoRow icon="call-outline"       label="Phone"  value={phone || '—'} />
          <InfoRow icon="person-outline"     label="Name"   value={name  || 'Not set'} last />
        </View>

        {/* Quick actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Activity</Text>
          <ActionRow icon="calendar-outline" iconBg="#EFF6FF" iconColor="#3B82F6" label="My Bookings"
            hint="View all your bookings" onPress={() => navigation.navigate('MyBookings')} />
          <ActionRow icon="star-outline" iconBg="#FEF9C3" iconColor="#CA8A04" label="My Reviews"
            hint="Reviews you've given"
            onPress={() => navigation.navigate('MyReviews')} last />
        </View>

        {/* Help & Support */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support</Text>
          <ActionRow icon="help-circle-outline" iconBg="#F0FDF4" iconColor="#16A34A" label="Help & FAQ"
            hint="Get help with the app"
            onPress={() => navigation.navigate('HelpFaq')} />
          <ActionRow icon="shield-outline" iconBg="#FFF7ED" iconColor="#EA580C" label="Privacy Policy"
            hint="How we protect your data"
            onPress={() => Alert.alert('Privacy Policy', 'Your data is encrypted and never shared with third parties. KYC documents are only used for worker verification.')} last />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
        </TouchableOpacity>

        <Text style={styles.version}>KaamWala v1.0.0</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last && styles.rowBorder]}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const ActionRow = ({ icon, iconBg, iconColor, label, hint, last, onPress }: {
  icon: any; iconBg: string; iconColor: string; label: string; hint: string; last?: boolean; onPress?: () => void;
}) => (
  <TouchableOpacity style={[styles.actionRow, !last && styles.rowBorder]} onPress={onPress}>
    <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionHint}>{hint}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.background },

  hero:           { backgroundColor: Colors.primary, alignItems: 'center', paddingTop: 24, paddingBottom: 32, paddingHorizontal: 24 },
  avatarWrap:     {
    width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText:     { fontSize: 34, fontWeight: '800', color: Colors.white },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroName:       { fontSize: 22, fontWeight: '800', color: Colors.white },
  editIconBtn:    { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  editRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' },
  nameInput:      { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.white, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.6)', paddingVertical: 4, textAlign: 'center' },
  saveIconBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  cancelIconBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroPhone:      { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  roleBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  roleBadgeText:  { fontSize: 12, fontWeight: '700', color: Colors.primary },

  card:           {
    backgroundColor: Colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  rowBorder:      { borderBottomWidth: 1, borderBottomColor: Colors.border },

  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  infoIconWrap:   { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  infoContent:    { flex: 1 },
  infoLabel:      { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:      { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },

  actionRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionContent:  { flex: 1 },
  actionLabel:    { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  actionHint:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  logoutBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 16,
    marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  logoutIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  logoutText:     { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.danger },

  version:        { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginTop: 20 },
});
