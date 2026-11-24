import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Botao, Card, Titulo } from '../../components/ui';
import { ADMIN_PRINCIPAL, alterarMembro, listarMembros, removerMembro, useConta } from '../../lib/conta';
import { mensagemErro } from '../../lib/supabase';
import type { Membro } from '../../lib/types';
import { colors, radius } from '../../theme';

export default function Usuarios() {
  const { ehAdmin, dono, email } = useConta();
  const [lista, setLista] = useState<Membro[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    if (!dono) return;
    listarMembros(dono)
      .then((l) => {
        setLista(l);
        setErro('');
      })
      .catch((e) => setErro(mensagemErro(e)));
  }, [dono]);

  useFocusEffect(carregar);

  if (!ehAdmin) {
    return (
      <View style={st.centro}>
        <Ionicons name="lock-closed" size={40} color={colors.textSec} />
        <Text style={st.restrito}>Somente o administrador pode gerenciar usuários.</Text>
      </View>
    );
  }

  const fazer = async (fn: () => Promise<void>) => {
    try {
      await fn();
      carregar();
    } catch (e) {
      Alert.alert('Não foi possível alterar', mensagemErro(e));
    }
  };

  const opcoes = (m: Membro) => {
    if (m.email === ADMIN_PRINCIPAL || m.dono) {
      return Alert.alert(m.dono ? 'Dono da loja' : 'Administrador principal', `${m.email} é sempre administrador e não pode ser alterado.`);
    }
    if (m.email === email) return Alert.alert('Sua conta', 'Peça a outro administrador para alterar a sua permissão.');
    Alert.alert(m.nome || m.email, m.email, [
      {
        text: m.admin ? 'Tornar usuário' : 'Tornar administrador',
        onPress: () => fazer(() => alterarMembro(m.id, { admin: !m.admin })),
      },
      {
        text: m.ativo ? 'Desativar acesso' : 'Reativar acesso',
        onPress: () => fazer(() => alterarMembro(m.id, { ativo: !m.ativo })),
      },
      {
        text: 'Remover da equipe',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Remover usuário', `${m.email} deixará de acessar os dados da loja.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Remover', style: 'destructive', onPress: () => fazer(() => removerMembro(m.id)) },
          ]),
      },
      { text: 'Fechar', style: 'cancel' },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Usuários' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Botao label="Novo usuário" icon="person-add" onPress={() => router.push('/usuarios/novo')} />

        <Titulo>Usuários da loja</Titulo>
        {!!erro && (
          <Card style={{ borderColor: colors.warning }}>
            <Text style={{ color: colors.warning, lineHeight: 20 }}>{erro}</Text>
          </Card>
        )}
        {!erro && lista === null && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
        {!erro && lista?.length === 0 && (
          <Card>
            <Text style={{ color: colors.textSec }}>Nenhum usuário cadastrado. Toque em “Novo usuário”.</Text>
          </Card>
        )}
        {lista && lista.length > 0 && (
          <Card style={{ paddingVertical: 4 }}>
            {lista.map((m, k) => (
              <Pressable key={m.id} onPress={() => opcoes(m)} style={({ pressed }) => [k > 0 && st.borda, pressed && { opacity: 0.7 }]}>
                <Linha m={m} voce={m.email === email} />
              </Pressable>
            ))}
          </Card>
        )}
        <Text style={st.nota}>
          Toque em um usuário para trocar a permissão, desativar ou remover. Administradores fazem tudo no app; usuários não
          veem custos e indicadores, não excluem produtos, não cancelam vendas e não alteram a empresa.
        </Text>
      </ScrollView>
    </>
  );
}

function Linha({ m, voce }: { m: Membro; voce: boolean }) {
  const { nome, email, admin, ativo, aceito } = m;
  return (
    <View style={st.linha}>
      <View style={st.avatar}>
        <Ionicons name={admin ? 'shield-checkmark' : 'person'} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
          {nome || email}
          {voce ? ' (você)' : ''}
        </Text>
        {!!nome && <Text style={{ color: colors.textSec, fontSize: 12 }} numberOfLines={1}>{email}</Text>}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={admin ? 'Administrador' : 'Usuário'} color={admin ? colors.primary : colors.textSec} />
          {m.dono && <Badge label="Dono da loja" color={colors.good} icon="star-outline" />}
          {!ativo && <Badge label="Desativado" color={colors.critical} icon="close-circle-outline" />}
          {ativo && !aceito && <Badge label="Aguardando 1º acesso" color={colors.warning} icon="time-outline" />}
        </View>
      </View>
    </View>
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
