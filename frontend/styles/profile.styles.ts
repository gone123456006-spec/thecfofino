import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: sh(32),
  },

  // ─── App bar (sticky — sits outside ScrollView) ─────────────────────────
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    paddingBottom: sh(12),
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  scroll: {
    flex: 1,
  },
  appBarPlaceholder: {
    width: sw(40),
  },
  appBarSpacer: {
    flex: 1,
  },
  appBarTitle: {
    fontSize: ms(20),
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  notificationCircle: {
    width: sw(40),
    height: sw(40),
    borderRadius: sw(20),
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: sw(16),
    height: sw(16),
    borderRadius: sw(8),
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sw(3),
  },
  notificationBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: Colors.white,
  },

  // ─── User section ───────────────────────────────────────────────────────
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingTop: sh(24),
    paddingBottom: sh(20),
    gap: sw(16),
  },
  avatar: {
    width: sw(72),
    height: sw(72),
    borderRadius: sw(36),
    backgroundColor: Colors.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: sw(72),
    height: sw(72),
    borderRadius: sw(36),
  },
  avatarText: {
    fontSize: ms(28),
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: sw(26),
    height: sw(26),
    borderRadius: sw(13),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: ms(22),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(2),
  },
  clientId: {
    fontSize: ms(14),
    color: Colors.textMuted,
  },

  // ─── Banner ─────────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: sw(16),
    marginBottom: sh(24),
    paddingVertical: sh(16),
    paddingHorizontal: sw(18),
    borderRadius: sw(14),
    backgroundColor: Colors.primary,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.white,
    marginBottom: sh(4),
  },
  bannerSubtitle: {
    fontSize: ms(13),
    color: 'rgba(255,255,255,0.9)',
  },
  bannerBtn: {
    paddingVertical: sh(10),
    paddingHorizontal: sw(18),
    borderRadius: sw(10),
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bannerBtnText: {
    fontSize: ms(14),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  processCard: {
    marginHorizontal: sw(16),
    marginBottom: sh(16),
    backgroundColor: Colors.surface,
    borderRadius: sw(14),
    borderWidth: 1,
    borderColor: Colors.border,
    padding: sw(14),
  },
  processTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  processSubtitle: {
    fontSize: ms(13),
    color: Colors.textMuted,
    marginTop: sh(4),
    marginBottom: sh(10),
  },
  processStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(8),
    marginBottom: sh(10),
  },
  processStatusText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  processActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: sw(10),
    paddingVertical: sh(8),
    paddingHorizontal: sw(12),
  },
  processActionText: {
    fontSize: ms(13),
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },

  // ─── Legal & Support ───────────────────────────────────────────────────
  section: {
    marginHorizontal: sw(16),
    marginBottom: sh(8),
  },
  sectionTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(4),
  },
  sectionSubtitle: {
    fontSize: ms(13),
    color: Colors.textMuted,
    marginBottom: sh(12),
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: sw(14),
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(14),
    paddingHorizontal: sw(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowIcon: {
    width: sw(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowContent: {
    flex: 1,
    marginLeft: sw(4),
  },
  listRowTitle: {
    fontSize: ms(16),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listRowSubtitle: {
    fontSize: ms(12),
    color: Colors.textMuted,
    marginTop: sh(2),
  },
  listRowChevron: {
    marginLeft: sw(8),
  },

  // ─── Contact footer – match tab bar theme ────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(10),
    marginTop: sh(20),
    marginHorizontal: 0,
    paddingTop: sh(16),
    paddingHorizontal: sw(16),
    paddingBottom: sh(12),
    borderTopWidth: 1,
    borderTopColor: Colors.tabBorder,
    backgroundColor: Colors.background,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(6),
    paddingVertical: sh(12),
    borderRadius: sw(10),
    borderWidth: 1,
    borderColor: Colors.tabBorder,
    backgroundColor: Colors.surface,
  },
  contactBtnIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.tabActive,
  },
  contactBtnWhatsapp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(6),
    paddingVertical: sh(12),
    borderRadius: sw(10),
    borderWidth: 1,
    borderColor: Colors.tabBorder,
    backgroundColor: Colors.surface,
  },
  contactBtnWhatsappText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.whatsapp,
  },

  // ─── Log out & version ──────────────────────────────────────────────────
  logoutBtn: {
    marginHorizontal: sw(16),
    marginTop: sh(24),
    paddingVertical: sh(14),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: ms(16),
    fontWeight: '600',
    color: Colors.primary,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: sh(24),
    marginBottom: sh(8),
    backgroundColor: 'transparent',
  },
  logoImage: {
    height: sh(26),
    width: sw(102),
    backgroundColor: 'transparent',
  },
  version: {
    fontSize: ms(12),
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 0,
  },
  
  // ─── Edit Modal ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: sw(20),
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: sw(16),
    padding: sw(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: ms(20),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(20),
  },
  inputGroup: {
    marginBottom: sh(16),
  },
  inputLabel: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: sh(6),
  },
  input: {
    height: sh(48),
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: sw(10),
    paddingHorizontal: sw(14),
    fontSize: ms(16),
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: sw(12),
    marginTop: sh(12),
  },
  modalActionBtn: {
    paddingVertical: sh(10),
    paddingHorizontal: sw(20),
    borderRadius: sw(10),
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  cancelBtnText: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtnText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: Colors.white,
  },
});
