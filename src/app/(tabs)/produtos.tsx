import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Botao, Busca, Chips, Vazio } from '../../components/ui';
import { CATEGORIA, fmtMoeda } from '../../lib/format';
import { useDados } from '../../lib/store';
import type { CategoriaProduto } from '../../lib/types';
import { colors, radius } from '../../theme';

type Filtro = 'todos' | 'baixo' | CategoriaProduto;

export default function Produtos() {
  const insets = useSafeAreaInsets();
  const { produtos: todos, ehAdmin } = useDados();
  // produtos excluídos (exclusão lógica) não aparecem
  const produtos = useMemo(() => todos.filter((p) => !p.excluido), [todos]);
  const baixos = produtos.filter((p) => p.ativo && p.estoque <= p.estoqueMinimo).length;
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (filtro === 'todos' ? true : filtro === 'baixo' ? p.estoque <= p.estoqueMinimo : p.categoria === filtro))
      .filter((p) => !q || `${p.nome} ${p.marca} ${p.sku}`.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos, busca, filtro]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={st.h1}>Produtos</Text>
        <Botao label="Novo produto" icon="add" onPress={() => router.push('/produtos/editar')} style={{ marginBottom: 10 }} />
        <Text style={{ color: baixos ? colors.warning : colors.textSec, marginBottom: 10 }}>
          {produtos.length} produto(s){baixos ? ` · ${baixos} com estoque baixo` : ''}
        </Text>
        <Busca value={busca} onChangeText={setBusca} placeholder="Buscar produto, marca ou SKU" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Chips<Filtro>
          opcoes={[
            { value: 'todos', label: 'Todos' },
            { value: 'baixo', label: 'Estoque baixo', color: colors.warning },
            ...(Object.keys(CATEGORIA) as CategoriaProduto[]).map((c) => ({ value: c as Filtro, label: CATEGORIA[c].label })),
          ]}
          valor={filtro}
          onChange={setFiltro}
        />
      </ScrollView>
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item: p }) => {
          const baixo = p.estoque <= p.estoqueMinimo;
          const margem = p.preco ? Math.round(((p.preco - p.custo) / p.preco) * 100) : 0;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/produtos/editar', params: { id: p.id } })}
              style={({ pressed }) => [st.item, pressed && { opacity: 0.75 }, !p.ativo && { opacity: 0.5 }]}
            >
              <View style={st.icone}>
                <Ionicons name={CATEGORIA[p.categoria].icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.nome} numberOfLines={1}>
                  {p.nome}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={p.estoque <= 0 ? 'Sem estoque' : `${p.estoque} un.`} color={p.estoque <= 0 ? colors.critical : baixo ? colors.warning : colors.primary} icon={baixo ? 'alert-circle' : 'cube-outline'} />
                  {p.usado && <Badge label="Seminovo" color={colors.textMuted} />}
                  {ehAdmin && <Text style={{ color: colors.textSec, fontSize: 12 }}>Custo {fmtMoeda(p.custo)} · margem {margem}%</Text>}
                </View>
              </View>
              <Text style={st.preco}>{fmtMoeda(p.preco)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Vazio icon="cube-outline" texto="Nenhum produto cadastrado.">
            <Botao label="Cadastrar produto" icon="add" onPress={() => router.push('/produtos/editar')} />
          </Vazio>
        }
      />
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
  icone: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  nome: { color: colors.text, fontWeight: '700', fontSize: 15 },
  preco: { color: colors.text, fontWeight: '800' },
});
