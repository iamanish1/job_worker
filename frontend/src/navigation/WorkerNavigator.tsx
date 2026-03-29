import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { workerApi } from '../api/worker.api';
import WorkerOnboardingScreen  from '../screens/worker/onboarding/WorkerOnboardingScreen';
import DashboardScreen         from '../screens/worker/DashboardScreen';
import BookingRequestsScreen   from '../screens/worker/BookingRequestsScreen';
import EarningsScreen          from '../screens/worker/EarningsScreen';
import WorkerProfileEditScreen from '../screens/worker/WorkerProfileEditScreen';

export type WorkerStackParams = {
  WorkerOnboarding:  undefined;
  WorkerTabs:        undefined;
};

const Stack  = createNativeStackNavigator<WorkerStackParams>();
const Tab    = createBottomTabNavigator();

function WorkerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle:             {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarLabelStyle:        { paddingBottom: 2 },
        headerStyle:             { backgroundColor: Colors.primary },
        headerTintColor:         Colors.white,
        headerTitleStyle:        { fontWeight: 'bold' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: any; inactive: any }> = {
            Dashboard:      { active: 'home',           inactive: 'home-outline' },
            BookingRequests:{ active: 'briefcase',      inactive: 'briefcase-outline' },
            Earnings:       { active: 'wallet',         inactive: 'wallet-outline' },
            WorkerProfile:  { active: 'person-circle',  inactive: 'person-circle-outline' },
          };
          const ic = icons[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? ic.active : ic.inactive} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Dashboard"       component={DashboardScreen}         options={{ title: 'Home' }} />
      <Tab.Screen name="BookingRequests" component={BookingRequestsScreen}   options={{ title: 'Bookings' }} />
      <Tab.Screen name="Earnings"        component={EarningsScreen}          options={{ title: 'Earnings' }} />
      <Tab.Screen name="WorkerProfile"   component={WorkerProfileEditScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function WorkerNavigator() {
  const [checking,    setChecking]    = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof WorkerStackParams>('WorkerOnboarding');

  useEffect(() => {
    workerApi.getMyProfile()
      .then(res => {
        const profile = res.data.data;
        // If worker already has a category set — they completed onboarding
        if (profile?.categoryId) {
          setInitialRoute('WorkerTabs');
        } else {
          setInitialRoute('WorkerOnboarding');
        }
      })
      .catch(() => {
        // No profile or error — send to onboarding
        setInitialRoute('WorkerOnboarding');
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerOnboarding" component={WorkerOnboardingScreen} />
      <Stack.Screen name="WorkerTabs"       component={WorkerTabs} />
    </Stack.Navigator>
  );
}
