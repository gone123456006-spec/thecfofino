import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const bookingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: sw(20),
    paddingBottom: sh(40),
  },
  title: {
    fontSize: ms(22),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(8),
  },
  subtitle: {
    fontSize: ms(14),
    color: Colors.textSecondary,
    marginBottom: sh(24),
  },
  label: {
    fontSize: ms(14),
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: sh(6),
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: sw(12),
    paddingHorizontal: sw(14),
    paddingVertical: sh(12),
    fontSize: ms(16),
    color: Colors.textPrimary,
    marginBottom: sh(16),
  },
  inputMultiline: {
    minHeight: sh(88),
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: sh(16),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sh(8),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: ms(16),
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  error: {
    fontSize: ms(13),
    color: '#c53030',
    marginBottom: sh(12),
  },
  successWrap: {
    alignItems: 'center',
    marginTop: sh(20),
    marginBottom: sh(8),
  },
  tickRing: {
    position: 'absolute',
    width: sw(88),
    height: sw(88),
    borderRadius: sw(44),
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  tickIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  success: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: sh(16),
    textAlign: 'center',
    paddingHorizontal: sw(8),
  },
  successSub: {
    fontSize: ms(13),
    color: Colors.textSecondary,
    marginTop: sh(4),
    textAlign: 'center',
  },
});
