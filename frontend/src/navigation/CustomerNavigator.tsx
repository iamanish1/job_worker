import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import HomeScreen              from '../screens/customer/HomeScreen';
import WorkerListingScreen     from '../screens/customer/WorkerListingScreen';
import WorkerProfileScreen     from '../screens/customer/WorkerProfileScreen';
import BookingScreen           from '../screens/customer/BookingScreen';
import BookingTrackingScreen   from '../screens/customer/BookingTrackingScreen';
import CustomerProfileScreen   from '../screens/customer/CustomerProfileScreen';
import MyBookingsScreen        from '../screens/customer/MyBookingsScreen';
import MyReviewsScreen        from '../screens/customer/MyReviewsScreen';
import HelpFaqScreen          from '../screens/customer/HelpFaqScreen';

export type CustomerStackParams = {
  CustomerHome:     undefined;
  CustomerProfile:  undefined;
  MyBookings:       undefined;
  MyReviews:        undefined;
  HelpFaq:          undefined;
  WorkerListing:    { categoryId?: string; categoryName?: string; city?: string };
  WorkerProfile:    { workerId: string };
  Booking:          { workerId: string; categoryId: string; categoryName: string };
  BookingTracking:  { bookingId: string; initialOtpCode?: string };
};

const Stack = createNativeStackNavigator<CustomerStackParams>();

export default function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: Colors.primary },
        headerTintColor:  Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <Stack.Screen name="CustomerHome"    component={HomeScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen}
        options={{ title: 'My Profile' }} />
      <Stack.Screen name="MyBookings"      component={MyBookingsScreen}
        options={{ title: 'My Bookings' }} />
      <Stack.Screen name="WorkerListing"   component={WorkerListingScreen}
        options={({ route }) => ({ title: route.params?.categoryName || 'Workers' })} />
      <Stack.Screen name="WorkerProfile"   component={WorkerProfileScreen}
        options={{ title: 'Worker Profile' }} />
      <Stack.Screen name="Booking"         component={BookingScreen}
        options={{ title: 'Book Service' }} />
      <Stack.Screen name="BookingTracking" component={BookingTrackingScreen}
        options={{ title: 'Track Booking' }} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen}
        options={{ title: 'My Reviews' }} />
      <Stack.Screen name="HelpFaq" component={HelpFaqScreen}
        options={{ title: 'Help & FAQ' }} />
    </Stack.Navigator>
  );
}
