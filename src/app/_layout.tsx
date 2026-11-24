import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { AlertaWebHost } from '../components/AlertaWeb';
import Login from '../components/Login';
import { MenuLateral } from '../components/MenuLateral';
import { useDesktop } from '../lib/desktop';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EstadoConta } from '../components/EstadoConta';
import { TrocarSenha } from '../components/TrocarSenha';
import { AuthProvider, useAuth } from '../lib/auth';
import { ContaProvider, useConta } from '../lib/conta';
import { prepararNotificacoes } from '../lib/notifications';
import { DataProvider, useDados } from '../lib/store';
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
      <AuthProvider>
        <StatusBar style="light" />
        <Portao />
        <AlertaWebHost />
      </AuthProvider>
    </ThemeProvider>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
      {children}
    </View>
  );
}

// Sem login: tela de entrar. Com login: descobre a loja do usuário e se ele é admin, depois carrega os dados.
function Portao() {
  const { pronto, user } = useAuth();
  if (!pronto) return <Centro><ActivityIndicator color={colors.primary} size="large" /></Centro>;
  if (!user) return <Login />;
  return (
    <ContaProvider key={user.id}>
      <PortaoConta />
    </ContaProvider>
  );
}

function PortaoConta() {
  const conta = useConta();
  if (!conta.pronta) return <Centro><ActivityIndicator color={colors.primary} size="large" /></Centro>;
  if (conta.erro || conta.situacao !== 'ok' || !conta.dono) return <EstadoConta />;
  if (conta.trocarSenha) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><TrocarSenha primeiroAcesso /></SafeAreaView>;
  return (
    <DataProvider key={conta.dono}>
      <Carregamento />
    </DataProvider>
  );
}

function Carregamento() {
  const { carregado, erroCarga, recarregar } = useDados();
  const { sair } = useAuth();
  const desktop = useDesktop();
  if (!carregado) {
    return (
      <Centro>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ marginTop: 12, color: colors.textSec }}>Carregando seus dados…</Text>
      </Centro>
    );
  }
  if (erroCarga) {
    return (
      <Centro>
        <Ionicons name="cloud-offline" size={48} color={colors.textSec} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>Sem conexão</Text>
        <Text style={{ color: colors.textSec, textAlign: 'center', marginTop: 6 }}>{erroCarga}</Text>
        <Pressable
          onPress={recarregar}
          style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 20 }}
        >
          <Text style={{ color: colors.bg, fontWeight: '800' }}>Tentar de novo</Text>
        </Pressable>
        <Pressable onPress={sair} style={{ marginTop: 14 }}>
          <Text style={{ color: colors.primary }}>Sair da conta</Text>
        </Pressable>
      </Centro>
    );
  }
  const pilha = (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text, fontWeight: '700', ...(desktop && { fontSize: 20 }) },
            // desktop: formulários e detalhes centralizados, sem esticar na tela inteira
            contentStyle: desktop
              ? { backgroundColor: colors.bg, width: '100%', maxWidth: 1000, alignSelf: 'center' }
              : { backgroundColor: colors.bg },
            headerShadowVisible: desktop,
            animation: desktop ? 'none' : undefined,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
          <Stack.Screen name="ordem/nova" options={{ title: 'Ordem de serviço', presentation: 'modal' }} />
          <Stack.Screen name="ordem/[id]" options={{ title: 'Detalhes da OS' }} />
          <Stack.Screen name="cliente/novo" options={{ title: 'Cliente', presentation: 'modal' }} />
          <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
          <Stack.Screen name="agendamento/novo" options={{ title: 'Agendamento', presentation: 'modal' }} />
          <Stack.Screen name="clientes" options={{ title: 'Clientes' }} />
          <Stack.Screen name="venda/nova" options={{ title: 'Nova venda', presentation: 'modal' }} />
          <Stack.Screen name="venda/[id]" options={{ title: 'Venda' }} />
          <Stack.Screen name="produtos/editar" options={{ title: 'Produto', presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ title: 'Painel do administrador' }} />
          <Stack.Screen name="etiqueta/[id]" options={{ title: 'Etiqueta' }} />
          <Stack.Screen name="etiquetas/index" options={{ title: 'Modelos de etiqueta' }} />
          <Stack.Screen name="etiquetas/editar" options={{ title: 'Personalizar etiqueta' }} />
          <Stack.Screen name="loja" options={{ title: 'Empresa e documentos' }} />
          <Stack.Screen name="usuarios/index" options={{ title: 'Usuários' }} />
          <Stack.Screen name="usuarios/novo" options={{ title: 'Novo acesso', presentation: 'modal' }} />
          <Stack.Screen name="acessos" options={{ title: 'Empresas e acessos' }} />
          <Stack.Screen name="senha" options={{ title: 'Trocar senha', presentation: 'modal' }} />
        </Stack>
  );
  if (!desktop) return pilha;
  // Desktop: menu lateral fixo + conteúdo
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <MenuLateral />
      <View style={{ flex: 1 }}>{pilha}</View>
    </View>
  );
}
