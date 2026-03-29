import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkerStackParams } from '../../../navigation/WorkerNavigator';
import { Colors } from '../../../constants/colors';
import Step1PersonalInfo   from './Step1PersonalInfo';
import Step2CategorySkills from './Step2CategorySkills';
import Step3LocationRates  from './Step3LocationRates';
import Step4Documents      from './Step4Documents';
import Step5Review         from './Step5Review';

type Props = NativeStackScreenProps<WorkerStackParams, 'WorkerOnboarding'>;

export interface CategoryExperience {
  categoryId:      string;
  categoryName:    string;
  yearsExperience: number;
}

export interface OnboardingData {
  name:                string;
  email:               string;
  profilePhotoKey:     string;
  /** All selected categories with per-skill experience */
  categoryExperiences: CategoryExperience[];
  /** First selected category — for display in review header */
  categoryId:          string;
  categoryName:        string;
  bio:                 string;
  dailyRate:           string;
  hourlyRate:          string;
  city:                string;
  locality:            string;
  latitude:            number;
  longitude:           number;
  aadhaarVerified:     boolean;
  faceVerified:        boolean;
}

const STEPS: Array<{ label: string; icon: any }> = [
  { label: 'Personal', icon: 'person-outline' },
  { label: 'Skills',   icon: 'briefcase-outline' },
  { label: 'Location', icon: 'location-outline' },
  { label: 'Verify',   icon: 'shield-checkmark-outline' },
  { label: 'Review',   icon: 'checkmark-circle-outline' },
];

export default function WorkerOnboardingScreen({ navigation }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({});

  const update = (partial: Partial<OnboardingData>) =>
    setData(d => ({ ...d, ...partial }));

  const next = () => { if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1); };
  const back = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };
  const onComplete = () => navigation.replace('WorkerTabs');

  const stepComponents = [
    <Step1PersonalInfo   data={data} onUpdate={update} onNext={next} />,
    <Step2CategorySkills data={data} onUpdate={update} onNext={next} onBack={back} />,
    <Step3LocationRates  data={data} onUpdate={update} onNext={next} onBack={back} />,
    <Step4Documents      data={data} onUpdate={update} onNext={next} onBack={back} />,
    <Step5Review         data={data} onBack={back} onComplete={onComplete} />,
  ];

  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.headerSub}>Step {currentStep + 1} of {STEPS.length}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Step icons */}
        <View style={styles.stepRow}>
          {STEPS.map((s, i) => {
            const done   = i < currentStep;
            const active = i === currentStep;
            return (
              <View key={i} style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  done   && styles.stepCircleDone,
                  active && styles.stepCircleActive,
                ]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color={Colors.white} />
                    : <Ionicons name={s.icon} size={14} color={active ? Colors.white : Colors.textMuted} />}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Step content */}
      <View style={styles.content}>
        {stepComponents[currentStep]}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: Colors.background },
  header:            { backgroundColor: Colors.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  headerTitle:       { fontSize: 18, fontWeight: '800', color: Colors.secondary, textAlign: 'center' },
  headerSub:         { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 12 },
  progressTrack:     { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 16 },
  progressFill:      { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  stepRow:           { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem:          { alignItems: 'center', gap: 4, flex: 1 },
  stepCircle:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive:  { backgroundColor: Colors.primary },
  stepCircleDone:    { backgroundColor: Colors.accent },
  stepLabel:         { fontSize: 9, color: Colors.textMuted, fontWeight: '500' },
  stepLabelActive:   { color: Colors.primary, fontWeight: '700' },
  content:           { flex: 1 },
});
