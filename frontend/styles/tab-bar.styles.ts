import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

// Match home page gradient (teal #2ECCC7 → blue #0063E7)
const homeBgSoftBlue = '#D9EFFF';

export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: '#0080C1', // Brand primary blue
  tabBarInactiveTintColor: 'rgba(0,128,193,0.5)',
  tabBarStyle: {
    height: 74,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,128,193,0.08)', // Subtle separator
    backgroundColor: homeBgSoftBlue,
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
