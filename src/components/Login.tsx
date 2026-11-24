import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { mensagemErro } from '../lib/supabase';
import { colors, radius } from '../theme';

// Tela de entrada (aparece quando não há usuário logado)
export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async () => {
    setErro('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/marca.png')} style={s.marca} contentFit="cover" />
          <Text style={s.app}>Assistência ML</Text>
          <Text style={s.sub}>Ordens, clientes e vendas salvos na nuvem.</Text>

          <View style={s.card}>
            <Text style={s.titulo}>Entrar</Text>

            <Text style={s.label}>E-mail</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail} placeholder="voce@exemplo.com"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
              textContentType="emailAddress" placeholderTextColor={colors.textMuted}
            />

            <Text style={s.label}>Senha</Text>
            <View style={s.senhaBox}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} value={senha} onChangeText={setSenha}
                placeholder="mínimo 6 caracteres" secureTextEntry={!verSenha} autoCapitalize="none"
                textContentType="password" placeholderTextColor={colors.textMuted}
                onSubmitEditing={enviar} returnKeyType="go"
              />
              <Pressable onPress={() => setVerSenha((v) => !v)} hitSlop={8} style={{ paddingHorizontal: 12 }}>
                <Ionicons name={verSenha ? 'eye-off' : 'eye'} size={20} color={colors.textSec} />
              </Pressable>
            </View>

            {erro ? <Text style={s.erro}>{erro}</Text> : null}

            <Pressable onPress={enviar} disabled={enviando} style={({ pressed }) => [s.botao, (pressed || enviando) && { opacity: 0.8 }]}>
              {enviando ? <ActivityIndicator color={colors.bg} /> : <Text style={s.botaoTxt}>Entrar</Text>}
            </Pressable>

            <Text style={s.trocar}>
              Sem acesso? O administrador libera seu e-mail com uma senha provisória. No primeiro acesso você cria a sua
              própria senha.
            </Text>
          </View>
          <Text style={s.rodape}>ML Softwares</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  marca: { width: '100%', height: 150, borderRadius: radius.lg, marginBottom: 18 },
  app: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textSec, textAlign: 'center', marginTop: 6, marginBottom: 22 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.border },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSec, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: colors.text, backgroundColor: colors.bgAlt, marginBottom: 14,
  },
  senhaBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.bgAlt, marginBottom: 14,
  },
  erro: { color: colors.critical, marginBottom: 12 },
  botao: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  botaoTxt: { color: colors.bg, fontWeight: '800', fontSize: 16 },
  trocar: { textAlign: 'center', color: colors.textSec, marginTop: 16, fontSize: 13, lineHeight: 19 },
  rodape: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 12 },
});
