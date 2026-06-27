import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.75, height: size * 0.6, borderRadius: 3, borderWidth: 2, borderColor: color, borderBottomWidth: 0 }} />
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: 2, borderWidth: 2, borderColor: color, marginTop: -2 }} />
  </View>
);

const ListIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', gap: 4 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ height: 2, backgroundColor: color, borderRadius: 1, width: i === 0 ? '100%' : i === 1 ? '75%' : '50%' }} />
    ))}
  </View>
);

const CalIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.8, height: size * 0.75, borderRadius: 3, borderWidth: 2, borderColor: color }}>
      <View style={{ height: size * 0.18, borderBottomWidth: 1, borderColor: color, backgroundColor: color + '33' }} />
    </View>
  </View>
);

const UserIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, borderWidth: 2, borderColor: color, marginBottom: 2 }} />
    <View style={{ width: size * 0.7, height: size * 0.3, borderRadius: size * 0.15, borderWidth: 2, borderColor: color, borderBottomWidth: 0 }} />
  </View>
);

export default function MainLayout() {
  const { C } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <ListIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <CalIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
