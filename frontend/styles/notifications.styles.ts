import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: sw(16),
    paddingTop: sh(12),
  },

  header: {
    marginBottom: sh(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sw(12),
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(10),
  },

  headerTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  badge: {
    minWidth: sw(26),
    height: sw(22),
    paddingHorizontal: sw(8),
    borderRadius: sw(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },

  badgeText: {
    color: Colors.white,
    fontSize: ms(12),
    fontWeight: '800',
  },

  markAllBtn: {
    paddingVertical: sh(8),
    paddingHorizontal: sw(12),
    borderRadius: sw(12),
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  markAllBtnDisabled: {
    opacity: 0.5,
  },

  markAllBtnText: {
    fontSize: ms(13),
    fontWeight: '800',
    color: Colors.primary,
  },

  markAllBtnTextDisabled: {
    color: Colors.textMuted,
  },

  // ─── Empty state ─────────────────────────────────────────────────────────

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(12),
  },

  // ─── Notification card ───────────────────────────────────────────────────

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: sw(12),
    padding: sw(14),
    marginBottom: sh(10),
    gap: sw(12),
  },
  cardUnread: {
    backgroundColor: Colors.surfaceAccent,
  },
  dot: {
    width: sw(8),
    height: sw(8),
    borderRadius: sw(4),
    backgroundColor: 'transparent',
    marginTop: sh(6),
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(4),
  },
  cardBody: {
    fontSize: ms(14),
    lineHeight: ms(20),
    color: Colors.textSecondary,
    marginBottom: sh(6),
  },
  cardTime: {
    fontSize: ms(12),
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
