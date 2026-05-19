import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { googleFormFieldStyles as s } from '@/styles/google-form-field.styles';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
  editable?: boolean;
  /** Shown when field is read-only (e.g. after Case ID is generated). */
  locked?: boolean;
  onFocus?: () => void;
} & Pick<
  TextInputProps,
  'keyboardType' | 'autoCapitalize' | 'maxLength' | 'multiline' | 'numberOfLines' | 'autoCorrect'
>;

/** Google Material–style outlined text field (matches sign-in UI). */
export function GoogleOutlinedField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  optional,
  editable = true,
  locked = false,
  onFocus,
  keyboardType,
  autoCapitalize,
  maxLength,
  multiline,
  numberOfLines,
  autoCorrect,
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const isReadOnly = locked || !editable;

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={[s.label, hasError && s.labelError]}>{label}</Text>
        {locked ? <Text style={s.lockedTag}>Locked</Text> : null}
        {!locked && optional ? <Text style={s.optionalTag}>Optional</Text> : null}
      </View>
      <View
        style={[
          s.outlined,
          multiline && s.outlinedMultiline,
          focused && !isReadOnly && !hasError && s.outlinedFocused,
          hasError && s.outlinedError,
          isReadOnly && s.outlinedLocked,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={[s.input, multiline && s.inputMultiline, isReadOnly && s.inputLocked]}
          editable={!isReadOnly}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hasError ? <Text style={s.helperError}>{error}</Text> : null}
    </View>
  );
}
