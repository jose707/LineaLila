// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DriverRegistrationScreen from '../screens/DriverRegistrationScreen';
import EmailLoginScreen from '../screens/EmailLoginScreen';
import GooglePhoneVerificationScreen from '../screens/GooglePhoneVerificationScreen';
import { User } from '../types/models';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  DriverRegistration: { user?: User };
  EmailLogin: undefined;
  GooglePhoneVerification: {
    email: string;
    firebaseUid: string;
    displayName: string;
  };
  RoleSelection: { user?: any };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="EmailLogin"
        component={EmailLoginScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="GooglePhoneVerification"
        component={GooglePhoneVerificationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="DriverRegistration"
        component={DriverRegistrationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}
