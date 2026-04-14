import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS: { title: string; icon: any; iconColor: string; iconBg: string; items: FaqItem[] }[] = [
  {
    title: 'Booking',
    icon: 'calendar-outline',
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    items: [
      {
        q: 'How do I book a worker?',
        a: 'Go to Home, select a service category, browse available workers, tap on a worker to view their profile, then tap "Book Now". Fill in your address, date/time, and confirm the booking.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes. You can cancel a booking as long as it is in Pending or Confirmed status. Once the worker has started the job (In Progress), cancellation is not possible. Go to your booking and tap "Cancel Booking".',
      },
      {
        q: 'What is the Job Start OTP?',
        a: 'When you book a worker, a 6-digit OTP is shown on your Track Booking screen. Share this code with the worker when they arrive at your location. The worker enters this OTP to officially start the job — it confirms the right person has arrived.',
      },
      {
        q: 'How long is my booking valid?',
        a: 'A booking in Pending status expires automatically after 30 minutes if the worker does not accept it. You will be notified and can re-book with another worker.',
      },
      {
        q: 'Can I book the same worker again?',
        a: 'Yes. Visit the worker\'s profile from the Workers listing and tap "Book Now" to schedule another booking.',
      },
    ],
  },
  {
    title: 'Workers',
    icon: 'construct-outline',
    iconColor: Colors.primary,
    iconBg: '#FFF3EE',
    items: [
      {
        q: 'Are the workers verified?',
        a: 'Yes. Every worker on KaamWala goes through identity verification including Aadhaar and face matching before they can accept bookings. Look for the "Verified" badge on their profile.',
      },
      {
        q: 'How are workers rated?',
        a: 'Workers are rated by customers after a job is completed. The average rating (out of 5 stars) and total number of jobs completed are shown on their profile.',
      },
      {
        q: 'What if a worker does not show up?',
        a: 'If a confirmed worker does not arrive, cancel the booking and re-book with another worker. Contact our support team if you face repeated issues.',
      },
    ],
  },
  {
    title: 'Payments',
    icon: 'cash-outline',
    iconColor: '#16A34A',
    iconBg: '#F0FDF4',
    items: [
      {
        q: 'How do I pay for the service?',
        a: 'Payment is made directly to the worker after the job is completed. KaamWala currently supports cash payments. Digital payment options will be added soon.',
      },
      {
        q: 'How is the service price decided?',
        a: 'Each worker sets their own hourly or daily rate, visible on their profile. You can also enter a quoted amount when booking. The final amount is agreed upon between you and the worker.',
      },
    ],
  },
  {
    title: 'Account',
    icon: 'person-outline',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    items: [
      {
        q: 'How do I update my name?',
        a: 'Go to My Profile and tap the pencil icon next to your name. Type the new name and tap the checkmark to save.',
      },
      {
        q: 'How do I logout?',
        a: 'Go to My Profile and scroll to the bottom. Tap "Logout" and confirm.',
      },
      {
        q: 'Is my phone number secure?',
        a: 'Yes. Your phone number is verified via Firebase OTP and is never shared publicly. Only the worker assigned to your booking can see your contact details.',
      },
    ],
  },
];

const FaqCard = ({ item }: { item: FaqItem }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.faqItem, open && styles.faqItemOpen]}
      onPress={() => setOpen(o => !o)}
      activeOpacity={0.8}>
      <View style={styles.faqRow}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? Colors.primary : Colors.textMuted}
        />
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

export default function HelpFaqScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="help-buoy" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.bannerTitle}>How can we help?</Text>
          <Text style={styles.bannerSub}>Find answers to the most common questions below.</Text>
        </View>

        {/* FAQ sections */}
        {FAQ_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.iconBg }]}>
                <Ionicons name={section.icon} size={18} color={section.iconColor} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <View key={i}>
                  <FaqCard item={item} />
                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Contact support */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSub}>Our support team is available Mon–Sat, 9 AM – 6 PM</Text>

          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:support@kaamwala.in')}>
            <View style={[styles.contactBtnIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="mail-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.contactBtnText}>
              <Text style={styles.contactBtnLabel}>Email Support</Text>
              <Text style={styles.contactBtnValue}>support@kaamwala.in</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('tel:+911800123456')}>
            <View style={[styles.contactBtnIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="call-outline" size={20} color="#16A34A" />
            </View>
            <View style={styles.contactBtnText}>
              <Text style={styles.contactBtnLabel}>Call Us (Toll Free)</Text>
              <Text style={styles.contactBtnValue}>1800-123-456</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  content:          { padding: 16, gap: 16 },

  banner:           {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  bannerIcon:       {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  bannerTitle:      { fontSize: 22, fontWeight: '800', color: Colors.secondary },
  bannerSub:        { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  section:          { gap: 10 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: Colors.secondary },
  sectionCard:      {
    backgroundColor: Colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },

  faqItem:          { padding: 16 },
  faqItemOpen:      { backgroundColor: '#FFFBF5' },
  faqRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQ:             { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  faqA:             { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginTop: 10 },
  divider:          { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  contactCard:      {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  contactTitle:     { fontSize: 16, fontWeight: '800', color: Colors.secondary, marginBottom: 4 },
  contactSub:       { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  contactBtn:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  contactBtnIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactBtnText:   { flex: 1 },
  contactBtnLabel:  { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  contactBtnValue:  { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
