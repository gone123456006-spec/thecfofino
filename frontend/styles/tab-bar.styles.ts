import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

// Match home page gradient (teal #2ECCC7 → blue #0063E7)
const homeBgBlue = '#0063E7';

export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: '#ffffff',
  tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
  tabBarStyle: {
    height: 74,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    backgroundColor: homeBgBlue,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabBarItemStyle: {
    paddingTop: 2,
  },
};
