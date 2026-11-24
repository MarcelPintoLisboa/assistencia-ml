import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, Busca, Card, Titulo } from '../components/ui';
import { listarEmpresas, useConta } from '../lib/conta';
import { mensagemErro } from '../lib/supabase';
import type { Empresa } from '../lib/types';
import { colors, radius } from '../theme';

// Somente administrador geral: todas as empresas e os acessos de cada uma.
export default function Acessos() {
  const { ehAdminGeral, dono } = useConta();
  const [lista, setLista] = useState<Empresa[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => {
    if (!ehAdminGeral) return;
    listarEmpresas()
      .then((l) => {
        setLista(l);
        setErro('');
      })
      .catch((e) => setErro(mensagemErro(e)));
  }, [ehAdminGeral]);

  useFocusEffect(carregar);

  if (!ehAdminGeral) {
    return (
      <View style={st.centro}>
        <Ionicons name="lock-closed" size={40} color={colors.textSec} />
        <Text style={st.restrito}>Somente o administrador geral pode liberar acessos.</Text>
      </View>
    );
  }

  const termo = busca.trim().toLowerCase();
  const filtradas = (lista ?? []).filter(
    (e) => !termo || e.nome.toLowerCase().includes(termo) || e.donoEmail.toLowerCase().includes(termo),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Botao label="Liberar novo acesso" icon="person-add" onPress={() => router.push('/usuarios/novo')} />

      <Titulo>Empresas</Titulo>
      {!!lista && lista.length > 5 && <Busca value={busca} onChangeText={setBusca} placeholder="Buscar empresa ou e-mail" />}
      {!!erro && (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ color: colors.warning, lineHeight: 20 }}>{erro}</Text>
        </Card>
      )}
      {!erro && lista === null && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
      {filtradas.length > 0 && (
        <Card style={{ paddingVertical: 4 }}>
          {filtradas.map((e, k) => (
            <Pressable
              key={e.id}
              onPress={() => router.push({ pathname: '/usuarios', params: { empresa: e.id, nome: e.nome || e.donoEmail } })}
              style={({ pressed }) => [st.linha, k > 0 && st.borda, pressed && { opacity: 0.7 }]}
            >
              <View style={st.avatar}>
                <Ionicons name="business" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {e.nome || 'Empresa sem nome'}
                  {e.id === dono ? ' (sua)' : ''}
                </Text>
                <Text style={{ color: colors.textSec, fontSize: 12 }} numberOfLines={1}>
                  {e.donoEmail} · {e.usuarios} {e.usuarios === 1 ? 'usuário' : 'usuários'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>
      )}
      <Text style={st.nota}>
        Ao liberar um acesso você informa o e-mail e uma senha provisória e escolhe a empresa (ou cria uma nova). No
        primeiro acesso a pessoa cria a própria senha. Os administradores de cada empresa podem adicionar e remover
        usuários da empresa deles.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  restrito: { color: colors.textSec, textAlign: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borda: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  nota: { color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 18 },
});
