import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

function TabIcon({ name, color }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#135bec',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="aulas"
        options={{
          title: 'Aulas',
          tabBarIcon: ({ color }) => <TabIcon name="event" color={color} />,
        }}
      />
      <Tabs.Screen
        name="provas"
        options={{
          title: 'Provas',
          tabBarIcon: ({ color }) => <TabIcon name="assignment" color={color} />,
        }}
      />
      <Tabs.Screen
        name="presenca"
        options={{
          title: 'Frequência',
          tabBarIcon: ({ color }) => <TabIcon name="fact-check" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
