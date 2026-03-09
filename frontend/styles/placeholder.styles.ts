/**
 * Shared styles for placeholder screens (Cabinet, CFO, Profile).
 * Replace with screen-specific styles as each feature is built out.
 */
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sw(24),
  },
  title: {
    fontSize: ms(28),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(8),
  },
  subtitle: {
    fontSize: ms(16),
    lineHeight: ms(24),
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
