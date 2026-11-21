import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { prepararNotificacoes } from '../lib/notifications';
import { DataProvider } from '../lib/store';
import { colors } from '../theme';

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  useEffect(() => {
    prepararNotificacoes();
    if (Platform.OS === 'web') return;
    // Ao tocar num aviso, abre a tela correspondente.
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as Record<string, string> | undefined;
      if (data?.ordemId) router.push({ pathname: '/ordem/[id]', params: { id: data.ordemId } });
      else if (data?.agendamentoId) router.push({ pathname: '/agendamento/novo', params: { id: data.agendamentoId } });
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={tema}>
      <DataProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ordem/nova" options={{ title: 'Ordem de serviço', presentation: 'modal' }} />
          <Stack.Screen name="ordem/[id]" options={{ title: 'Detalhes da OS' }} />
          <Stack.Screen name="cliente/novo" options={{ title: 'Cliente', presentation: 'modal' }} />
          <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
          <Stack.Screen name="agendamento/novo" options={{ title: 'Agendamento', presentation: 'modal' }} />
        </Stack>
      </DataProvider>
    </ThemeProvider>
  );
}
