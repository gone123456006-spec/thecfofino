import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image, Platform, View } from 'react-native';
import { AIIcon } from '@/constants/assets';

export function TabBarChatButton(props: BottomTabBarButtonProps) {
  const router = useRouter();
  const { style, onPress: _unusedOnPress, ...rest } = props;

  const handlePress = (e: any) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/chat');
  };

  return (
    <PlatformPressable
      {...rest}
      style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
      onPress={handlePress}
      accessibilityLabel="Open AI assistant">
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 68, height: 68 }}>
        {/* AI icon only, no background */}
        <View
          style={{
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
          <Image
            source={AIIcon}
            style={{ width: 46, height: 46 }}
            resizeMode="contain"
            accessibilityLabel="AI Assistant"
          />
        </View>
      </View>
    </PlatformPressable>
  );
}
