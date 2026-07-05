import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { FilterProvider } from '../context/FilterContext';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/ToastConfig';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FilterProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </FilterProvider>
        <Toast
          config={toastConfig}
          position="top"
          topOffset={56}
          visibilityTime={3000}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
