import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryApi }    from '../../../api/category.api';
import { Category }       from '../../../types/api.types';
import { Colors }         from '../../../constants/colors';
import { OnboardingData } from './WorkerOnboardingScreen';

interface Props {
  data:     Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  'Electrician':   { icon: 'flash',         color: '#F59E0B', bg: '#FEF3C7' },
  'Plumber':       { icon: 'water',         color: '#3B82F6', bg: '#DBEAFE' },
  'Carpenter':     { icon: 'hammer',        color: '#92400E', bg: '#FDE68A' },
  'Painter':       { icon: 'color-palette', color: '#8B5CF6', bg: '#EDE9FE' },
  'Cleaner':       { icon: 'sparkles',      color: '#10B981', bg: '#D1FAE5' },
  'AC Technician': { icon: 'snow',          color: '#06B6D4', bg: '#CFFAFE' },
  'Mason':         { icon: 'construct',     color: '#EF4444', bg: '#FEE2E2' },
  'Welder':        { icon: 'flame',         color: '#F97316', bg: '#FFEDD5' },
};

export default function Step2CategorySkills({ data, onUpdate, onNext, onBack }: Props) {
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(
    data.categoryExperiences?.map(c => c.categoryId) || []
  );
  // expInputs: categoryId → years as string
  const [expInputs, setExpInputs] = useState<Record<string, string>>(
    Object.fromEntries(
      (data.categoryExperiences || []).map(c => [c.categoryId, String(c.yearsExperience)])
    )
  );
  const [bio, setBio] = useState(data.bio || '');

  useEffect(() => {
    categoryApi.getAll().then(res => setCategories(res.data.data));
  }, []);

  const toggleCategory = (catId: string) => {
    if (selectedCats.includes(catId)) {
      setSelectedCats(prev => prev.filter(id => id !== catId));
      setExpInputs(prev => { const next = { ...prev }; delete next[catId]; return next; });
    } else {
      setSelectedCats(prev => [...prev, catId]);
      setExpInputs(prev => ({ ...prev, [catId]: prev[catId] ?? '' }));
    }
  };

  const handleNext = () => {
    if (selectedCats.length === 0) {
      Alert.alert('Required', 'Please select at least one service category');
      return;
    }
    const hasBlankExp = selectedCats.some(id => expInputs[id] === '' || expInputs[id] === undefined);
    if (hasBlankExp) {
      Alert.alert('Required', 'Please enter years of experience for each selected skill');
      return;
    }

    const catObjects = categories.filter(c => selectedCats.includes(c.id));
    const experiences = selectedCats.map(catId => {
      const cat = catObjects.find(c => c.id === catId)!;
      return {
        categoryId:      catId,
        categoryName:    cat?.name || '',
        yearsExperience: parseInt(expInputs[catId] || '0') || 0,
      };
    });

    onUpdate({
      categoryExperiences: experiences,
      categoryId:          experiences[0]?.categoryId   || '',
      categoryName:        experiences[0]?.categoryName || '',
      bio:                 bio.trim(),
    });
    onNext();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      {/* ── Category selection ─────────────────────────────────── */}
      <Text style={styles.sectionLabel}>
        Service Categories <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.sectionHint}>Select all types of work you do — pick one or more</Text>

      {selectedCats.length > 0 && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
          <Text style={styles.selectedBadgeText}>{selectedCats.length} selected</Text>
        </View>
      )}

      <View style={styles.categoryGrid}>
        {categories.map(cat => {
          const meta   = CATEGORY_META[cat.name] || { icon: 'construct-outline', color: Colors.primary, bg: '#FFF3EE' };
          const active = selectedCats.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catCard, active && { borderColor: meta.color, backgroundColor: meta.bg }]}
              onPress={() => toggleCategory(cat.id)}>
              <View style={[styles.catIconWrap, { backgroundColor: active ? meta.color + '25' : Colors.background }]}>
                <Ionicons name={meta.icon} size={22} color={active ? meta.color : Colors.textMuted} />
              </View>
              <Text style={[styles.catName, active && { color: meta.color, fontWeight: '700' }]}>{cat.name}</Text>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: meta.color }]}>
                  <Ionicons name="checkmark" size={10} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Per-skill experience ───────────────────────────────── */}
      {selectedCats.length > 0 && (
        <View style={styles.expSection}>
          <Text style={styles.expSectionTitle}>
            Years of Experience <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.sectionHint}>Enter your experience for each selected skill</Text>

          {selectedCats.map(catId => {
            const cat  = categories.find(c => c.id === catId);
            if (!cat) return null;
            const meta = CATEGORY_META[cat.name] || { icon: 'construct-outline', color: Colors.primary, bg: '#FFF3EE' };
            return (
              <View key={catId} style={styles.expRow}>
                <View style={[styles.expCatIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <Text style={styles.expCatName}>{cat.name}</Text>
                <View style={styles.expInputWrap}>
                  <TextInput
                    style={styles.expInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    value={expInputs[catId] ?? ''}
                    onChangeText={v =>
                      setExpInputs(prev => ({ ...prev, [catId]: v.replace(/[^0-9]/g, '') }))
                    }
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <Text style={styles.expSuffix}>yrs</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Bio ────────────────────────────────────────────────── */}
      <View style={styles.field}>
        <Text style={styles.label}>About You <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.bioInput}
          placeholder="Describe your skills, certifications, specializations, work quality..."
          placeholderTextColor={Colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>
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
  sectionHint:        { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  required:           { color: Colors.danger },
  optional:           { color: Colors.textMuted, fontWeight: '500', fontSize: 12 },

  selectedBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12 },
  selectedBadgeText:  { fontSize: 12, fontWeight: '700', color: Colors.accent },

  categoryGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  catCard:            { width: '47%', backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, padding: 12, alignItems: 'center', gap: 8, position: 'relative' },
  catIconWrap:        { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catName:            { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  checkBadge:         { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  expSection:         { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: Colors.border },
  expSectionTitle:    { fontSize: 14, fontWeight: '700', color: Colors.secondary, marginBottom: 2 },
  expRow:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  expCatIcon:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expCatName:         { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  expInputWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 8 },
  expInput:           { width: 40, fontSize: 16, fontWeight: '700', color: Colors.primary, paddingVertical: 8 },
  expSuffix:          { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  field:              { marginBottom: 20 },
  label:              { fontSize: 13, fontWeight: '700', color: Colors.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  bioInput:           { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontSize: 15, color: Colors.textPrimary, minHeight: 110 },
  charCount:          { textAlign: 'right', fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  btnRow:             { flexDirection: 'row', gap: 12, marginTop: 4 },
  backBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary },
  backBtnText:        { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  nextBtn:            { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  nextBtnText:        { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
