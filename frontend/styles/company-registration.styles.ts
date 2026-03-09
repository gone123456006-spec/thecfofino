import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export const companyRegistrationStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: sw(20),
    paddingBottom: sh(48),
  },
  headerBlock: {
    marginBottom: sh(20),
  },
  title: {
    fontSize: ms(24),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(6),
  },
  subtitle: {
    fontSize: ms(14),
    color: Colors.textSecondary,
    lineHeight: ms(20),
  },
  sectionDesc: {
    fontSize: ms(13),
    color: Colors.textMuted,
    marginBottom: sh(12),
  },
  section: {
    marginBottom: sh(18),
  },
  sectionTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(6),
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: sw(12),
    padding: sw(18),
    marginBottom: sh(24),
  },
  selectedTypeHeader: {
    marginBottom: sh(20),
  },
  selectedTypeLabel: {
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: sh(14),
  },
  subSectionTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(10),
  },
  // Video – Registration Overview (extra compact, mobile)
  videoWrap: {
    width: '100%',
    height: sh(168),
    borderRadius: sw(8),
    backgroundColor: Colors.gradientDark,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: sh(2),
  },
  videoWrapSmall: {
    height: sh(115),
    borderRadius: sw(8),
    backgroundColor: Colors.gradientDark,
    overflow: 'hidden',
    marginBottom: sh(10),
    position: 'relative',
  },
  videoThumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoControlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(8),
    paddingVertical: sh(6),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoControlsOverlayFull: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  videoControlsTapArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCentreControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(10),
  },
  videoSkipBtn: {
    width: sw(36),
    height: sw(36),
    borderRadius: sw(18),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCentrePlayBtn: {
    width: sw(60),
    height: sw(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoControlsBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(8),
    paddingVertical: sh(5),
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  videoTimeText: {
    fontSize: ms(10),
    color: '#fff',
  },
  videoBottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sw(4),
  },
  videoControlBtnSmall: {
    width: sw(28),
    height: sw(28),
    borderRadius: sw(14),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoProgressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  videoProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#e53935',
  },
  videoProgressThumb: {
    position: 'absolute',
    backgroundColor: '#e53935',
  },
  videoControlBtn: {
    width: sw(48),
    height: sw(48),
    borderRadius: sw(24),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoOverlayBlue: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 30, 60, 0.88)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconWrap: {
    width: sw(68),
    height: sw(68),
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitleLabel: {
    fontSize: ms(20),
    fontWeight: '700',
    color: '#fff',
    marginTop: sh(10),
  },
  videoLabel: {
    fontSize: ms(13),
    color: 'rgba(255,255,255,0.9)',
    marginTop: sh(12),
  },
  // Business Type Selection
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sw(6),
  },
  typeChip: {
    paddingHorizontal: sw(12),
    paddingVertical: sh(8),
    borderRadius: sw(8),
    backgroundColor: Colors.surface,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  typeChipTextSelected: {
    color: Colors.white,
  },
  hint: {
    fontSize: ms(13),
    color: Colors.textMuted,
    marginTop: sh(6),
    fontStyle: 'italic',
  },
  // Documents
  docList: {
    flexDirection: 'column',
    gap: sh(8),
    marginBottom: sh(4),
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: sh(12),
    paddingHorizontal: sw(14),
    borderRadius: sw(10),
  },
  docBullet: {
    width: sw(6),
    height: sw(6),
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: sw(12),
  },
  docText: {
    fontSize: ms(14),
    color: Colors.textPrimary,
    flex: 1,
  },
  // Benefits
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sh(10),
  },
  benefitIcon: {
    width: sw(24),
    height: sw(24),
    borderRadius: sw(12),
    backgroundColor: Colors.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(12),
  },
  benefitText: {
    fontSize: ms(14),
    color: Colors.textPrimary,
    flex: 1,
  },
  // CTA
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: sh(16),
    borderRadius: sw(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: ms(16),
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
});
