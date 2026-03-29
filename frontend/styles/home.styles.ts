import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { type Scalers } from '@/utils/responsive';

/**
 * Build home screen styles scaled to the current screen dimensions.
 */
export const createHomeStyles = ({ sw, sh, ms, width, isTablet }: Scalers) => {
  const PADDING_H = sw(16);
  const HERO_HEIGHT = sw(isTablet ? 120 : 100);
  const HERO_LEFT_RATIO = 0.58;
  const heroLeftWidth = width * HERO_LEFT_RATIO;
  const heroRightWidth = width * (1 - HERO_LEFT_RATIO);

  const glassBorder = 'rgba(0,0,0,0.06)';
  const glassBgStrong = 'rgba(0,128,193,0.04)';

  return {
    width,
    styles: StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#D9EFFF', // Softer, lighter sky blue
      },
      fullScreenContainer: {
        flex: 1,
      },
      content: {
        paddingHorizontal: PADDING_H,
        paddingTop: sh(0),
        paddingBottom: sh(8),
      },

      headerWrap: {
        overflow: 'hidden' as const,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderTopWidth: 0,
      },
      headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING_H,
        paddingVertical: sh(4),
        paddingBottom: sh(8),
        backgroundColor: 'transparent',
        gap: sw(8),
      },
      logoWrap: {
        borderRadius: sw(18),
        backgroundColor: Colors.surfaceLight,
        padding: sw(4),
      },
      logoCircle: {
        width: sw(26),
        height: sw(26),
        borderRadius: sw(13),
        backgroundColor: Colors.surfaceAccent,
        alignItems: 'center',
        justifyContent: 'center',
      },
      brandName: {
        fontSize: ms(32),
        fontWeight: '700',
        letterSpacing: -0.5,
        color: Colors.textPrimary,
      },
      headerLogoWrap: {
        backgroundColor: 'transparent',
      },
      headerLogo: {
        height: sw(30),
        width: sw(118),
        marginLeft: -sw(6),
        backgroundColor: 'transparent',
      },
      headerSpacer: { flex: 1 },
      notificationBtn: {
        width: sw(40),
        height: sw(40),
        borderRadius: sw(20),
        backgroundColor: '#D9EFFF', // Matches soft blue home bg
        borderWidth: 1,
        borderColor: 'rgba(0,128,193,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      },

      heroRow: {
        flexDirection: 'row',
        marginTop: sh(0),
        marginBottom: sh(4),
        marginHorizontal: 0,
        borderRadius: sw(22),
        overflow: 'hidden' as const,
        height: HERO_HEIGHT,
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      heroLeft: {
        width: heroLeftWidth,
        height: HERO_HEIGHT,
      },
      heroCarousel: {
        width: heroLeftWidth,
        height: HERO_HEIGHT,
      },
      heroSlide: {
        width: heroLeftWidth,
        height: HERO_HEIGHT,
      },
      heroImage: {
        width: heroLeftWidth,
        height: HERO_HEIGHT,
      },
      heroPagination: {
        position: 'absolute' as const,
        bottom: sh(6),
        left: 0,
        right: heroRightWidth,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: sw(4),
      },
      heroDot: {
        width: sw(4),
        height: sw(4),
        borderRadius: sw(2),
        backgroundColor: 'rgba(255,255,255,0.5)',
      },
      heroDotActive: {
        backgroundColor: Colors.primary,
        width: sw(5),
        height: sw(5),
        borderRadius: sw(2.5),
      },
      heroRight: {
        width: heroRightWidth,
        height: HERO_HEIGHT,
        backgroundColor: '#0063E7', // Vibrant branding blue
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: sw(8),
      },
      heroCtaIconWrap: {
        width: sw(44),
        height: sw(44),
        borderRadius: sw(22),
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: sh(4),
      },
      heroCtaIcon: {
        marginBottom: 0,
      },
      heroCtaText: {
        fontSize: ms(15),
        fontWeight: '800',
        color: '#fff',
        textAlign: 'left',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
      },

      topicsSection: {
        marginBottom: -sh(8),
        paddingVertical: sh(2),
        paddingHorizontal: PADDING_H,
        minHeight: sh(76),
        overflow: 'hidden' as const,
        backgroundColor: 'transparent',
        borderTopLeftRadius: sw(28),
        borderTopRightRadius: sw(28),
        borderBottomLeftRadius: sw(14),
        borderBottomRightRadius: sw(14),
        borderWidth: 0,
      },
      topicsBgWrap: {
        ...StyleSheet.absoluteFillObject,
        opacity: 1,
      },
      topicsFloatingIcon: {
        position: 'absolute' as const,
      },
      topicsHeadingWrap: {
        alignSelf: 'center',
        zIndex: 1,
        marginTop: sh(6),
      },
      topicsHeading: {
        fontSize: ms(28),
        fontWeight: '800',
        letterSpacing: -0.5,
        color: '#0063E7', // High-contrast Royal Blue
        textAlign: 'center',
      },
      topicsHeadingVirtual: {
        color: '#000000',
      },

      segmentWrap: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: sw(16),
        padding: sw(5),
        marginTop: sh(14),
        marginBottom: sh(8),
        borderWidth: 1,
        borderColor: 'rgba(0,128,193,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
      },
      segmentItem: {
        flex: 1,
        borderRadius: sw(10),
        paddingVertical: sh(10),
        paddingHorizontal: sw(4),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
        backgroundColor: 'transparent',
      },
      segmentItemActive: {
        backgroundColor: Colors.white,
        shadowColor: 'rgba(0,128,193,0.3)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,128,193,0.04)',
      },
      segmentPressed: { opacity: 0.88 },
      segmentLabel: {
        color: 'rgba(0,128,193,0.5)', // Muted darker blue for contrast
        fontSize: ms(13),
        fontWeight: '600',
      },
      segmentLabelActive: {
        color: '#0080C1', // Brand primary blue
        fontWeight: '700',
      },

      segmentContent: {
        marginTop: sh(12),
        marginBottom: sh(8),
      },
      statusCardWrap: {
        borderRadius: sw(28),
        padding: sw(20),
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,128,193,0.06)',
      },
      statusCardTitle: {
        fontSize: ms(18),
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: sw(4),
      },
      statusCardSubtitle: {
        fontSize: ms(13),
        color: Colors.textSecondary,
        marginBottom: sh(12),
      },
      statusCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sw(8),
        marginBottom: sh(14),
      },
      statusCardText: {
        fontSize: ms(14),
        fontWeight: '600',
        color: Colors.textPrimary,
      },
      statusCardBtn: {
        backgroundColor: Colors.primary,
        borderRadius: sw(12),
        paddingVertical: sh(10),
        paddingHorizontal: sw(16),
        alignItems: 'center',
      },
      statusCardBtnText: {
        fontSize: ms(14),
        fontWeight: '700',
        color: Colors.white,
      },

      servicesSectionWrap: {
        borderRadius: sw(24),
        paddingHorizontal: PADDING_H,
        paddingTop: sh(16),
        paddingBottom: sh(16),
        marginBottom: sh(12),
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden' as const,
      },
      sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sh(8),
      },
      sectionDivider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.4)',
      },
      sectionTitle: {
        marginHorizontal: sw(12),
        fontSize: ms(20),
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
      },

      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: sw(6),
        marginBottom: sh(6),
      },
      card: {
        width: '31.5%',
        backgroundColor: '#F2F4F7', // Light gray card background
        borderRadius: sw(20),
        paddingTop: sw(10),
        paddingBottom: sw(12),
        paddingHorizontal: sw(6),
        alignItems: 'center',
        borderWidth: 0,
      },
      cardPressed: { opacity: 0.94 },
      cardIconWrap: {
        width: '100%',
        height: sw(isTablet ? 90 : 70),
        borderRadius: sw(16),
        backgroundColor: '#F5FAFF', // Soft inner tint
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: sw(8),
      },
      cardIconWrapTransparent: {
        backgroundColor: 'transparent',
      },
      cardServiceImage: {
        width: '100%',
        height: '100%',
      },
      cardTitle: {
        textAlign: 'center',
        fontSize: ms(13),
        lineHeight: ms(18),
        color: Colors.textSecondary,
        fontWeight: '500',
      },

      toolsSectionWrap: {
        borderRadius: sw(24),
        paddingHorizontal: PADDING_H,
        paddingTop: sh(16),
        paddingBottom: sh(16),
        marginBottom: sh(12),
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden' as const,
      },
      toolsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sh(8),
      },
      toolsSectionTitle: {
        marginHorizontal: sw(12),
        fontSize: ms(20),
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
      },
      toolsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: sw(8),
      },
      toolCard: {
        width: sw(72),
        backgroundColor: '#F2F4F7', // Light gray tool background
        borderRadius: sw(18),
        paddingVertical: sh(10),
        paddingHorizontal: sw(2),
        alignItems: 'center',
        borderWidth: 0,
      },
      toolCardPressed: { opacity: 0.92 },
      toolIconWrap: {
        width: sw(48),
        height: sw(48),
        borderRadius: sw(16),
        backgroundColor: 'rgba(255,255,255,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: sh(6),
      },
      toolLabel: {
        textAlign: 'center',
        fontSize: ms(11.5),
        lineHeight: ms(15),
        color: Colors.textPrimary,
        fontWeight: '700',
      },

      contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sw(10),
        marginTop: sh(0),
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        paddingTop: sh(6),
        paddingBottom: sh(2),
      },
      contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sw(6),
        paddingVertical: sh(10),
        borderRadius: sw(10),
        borderWidth: 1,
        borderColor: Colors.primaryLight,
        backgroundColor: Colors.surfaceLight,
      },
      contactBtnText: {
        fontSize: ms(13),
        fontWeight: '600',
        color: Colors.primary,
      },
      contactBtnWhatsapp: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sw(6),
        paddingVertical: sh(10),
        borderRadius: sw(10),
        backgroundColor: Colors.whatsapp,
      },
      contactBtnWhatsappText: {
        fontSize: ms(13),
        fontWeight: '600',
        color: Colors.white,
      },
    }),

    sizes: {
      logoIcon: Math.round(ms(14)),
      notificationIcon: Math.round(ms(20)),
      cardIcon: Math.round(ms(isTablet ? 38 : 32)),
      toolIcon: Math.round(ms(24)),
      whatsappIcon: Math.round(ms(16)),
      heroLeftWidth: Math.round(heroLeftWidth),
    },
  };
};
