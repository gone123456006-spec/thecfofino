/**
 * Import this module first from `app/_layout.tsx` so the OS splash stays up
 * until we call hideAsync() — avoids a flash before JS is ready on APK.
 */
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

void SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  try {
    SplashScreen.setOptions({
      backgroundColor: '#ffffff',
      fade: true,
      duration: 200,
    });
  } catch {
    /* Expo Go may not support setOptions */
  }
}
