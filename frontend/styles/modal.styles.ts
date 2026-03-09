import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sw(20),
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: ms(26),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(14),
  },
  linkButton: {
    paddingHorizontal: sw(14),
    paddingVertical: sh(10),
    borderRadius: sw(10),
    backgroundColor: Colors.surfaceAccent,
  },
  linkText: {
    fontSize: ms(16),
    color: Colors.primary,
    fontWeight: '600',
  },
});
