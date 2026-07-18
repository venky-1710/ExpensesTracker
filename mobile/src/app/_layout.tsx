import { Stack } from 'expo-router';
import { ThemeProvider as NavThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { View } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { FilterProvider } from '../context/FilterContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/ToastConfig';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';

SplashScreen.preventAutoHideAsync();

interface TextWithDefaultProps extends Text {
    defaultProps?: { style?: any };
}
interface TextInputWithDefaultProps extends TextInput {
    defaultProps?: { style?: any };
}

((Text as unknown) as TextWithDefaultProps).defaultProps = ((Text as unknown) as TextWithDefaultProps).defaultProps || {};
((Text as unknown) as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_500Medium' };
((TextInput as unknown) as TextInputWithDefaultProps).defaultProps = ((TextInput as unknown) as TextInputWithDefaultProps).defaultProps || {};
((TextInput as unknown) as TextInputWithDefaultProps).defaultProps!.style = { fontFamily: 'Inter_500Medium' };

function RootStack() {
  const { C, isDark } = useAppTheme();
  const [splashFinished, setSplashFinished] = useState(false);
  
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(C.bg);
  }, [C.bg]);

  const navTheme = isDark ? DarkTheme : DefaultTheme;
  const customNavTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: C.bg,
    },
  };

  return (
    <NavThemeProvider value={customNavTheme}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        {!splashFinished && <AnimatedSplashScreen onAnimationComplete={() => setSplashFinished(true)} />}
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Righteous_400Regular,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <FilterProvider>
            <RootStack />
          </FilterProvider>
          <Toast
            config={toastConfig}
            position="top"
            topOffset={56}
            visibilityTime={3000}
          />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
