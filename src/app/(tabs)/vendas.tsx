import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Botao, Busca, Fab, Vazio } from '../../components/ui';
import { CATEGORIA, fmtDataHora, fmtMoeda, mesmoDia, PAGAMENTO } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function Vendas() {
  const insets = useSafeAreaInsets();
  const { vendas, produtos, cliente, adminLiberado } = useDados();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...vendas]
      .filter((v) => !q || `${v.numero} ${cliente(v.clienteId)?.nome ?? ''} ${v.itens.map((i) => i.nome).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [vendas, busca, cliente]);

  const hoje = vendas.filter((v) => v.status === 'concluida' && mesmoDia(new Date(v.data), new Date()));
  const baixo = produtos.filter((p) => p.ativo && p.estoque <= p.estoqueMinimo).length;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={st.h1}>Vendas</Text>
        <View style={st.atalhos}>
          <Atalho icon="cube-outline" label="Produtos" sub={baixo ? `${baixo} com estoque baixo` : `${produtos.length} itens`} alerta={baixo > 0} onPress={() => router.push('/produtos')} />
          <Atalho icon={adminLiberado ? 'stats-chart' : 'lock-closed-outline'} label="Indicadores" sub="Somente admin" onPress={() => router.push('/admin')} />
        </View>
        <View style={st.hoje}>
          <Ionicons name="today-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1 }}>
            Hoje: <Text style={{ fontWeight: '800' }}>{hoje.length}</Text> venda(s)
          </Text>
          {adminLiberado && <Text style={{ color: colors.primary, fontWeight: '800' }}>{fmtMoeda(hoje.reduce((t, v) => t + v.total, 0))}</Text>}
        </View>
        <Busca value={busca} onChangeText={setBusca} placeholder="Buscar por nº, cliente ou produto" />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item: v }) => {
          const cat = CATEGORIA[v.itens[0]?.categoria ?? 'acessorio'];
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/venda/[id]', params: { id: v.id } })}
              style={({ pressed }) => [st.item, pressed && { opacity: 0.75 }, v.status === 'cancelada' && { opacity: 0.5 }]}
            >
              <View style={st.icone}>
                <Ionicons name={cat.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={st.num}>VENDA #{String(v.numero).padStart(4, '0')}</Text>
                  {v.status === 'cancelada' && <Badge label="Cancelada" color={colors.critical} icon="close-circle-outline" />}
                </View>
                <Text style={st.titulo} numberOfLines={1}>
                  {v.itens.map((i) => (i.qtd > 1 ? `${i.qtd}× ${i.nome}` : i.nome)).join(', ')}
                </Text>
                <Text style={st.sub}>
                  {cliente(v.clienteId)?.nome ?? 'Consumidor'} · {PAGAMENTO[v.pagamento]} · {fmtDataHora(v.data)}
                </Text>
              </View>
              <Text style={st.total}>{fmtMoeda(v.total)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Vazio icon="cart-outline" texto="Nenhuma venda registrada ainda.">
            <Botao label="Nova venda" icon="add" onPress={() => router.push('/venda/nova')} />
          </Vazio>
        }
      />
      <Fab icon="cart" onPress={() => router.push('/venda/nova')} />
    </View>
  );
}

function Atalho({ icon, label, sub, onPress, alerta }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; onPress: () => void; alerta?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.atalho, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: alerta ? colors.warning : colors.textSec, fontSize: 11 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  atalhos: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  atalho: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    marginBottom: 10,
  },
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
  num: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  titulo: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.textSec, fontSize: 12 },
  total: { color: colors.text, fontWeight: '800', fontSize: 15 },
});
