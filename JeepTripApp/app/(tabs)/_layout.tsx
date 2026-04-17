import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';
import { useNotifications } from '@/context/NotificationContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark'];
  const { t } = useLanguage();
  const { unreadTrips, pendingCount, isAdmin } = useNotifications();

  const hasUnreadMessages = unreadTrips.size > 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.gold,
        tabBarInactiveTintColor: Palette.mud,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Palette.charcoalMid,
          borderTopColor: Palette.charcoalLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_trips'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          tabBarBadge: hasUnreadMessages ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: Palette.gold, scaleX: 0.8, scaleY: 0.8 },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="help"
        options={{
          title: t('tab_help'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="questionmark.circle.fill" color={color} />,
        }}
      />

      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: t('tab_admin'),
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarBadgeStyle: { backgroundColor: Palette.gold },
          }}
        />
      )}
    </Tabs>
  );
}
