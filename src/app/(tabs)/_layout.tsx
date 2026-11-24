import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { useDesktop } from '../../lib/desktop';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icone = (nome: IconName, ativo: IconName) =>
  function IconeAba({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? ativo : nome} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { agendamentos } = useDados();
  const desktop = useDesktop();
  const hoje = new Date().toDateString();
  const pendentesHoje = agendamentos.filter((a) => !a.concluido && new Date(a.data).toDateString() === hoje).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // no desktop a navegação fica no menu lateral
        tabBarStyle: desktop ? { display: 'none' } : { backgroundColor: colors.bgAlt, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarIcon: icone('speedometer-outline', 'speedometer') }} />
      <Tabs.Screen name="ordens" options={{ title: 'Ordens', tabBarIcon: icone('construct-outline', 'construct') }} />
      <Tabs.Screen name="vendas" options={{ title: 'Vendas', tabBarIcon: icone('cart-outline', 'cart') }} />
      <Tabs.Screen name="produtos" options={{ title: 'Produtos', tabBarIcon: icone('cube-outline', 'cube') }} />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: icone('calendar-outline', 'calendar'),
          tabBarBadge: pendentesHoje || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.bg, fontWeight: '800' },
        }}
      />
      <Tabs.Screen name="ajustes" options={{ title: 'Menu', tabBarIcon: icone('menu-outline', 'menu') }} />
    </Tabs>
  );
}
