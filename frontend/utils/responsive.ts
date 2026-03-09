import { Dimensions, PixelRatio } from 'react-native';

// ─── Design baseline (375×812); scales for all mobile e.g. Pixel 7 (412×915) ─

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Scaling helpers ─────────────────────────────────────────────────────────

/** Scale a value proportionally to the screen width. */
export const sw = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_W / BASE_WIDTH) * size));

/** Scale a value proportionally to the screen height. */
export const sh = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_H / BASE_HEIGHT) * size));

/**
 * Moderate scale — scales width but dampened by a factor (default 0.5).
 * Good for font sizes, paddings, margins — grows but not as aggressively.
 */
export const ms = (size: number, factor: number = 0.5): number =>
  Math.round(PixelRatio.roundToNearestPixel(size + (sw(size) - size) * factor));

// ─── Dynamic helpers (for use inside components with useWindowDimensions) ────

/** Build scaling helpers from dynamic dimensions (for orientation changes). */
export function createScalers(width: number, height: number) {
  return {
    sw: (size: number) => Math.round(PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size)),
    sh: (size: number) => Math.round(PixelRatio.roundToNearestPixel((height / BASE_HEIGHT) * size)),
    ms: (size: number, factor: number = 0.5) => {
      const scaled = PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);
      return Math.round(PixelRatio.roundToNearestPixel(size + (scaled - size) * factor));
    },
    width,
    height,
    isSmall: width < 360,
    isTablet: width >= 600,
  };
}

export type Scalers = ReturnType<typeof createScalers>;
