import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function SplashScreen() {
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.7)).current;
  const slideUp  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale,    { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(slideUp,  { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }, { translateY: slideUp }] }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct" size={52} color={Colors.primary} />
        </View>
        <Text style={styles.title}>KaamWala</Text>
        <Text style={styles.subtitle}>Trusted workers at your doorstep</Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FFF8F5', alignItems: 'center', justifyContent: 'center' },
  bgCircle1:   {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary + '12', top: -60, right: -60,
  },
  bgCircle2:   {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primary + '08', bottom: 40, left: -40,
  },
  content:     { alignItems: 'center' },
  iconWrap:    {
    width: 100, height: 100, borderRadius: 28, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  title:       { fontSize: 36, fontWeight: '800', color: Colors.secondary, letterSpacing: 0.5 },
  subtitle:    { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  dotsRow:     { flexDirection: 'row', gap: 6, marginTop: 40 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive:   { backgroundColor: Colors.primary, width: 24 },
});
