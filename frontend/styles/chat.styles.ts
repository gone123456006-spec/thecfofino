import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ─── Header ─────────────────────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    backgroundColor: Colors.gradientPrimary,
    gap: sw(10),
  },
  backBtn: {
    width: sw(36),
    height: sw(36),
    borderRadius: sw(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(8),
  },
  headerTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // ─── Messages list ──────────────────────────────────────────────────────

  messagesList: {
    flex: 1,
    paddingHorizontal: sw(16),
    paddingTop: sh(16),
    paddingBottom: sh(8),
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: sh(12),
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: sh(10),
    paddingHorizontal: sw(14),
    borderRadius: sw(18),
  },
  bubbleBot: {
    borderBottomLeftRadius: sw(4),
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bubbleUser: {
    borderBottomRightRadius: sw(4),
    backgroundColor: Colors.primary,
  },
  bubbleText: {
    fontSize: ms(15),
    lineHeight: ms(22),
    color: Colors.textPrimary,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  botAvatar: {
    width: sw(28),
    height: sw(28),
    borderRadius: sw(14),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(8),
    marginBottom: sh(2),
    overflow: 'hidden' as const,
  },
  botAvatarImage: {
    width: sw(26),
    height: sw(26),
  },
  botAvatarImageSmall: {
    width: sw(22),
    height: sw(22),
  },

  // ─── Input bar ──────────────────────────────────────────────────────────

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingVertical: sh(10),
    paddingBottom: sh(24),
    gap: sw(10),
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  input: {
    flex: 1,
    minHeight: sh(44),
    maxHeight: sh(100),
    paddingHorizontal: sw(16),
    paddingVertical: sh(10),
    borderRadius: sw(22),
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: ms(15),
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: sw(44),
    height: sw(44),
    borderRadius: sw(22),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },

  // ─── Suggested questions ───────────────────────────────────────────────

  suggestedWrap: {
    marginTop: sh(8),
    marginBottom: sh(16),
  },
  suggestedLabel: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: sh(10),
    paddingHorizontal: sw(2),
  },
  suggestedChip: {
    alignSelf: 'flex-start',
    paddingVertical: sh(8),
    paddingHorizontal: sw(14),
    borderRadius: sw(20),
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: sw(8),
    marginBottom: sh(8),
  },
  suggestedChipText: {
    fontSize: ms(13),
    color: Colors.primary,
    fontWeight: '500',
  },

  // ─── FAB on Home ────────────────────────────────────────────────────────

  fab: {
    position: 'absolute',
    right: sw(20),
    bottom: sh(100),
    width: sw(56),
    height: sw(56),
    borderRadius: sw(28),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: sw(6),
    elevation: 6,
  },
  fabIcon: {
    fontSize: ms(24),
  },
});
