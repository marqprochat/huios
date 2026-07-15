import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const TAB_ROUTES = ['index', 'aulas', 'provas', 'mais'] as const;

function TabIcon({ name, color, focused }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string; focused: boolean }) {
  return (
    <View
      accessible={false}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        height: 32,
        borderRadius: 16,
        backgroundColor: focused ? '#e8efff' : 'transparent',
      }}
    >
      <MaterialIcons name={name} size={24} color={color} accessible={false} />
    </View>
  );
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
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="aulas"
        options={{
          title: 'Aulas',
          tabBarIcon: ({ color, focused }) => <TabIcon name="event" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="provas"
        options={{
          title: 'Provas',
          tabBarIcon: ({ color, focused }) => <TabIcon name="assignment" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, focused }) => <TabIcon name="more-horiz" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
