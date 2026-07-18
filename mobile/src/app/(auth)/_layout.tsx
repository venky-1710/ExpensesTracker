import { Stack } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';

export default function AuthLayout() {
  const { C } = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
