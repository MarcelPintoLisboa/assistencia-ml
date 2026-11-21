import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, Busca, Fab, Vazio } from '../../components/ui';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function Clientes() {
  const insets = useSafeAreaInsets();
  const { clientes, ordens } = useDados();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes
      .filter((c) => !q || `${c.nome} ${c.telefone} ${c.email}`.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes, busca]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={st.h1}>Clientes</Text>
        <Busca value={busca} onChangeText={setBusca} placeholder="Buscar por nome, telefone ou e-mail" />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const os = ordens.filter((o) => o.clienteId === item.id);
          const abertas = os.filter((o) => !['entregue', 'cancelado'].includes(o.status)).length;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: item.id } })}
              style={({ pressed }) => [st.item, pressed && { opacity: 0.75 }]}
            >
              <View style={st.avatar}>
                <Text style={st.avatarTxt}>
                  {item.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.nome}>{item.nome}</Text>
                <Text style={st.sub}>{item.telefone || item.email || 'Sem contato'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.n}>{os.length} OS</Text>
                {abertas > 0 && <Text style={{ color: colors.primary, fontSize: 11 }}>{abertas} aberta(s)</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Vazio icon="people-outline" texto="Nenhum cliente cadastrado ainda.">
            <Botao label="Cadastrar cliente" icon="person-add" onPress={() => router.push('/cliente/novo')} />
          </Vazio>
        }
      />
      <Fab icon="person-add" onPress={() => router.push('/cliente/novo')} />
    </View>
  );
}

const st = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: colors.primary, fontWeight: '800' },
  nome: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textSec, fontSize: 13, marginTop: 2 },
  n: { color: colors.text, fontWeight: '700', fontSize: 13 },
});
