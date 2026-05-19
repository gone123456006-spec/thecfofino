import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

/** Shared Google Material outlined field tokens (sign-in + company form). */
export const googleFormFieldStyles = StyleSheet.create({
  wrap: {
    marginBottom: sh(16),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sh(8),
  },
  label: {
    fontSize: ms(14),
    fontWeight: '700',
    color: '#202124',
  },
  labelError: {
    color: '#d93025',
  },
  optionalTag: {
    fontSize: ms(12),
    fontWeight: '500',
    color: Colors.textMuted,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#B8D4E8',
    borderRadius: sw(8),
    backgroundColor: '#F5F7FA',
    paddingHorizontal: sw(14),
    minHeight: sh(52),
    justifyContent: 'center',
  },
  outlinedMultiline: {
    minHeight: sh(96),
    paddingVertical: sh(12),
    justifyContent: 'flex-start',
  },
  outlinedFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.background,
  },
  outlinedError: {
    borderColor: '#d93025',
    borderWidth: 1.5,
    backgroundColor: '#FEF7F7',
  },
  outlinedLocked: {
    borderColor: '#e8eaed',
    backgroundColor: '#f1f3f4',
  },
  lockedTag: {
    fontSize: ms(11),
    fontWeight: '600',
    color: '#5f6368',
    backgroundColor: '#e8eaed',
    paddingHorizontal: sw(8),
    paddingVertical: sh(2),
    borderRadius: sw(4),
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '400',
    color: Colors.textPrimary,
    paddingVertical: sh(12),
  },
  inputMultiline: {
    minHeight: sh(72),
    paddingVertical: 0,
  },
  inputLocked: {
    color: '#5f6368',
  },
  helperError: {
    fontSize: ms(12),
    color: '#d93025',
    marginTop: sh(6),
    lineHeight: ms(16),
  },
});
