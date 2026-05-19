import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

/** Google Material — My filings list */
export const companyRegistrationUploadTrackingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingHorizontal: sw(16),
    paddingTop: sh(8),
    paddingBottom: sh(40),
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sh(10),
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: ms(14),
    color: '#5f6368',
  },
  pageSub: {
    fontSize: ms(14),
    fontWeight: '400',
    color: '#5f6368',
    lineHeight: ms(20),
    marginBottom: sh(14),
  },
  liveChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(6),
    backgroundColor: '#e8f0fe',
    paddingHorizontal: sw(10),
    paddingVertical: sh(5),
    borderRadius: sw(16),
    marginBottom: sh(14),
  },
  liveChipOff: {
    backgroundColor: '#f1f3f4',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a73e8',
  },
  liveDotOff: {
    backgroundColor: '#80868b',
  },
  liveChipText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#1967d2',
  },
  liveChipTextOff: {
    color: '#5f6368',
  },
  googleCard: {
    backgroundColor: Colors.white,
    borderRadius: sw(8),
    borderWidth: 1,
    borderColor: '#e8eaed',
    overflow: 'hidden',
    marginBottom: sh(12),
  },
  googleListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(12),
    paddingHorizontal: sw(16),
    gap: sw(14),
    minHeight: sh(56),
  },
  googleListBody: {
    flex: 1,
    minWidth: 0,
  },
  googleListTitle: {
    fontSize: ms(14),
    fontWeight: '500',
    color: '#202124',
  },
  googleListSub: {
    fontSize: ms(12),
    color: '#5f6368',
    marginTop: sh(4),
    lineHeight: ms(16),
  },
  googleIconWrapBlue: {
    width: sw(40),
    height: sw(40),
    borderRadius: sw(8),
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  googleIconWrapGreen: {
    width: sw(40),
    height: sw(40),
    borderRadius: sw(8),
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  googleListDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8eaed',
  },
  googleListDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8eaed',
    marginLeft: sw(70),
  },
  googleSectionLabel: {
    fontSize: ms(11),
    fontWeight: '600',
    color: '#80868b',
    letterSpacing: 0.5,
    paddingHorizontal: sw(16),
    paddingTop: sh(12),
    paddingBottom: sh(4),
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: sw(8),
    paddingVertical: sh(3),
    borderRadius: sw(12),
    marginTop: sh(6),
  },
  statusChipText: {
    fontSize: ms(11),
    fontWeight: '600',
  },
  chipProgress: { backgroundColor: '#e8f0fe' },
  chipProgressText: { color: '#1967d2' },
  chipSuccess: { backgroundColor: '#e6f4ea' },
  chipSuccessText: { color: '#188038' },
  chipNeutral: { backgroundColor: '#f1f3f4' },
  chipNeutralText: { color: '#5f6368' },
  chipWarning: { backgroundColor: '#fef7e0' },
  chipWarningText: { color: '#b06000' },
  pressed: { opacity: 0.88 },
  emptyInline: {
    paddingVertical: sh(28),
    paddingHorizontal: sw(20),
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: ms(16),
    fontWeight: '500',
    color: '#202124',
    marginTop: sh(8),
  },
  emptySub: {
    fontSize: ms(14),
    color: '#5f6368',
    textAlign: 'center',
    marginTop: sh(4),
  },
  footerNote: {
    fontSize: ms(12),
    color: '#80868b',
    textAlign: 'center',
    marginTop: sh(8),
    marginBottom: sh(12),
  },
  googleTextBtn: {
    alignItems: 'center',
    paddingVertical: sh(14),
  },
  googleTextBtnLabel: {
    fontSize: ms(14),
    fontWeight: '600',
    color: '#1a73e8',
  },
});
