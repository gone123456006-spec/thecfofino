/**
 * Import this module first from `app/_layout.tsx` so the OS splash stays up
 * until we call hideAsync() — avoids a white frame before JS is ready on APK.
 */
import * as SplashScreen from 'expo-splash-screen';

void SplashScreen.preventAutoHideAsync();
