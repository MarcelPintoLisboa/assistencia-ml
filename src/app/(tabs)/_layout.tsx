import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icone =
  (nome: IconName, ativo: IconName) =>
  ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? ativo : nome} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const { agendamentos } = useDados();
  const hoje = new Date().toDateString();
  const pendentesHoje = agendamentos.filter((a) => !a.concluido && new Date(a.data).toDateString() === hoje).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgAlt, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarIcon: icone('speedometer-outline', 'speedometer') }} />
      <Tabs.Screen name="ordens" options={{ title: 'Ordens', tabBarIcon: icone('construct-outline', 'construct') }} />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: icone('calendar-outline', 'calendar'),
          tabBarBadge: pendentesHoje || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.bg, fontWeight: '800' },
        }}
      />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: icone('people-outline', 'people') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Menu', tabBarIcon: icone('menu-outline', 'menu') }} />
    </Tabs>
  );
}
