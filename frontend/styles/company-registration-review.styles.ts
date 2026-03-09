import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const companyRegistrationReviewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: sw(20),
    paddingBottom: sh(48),
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: sw(12),
    padding: sw(16),
    marginBottom: sh(16),
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: ms(17),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(10),
  },
  row: {
    marginBottom: sh(8),
  },
  label: {
    fontSize: ms(13),
    color: Colors.textMuted,
  },
  value: {
    fontSize: ms(14),
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: sh(10),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sw(10),
    marginBottom: sh(8),
  },
  bulletText: {
    flex: 1,
    fontSize: ms(14),
    color: Colors.textPrimary,
  },
  lockTitle: {
    fontSize: ms(15),
    color: '#b45309',
    fontWeight: '700',
    marginBottom: sh(8),
  },
  paymentMethodsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sw(8),
    marginBottom: sh(10),
  },
  paymentMethodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(6),
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: sw(999),
    paddingVertical: sh(8),
    paddingHorizontal: sw(12),
  },
  paymentMethodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentMethodTextActive: {
    color: Colors.textOnPrimary,
  },
  paymentHint: {
    fontSize: ms(13),
    color: Colors.textMuted,
  },
  qrCard: {
    marginTop: sh(8),
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: sw(12),
    padding: sw(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: sh(8),
    backgroundColor: Colors.surface,
  },
  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: sw(12),
    paddingVertical: sh(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sh(8),
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: ms(16),
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
});

