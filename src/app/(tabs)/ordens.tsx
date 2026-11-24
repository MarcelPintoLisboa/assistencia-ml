import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estaAtrasada, OrdemItem } from '../../components/Itens';
import { Botao, Busca, Chips, Fab, Vazio } from '../../components/ui';
import { STATUS, STATUS_ORDEM } from '../../lib/format';
import { useDados } from '../../lib/store';
import { useDesktop, useGrade } from '../../lib/desktop';
import { colors } from '../../theme';

type Filtro = 'abertas' | 'atrasadas' | 'todas' | (typeof STATUS_ORDEM)[number];

export default function Ordens() {
  const insets = useSafeAreaInsets();
  const g = useGrade(420);
  const desktop = useDesktop();
  const params = useLocalSearchParams<{ filtro?: string }>();
  const { ordens, cliente } = useDados();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>((params.filtro as Filtro) || 'abertas');
  const [filtroParam, setFiltroParam] = useState(params.filtro);
  if (params.filtro !== filtroParam) {
    setFiltroParam(params.filtro);
    if (params.filtro) setFiltro(params.filtro as Filtro);
  }

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordens
      .filter((o) => {
        if (filtro === 'abertas') return !['entregue', 'cancelado'].includes(o.status);
        if (filtro === 'atrasadas') return estaAtrasada(o);
        if (filtro === 'todas') return true;
        return o.status === filtro;
      })
      .filter((o) => {
        if (!q) return true;
        const c = cliente(o.clienteId);
        return [String(o.numero), o.marca, o.modelo, o.tipoEquipamento, o.defeito, o.numeroSerie, c?.nome, c?.telefone]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  }, [ordens, filtro, busca, cliente]);

  const opcoes: { value: Filtro; label: string; color?: string }[] = [
    { value: 'abertas', label: 'Abertas' },
    { value: 'atrasadas', label: 'Atrasadas', color: colors.critical },
    ...STATUS_ORDEM.map((s) => ({ value: s as Filtro, label: STATUS[s].label, color: STATUS[s].color })),
    { value: 'todas', label: 'Todas' },
  ];

  return (
    <View style={{ flex: 1, paddingTop: desktop ? 24 : insets.top + 12 }}>
      <View style={g.conteudo}>
        <Text style={st.h1}>Ordens de serviço</Text>
        <Busca value={busca} onChangeText={setBusca} placeholder="Buscar por nº, cliente, modelo, série…" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={[st.filtros, g.conteudo]}>
        <Chips opcoes={opcoes} valor={filtro} onChange={setFiltro} />
      </ScrollView>
      <FlatList
        {...g.lista}
        data={lista}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[{ paddingBottom: 100 }, g.conteudo]}
        renderItem={({ item }) => (
          <View style={g.celula}>
            <OrdemItem o={item} cliente={cliente(item.clienteId)} />
          </View>
        )}
        ListHeaderComponent={<Text style={st.contagem}>{lista.length} ordem(ns)</Text>}
        ListEmptyComponent={
          <Vazio icon="construct-outline" texto="Nenhuma ordem encontrada neste filtro.">
            <Botao label="Nova ordem de serviço" icon="add" onPress={() => router.push('/ordem/nova')} />
          </Vazio>
        }
      />
      <Fab label="Nova OS (F2)" onPress={() => router.push('/ordem/nova')} />
    </View>
  );
}

const st = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  filtros: { paddingHorizontal: 16, paddingTop: 12 },
  contagem: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
});
