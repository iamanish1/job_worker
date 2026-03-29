import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import { Colors }  from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';

interface EarningSummary {
  total: number; today: number; week: number; month: number;
}
interface EarningItem {
  id: string; bookingId: string; grossAmount: number;
  netAmount: number; status: string; createdAt: string;
}

export default function EarningsScreen() {
  const [summary,    setSummary]    = useState<EarningSummary | null>(null);
  const [history,    setHistory]    = useState<EarningItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [sumRes, histRes] = await Promise.all([
        apiClient.get<{ data: EarningSummary }>('/earnings/summary'),
        apiClient.get<{ data: { content: EarningItem[] } }>('/earnings/history?page=0&size=20'),
      ]);
      setSummary(sumRes.data.data);
      setHistory(histRes.data.data.content);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );

  const SETTLED_COLOR   = { color: Colors.accent,   bg: '#D1FAE5' };
  const PENDING_COLOR   = { color: '#D97706',        bg: '#FEF3C7' };
  const completedJobs   = history.length;
  const averagePerJob   = completedJobs > 0
    ? history.reduce((sum, item) => sum + item.netAmount, 0) / completedJobs
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="wallet" size={28} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerLabel}>Tracked Job Earnings</Text>
            <Text style={styles.headerAmount}>{formatCurrency(summary?.total || 0)}</Text>
            <Text style={styles.headerSub}>Based on jobs you have completed</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="today-outline"     iconColor="#3B82F6" label="Today"      value={formatCurrency(summary?.today  || 0)} />
          <StatCard icon="calendar-outline"  iconColor="#8B5CF6" label="This Week"  value={formatCurrency(summary?.week   || 0)} />
          <StatCard icon="stats-chart"       iconColor={Colors.primary} label="This Month" value={formatCurrency(summary?.month  || 0)} />
        </View>

        <View style={styles.performanceCard}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{completedJobs}</Text>
            <Text style={styles.performanceLabel}>Completed Jobs</Text>
          </View>
          <View style={styles.performanceDivider} />
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>{formatCurrency(averagePerJob)}</Text>
            <Text style={styles.performanceLabel}>Average per Job</Text>
          </View>
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <Ionicons name="information-circle-outline" size={15} color="#1D4ED8" />
          <Text style={styles.infoText}>This screen is only for tracking earnings stats in the app. Payouts are not handled here.</Text>
        </View>

        {/* Job earnings history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Job History</Text>

          {history.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No completed jobs yet</Text>
              <Text style={styles.emptySub}>Finish jobs to start building your earnings history</Text>
            </View>
          ) : (
            history.map(item => {
              const sc = item.status === 'SETTLED' ? SETTLED_COLOR : PENDING_COLOR;
              return (
                <View key={item.id} style={styles.txCard}>
                  <View style={[styles.txIconWrap, { backgroundColor: sc.color + '15' }]}>
                    <Ionicons
                      name={item.status === 'SETTLED' ? 'checkmark-circle' : 'time-outline'}
                      size={20} color={sc.color}
                    />
                  </View>
                  <View style={styles.txMid}>
                    <Text style={styles.txBookingId}>Job #{item.bookingId.slice(0, 8)}</Text>
                    <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
                    {item.grossAmount !== item.netAmount && (
                      <Text style={styles.txGross}>Gross amount: {formatCurrency(item.grossAmount)}</Text>
                    )}
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>{formatCurrency(item.netAmount)}</Text>
                    <View style={[styles.txStatusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.txStatusText, { color: sc.color }]}>{item.status === 'SETTLED' ? 'Tracked' : 'Pending'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value: string }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header:         {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  headerIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerLabel:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  headerAmount:   { color: Colors.white, fontSize: 30, fontWeight: '800', marginTop: 2 },
  headerSub:      { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },

  statsRow:       { flexDirection: 'row', marginHorizontal: 16, marginTop: -16, gap: 10, marginBottom: 16 },
  statCard:       {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 12, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  statIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue:      { fontSize: 14, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  statLabel:      { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },

  performanceCard:{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  performanceItem: { flex: 1, alignItems: 'center' },
  performanceValue:{ fontSize: 20, fontWeight: '800', color: Colors.secondary },
  performanceLabel:{ fontSize: 11, color: Colors.textSecondary, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  performanceDivider:{ width: 1, alignSelf: 'stretch', backgroundColor: Colors.border, marginHorizontal: 12 },

  infoStrip:      {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoText:       { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  section:        { paddingHorizontal: 16 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: Colors.secondary, marginBottom: 12 },

  txCard:         {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  txIconWrap:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txMid:          { flex: 1 },
  txBookingId:    { fontSize: 14, fontWeight: '700', color: Colors.secondary },
  txDate:         { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  txGross:        { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txRight:        { alignItems: 'flex-end', gap: 6 },
  txAmount:       { fontSize: 17, fontWeight: '800', color: Colors.primary },
  txStatusPill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  txStatusText:   { fontSize: 10, fontWeight: '700' },

  empty:          { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap:  { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub:       { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
});
