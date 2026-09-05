import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from './src/theme';
import { AppProvider, useApp } from './src/store/AppContext';
import { RootStackParamList } from './src/navigation';
import { setupNotificationHandler } from './src/services/notifications';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TrailScreen from './src/screens/TrailScreen';
import WalksScreen from './src/screens/WalksScreen';
import { demo } from './src/dev/demo';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    primary: colors.accent,
    border: colors.line,
  },
};

function Root() {
  const { ready, state } = useApp();
  const [justOnboarded, setJustOnboarded] = useState(false);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!state.onboarded) return <OnboardingScreen onDone={() => setJustOnboarded(true)} initialStep={demo?.onboardStep} />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={demo?.screen ?? (justOnboarded ? 'Paywall' : 'Home')}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Trail" component={TrailScreen} />
        <Stack.Screen name="Walks" component={WalksScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
          initialParams={justOnboarded ? { fromOnboarding: true } : undefined}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Web-only: pin the app to the viewport (phone-sized window when capturing screenshots)
// and pad for the iOS status bar / home indicator so captures match a real device.
const webFrame =
  Platform.OS === 'web'
    ? ({ width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: colors.bg } as const)
    : null;
const demoInsets = demo ? { paddingTop: 59, paddingBottom: 34 } : null;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <View style={[{ flex: 1 }, webFrame as any, demoInsets]}>
          <Root />
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}
