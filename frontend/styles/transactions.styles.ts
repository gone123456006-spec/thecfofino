import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Scalers } from '@/utils/responsive';

/** Google Activity–style payment history */
export const createTransactionsStyles = ({ sw, sh, ms }: Scalers) =>
  StyleSheet.create({
    screen: {
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
    pageSub: {
      fontSize: ms(14),
      fontWeight: '400',
      color: '#5f6368',
      lineHeight: ms(20),
      marginBottom: sh(16),
    },
    summaryChip: {
      alignSelf: 'flex-start',
      backgroundColor: '#e6f4ea',
      paddingHorizontal: sw(10),
      paddingVertical: sh(5),
      borderRadius: sw(16),
      marginBottom: sh(14),
    },
    summaryChipText: {
      fontSize: ms(12),
      fontWeight: '600',
      color: '#188038',
    },
    error: {
      fontSize: ms(13),
      color: '#c5221f',
      marginBottom: sh(12),
      lineHeight: ms(18),
    },
    googleCard: {
      backgroundColor: Colors.white,
      borderRadius: sw(8),
      borderWidth: 1,
      borderColor: '#e8eaed',
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: ms(11),
      fontWeight: '600',
      color: '#80868b',
      letterSpacing: 0.5,
      paddingHorizontal: sw(16),
      paddingTop: sh(14),
      paddingBottom: sh(6),
    },
    sectionLabelFirst: {
      paddingTop: sh(10),
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: sh(12),
      paddingHorizontal: sw(16),
      gap: sw(14),
      minHeight: sh(64),
    },
    activityRowPressed: {
      backgroundColor: '#f8f9fa',
    },
    iconWrapSuccess: {
      width: sw(40),
      height: sw(40),
      borderRadius: sw(20),
      backgroundColor: '#e6f4ea',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: sh(2),
    },
    iconWrapPartial: {
      width: sw(40),
      height: sw(40),
      borderRadius: sw(20),
      backgroundColor: '#fef7e0',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: sh(2),
    },
    activityBody: {
      flex: 1,
      minWidth: 0,
    },
    activityTitle: {
      fontSize: ms(14),
      fontWeight: '500',
      color: '#202124',
      lineHeight: ms(20),
    },
    activityMeta: {
      fontSize: ms(12),
      fontWeight: '400',
      color: '#5f6368',
      marginTop: sh(3),
      lineHeight: ms(16),
    },
    activityTime: {
      fontSize: ms(11),
      fontWeight: '400',
      color: '#80868b',
      marginTop: sh(4),
    },
    amountCol: {
      alignItems: 'flex-end',
      flexShrink: 0,
      paddingTop: sh(2),
    },
    amountText: {
      fontSize: ms(14),
      fontWeight: '600',
      color: '#202124',
    },
    amountPartial: {
      color: '#b06000',
    },
    dividerInset: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: '#e8eaed',
      marginLeft: sw(70),
    },
    dividerFull: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: '#e8eaed',
    },
    refText: {
      fontSize: ms(11),
      color: '#80868b',
      marginTop: sh(4),
    },
    emptyCard: {
      backgroundColor: Colors.white,
      borderRadius: sw(8),
      borderWidth: 1,
      borderColor: '#e8eaed',
      paddingVertical: sh(36),
      paddingHorizontal: sw(24),
      alignItems: 'center',
    },
    emptyIconWrap: {
      width: sw(56),
      height: sw(56),
      borderRadius: sw(28),
      backgroundColor: '#f1f3f4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sh(12),
    },
    emptyTitle: {
      fontSize: ms(16),
      fontWeight: '500',
      color: '#202124',
      marginBottom: sh(6),
    },
    emptyBody: {
      fontSize: ms(14),
      fontWeight: '400',
      color: '#5f6368',
      textAlign: 'center',
      lineHeight: ms(20),
    },
    muted: {
      fontSize: ms(14),
      color: '#5f6368',
    },
  });
