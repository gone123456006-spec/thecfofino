import { Tabs } from 'expo-router';
import React from 'react';
import { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { TabBarChatButton } from '@/components/tab-bar-chat-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tabBarOptions } from '@/styles/tab-bar.styles';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const baseBarStyle = tabBarOptions.tabBarStyle as ViewStyle | undefined;
  const paddingBottom =
    (typeof baseBarStyle?.paddingBottom === 'number' ? baseBarStyle.paddingBottom : 8) +
    Math.max(0, insets.bottom - 12);
  return (
    <Tabs
      screenOptions={{
        ...tabBarOptions,
        tabBarStyle: { ...(baseBarStyle ?? {}), paddingBottom },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cabinet"
        options={{
          title: 'Cabinet',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat-tab"
        options={{
          title: 'Chat',
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <TabBarChatButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="cfo"
        options={{
          title: 'CFO',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
