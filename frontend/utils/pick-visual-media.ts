import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickVisualMediaOptions = Omit<ImagePicker.ImagePickerOptions, 'legacy'>;

/** Android Photo Picker / SAF: policy-compliant visual types (no broad storage permission). */
const ANDROID_VISUAL_MEDIA: ImagePicker.MediaType[] = ['images', 'videos'];

/**
 * Google Play–compliant visual media selection.
 * - **Android:** Never calls `requestMediaLibraryPermissionsAsync`. Always uses
 *   `launchImageLibraryAsync` with `legacy: false` and `mediaTypes: ['images','videos']`.
 *   Callers that need images only should reject `type === 'video'` after pick.
 * - **iOS:** Requests photo library permission, then opens the picker.
 * - Invoke only from explicit user actions (e.g. button press).
 */
export async function pickVisualMediaFromLibrary(
  options: PickVisualMediaOptions = {},
): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS === 'ios') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert('Permission needed', 'Allow access to your photos to continue.');
      return { canceled: true, assets: null };
    }
    return ImagePicker.launchImageLibraryAsync({
      ...options,
      mediaTypes: options.mediaTypes ?? ANDROID_VISUAL_MEDIA,
      legacy: false,
    });
  }

  const { mediaTypes: _androidIgnoresCallerMediaTypes, ...rest } = options;
  void _androidIgnoresCallerMediaTypes;
  return ImagePicker.launchImageLibraryAsync({
    ...rest,
    mediaTypes: ANDROID_VISUAL_MEDIA,
    legacy: false,
  });
}
