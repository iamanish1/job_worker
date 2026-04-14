import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  length:   number;
  value:    string;
  onChange: (value: string) => void;
}

export default function OtpInput({ length, value, onChange }: Props) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit   = text.replace(/\D/g, '').slice(-1);
    const arr     = value.split('');
    arr[index]    = digit;
    const newVal  = arr.join('').slice(0, length);
    onChange(newVal);
    if (digit && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={r => { inputs.current[i] = r; }}
          style={[styles.box, value[i] && styles.boxFilled]}
          value={value[i] || ''}
          onChangeText={t => handleChange(t, i)}
          onKeyPress={e => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  box:       {
    flex: 1, height: 52, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: '700',
    color: Colors.textPrimary,
  },
  boxFilled: { borderColor: Colors.primary, backgroundColor: '#FFF3EE' },
});
