import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgendamentoItem } from '../../components/Itens';
import { Botao, Fab, toque, Vazio } from '../../components/ui';
import { DIAS_SEMANA, inicioDoDia, MESES_LONGOS, mesmoDia } from '../../lib/format';
import { useDesktop } from '../../lib/desktop';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function Agenda() {
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  const m = desktop ? 28 : 16;
  const { agendamentos, ordens, cliente, alternarAgendamento } = useDados();
  const [dia, setDia] = useState(inicioDoDia(new Date()));
  const [semanaBase, setSemanaBase] = useState(() => {
    const d = inicioDoDia(new Date());
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase);
    d.setDate(d.getDate() + i);
    return d;
  });

  const temNoDia = (d: Date) =>
    agendamentos.some((a) => mesmoDia(new Date(a.data), d)) ||
    ordens.some((o) => o.previsaoEntrega && !['entregue', 'cancelado'].includes(o.status) && mesmoDia(new Date(o.previsaoEntrega), d));

  const doDia = useMemo(
    () => agendamentos.filter((a) => mesmoDia(new Date(a.data), dia)).sort((a, b) => a.data.localeCompare(b.data)),
    [agendamentos, dia],
  );
  const entregasDoDia = ordens.filter(
    (o) => o.previsaoEntrega && !['entregue', 'cancelado'].includes(o.status) && mesmoDia(new Date(o.previsaoEntrega), dia),
  );

  const pendentesAntigos = agendamentos.filter((a) => !a.concluido && new Date(a.data) < inicioDoDia(new Date())).length;

  const mudarSemana = (delta: number) => {
    toque();
    const d = new Date(semanaBase);
    d.setDate(d.getDate() + delta * 7);
    setSemanaBase(d);
  };

  return (
    <View style={{ flex: 1, paddingTop: desktop ? 24 : insets.top + 12 }}>
      <View style={{ paddingHorizontal: m }}>
        <View style={st.topo}>
          <Text style={st.h1}>Agenda</Text>
          <Pressable
            onPress={() => {
              const h = inicioDoDia(new Date());
              setDia(h);
              const b = new Date(h);
              b.setDate(b.getDate() - b.getDay());
              setSemanaBase(b);
            }}
            style={st.hoje}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Hoje</Text>
          </Pressable>
        </View>
        <View style={st.mesRow}>
          <Pressable onPress={() => mudarSemana(-1)} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={st.mes}>
            {MESES_LONGOS[semana[3].getMonth()]} {semana[3].getFullYear()}
          </Text>
          <Pressable onPress={() => mudarSemana(1)} hitSlop={12}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <View style={st.semana}>
          {semana.map((d) => {
            const ativo = mesmoDia(d, dia);
            const ehHoje = mesmoDia(d, new Date());
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  toque();
                  setDia(d);
                }}
                style={[st.dia, ativo && st.diaAtivo, !ativo && ehHoje && { borderColor: colors.primary }]}
              >
                <Text style={[st.diaSem, ativo && { color: colors.bg }]}>{DIAS_SEMANA[d.getDay()]}</Text>
                <Text style={[st.diaN, ativo && { color: colors.bg }]}>{d.getDate()}</Text>
                <View style={[st.ponto, { backgroundColor: temNoDia(d) ? (ativo ? colors.bg : colors.primary) : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
        {pendentesAntigos > 0 && (
          <View style={st.alerta}>
            <Ionicons name="alert-circle" size={18} color={colors.critical} />
            <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
              {pendentesAntigos} compromisso(s) de dias anteriores ainda não concluídos.
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={doDia}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: m, paddingBottom: 100, paddingTop: 12, ...(desktop && { maxWidth: 900 }) }}
        ListHeaderComponent={
          entregasDoDia.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={st.secao}>Previsões de entrega</Text>
              {entregasDoDia.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => router.push({ pathname: '/ordem/[id]', params: { id: o.id } })}
                  style={st.entrega}
                >
                  <Ionicons name="cube-outline" size={18} color={colors.warning} />
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                    OS #{o.numero} · {o.marca} {o.modelo} — {cliente(o.clienteId)?.nome}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
              {doDia.length > 0 && <Text style={[st.secao, { marginTop: 12 }]}>Compromissos</Text>}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <AgendamentoItem a={item} cliente={cliente(item.clienteId)} onToggle={() => alternarAgendamento(item.id)} />
        )}
        ListEmptyComponent={
          entregasDoDia.length ? undefined : (
            <Vazio icon="calendar-clear-outline" texto="Nada agendado para este dia.">
              <Botao
                label="Novo agendamento"
                icon="add"
                onPress={() => {
                  const d = new Date(dia);
                  d.setHours(9, 0, 0, 0);
                  router.push({ pathname: '/agendamento/novo', params: { data: d.toISOString() } });
                }}
              />
            </Vazio>
          )
        }
      />
      <Fab
        label="Agendar (F6)"
        onPress={() => {
          const d = new Date(dia);
          const agora = new Date();
          d.setHours(mesmoDia(d, agora) ? agora.getHours() + 1 : 9, 0, 0, 0);
          router.push({ pathname: '/agendamento/novo', params: { data: d.toISOString() } });
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800' },
  hoje: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  mesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  mes: { color: colors.text, fontSize: 16, fontWeight: '700' },
  semana: { flexDirection: 'row', gap: 6 },
  dia: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diaAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaSem: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  diaN: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  ponto: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  alerta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.critical + '18',
    borderWidth: 1,
    borderColor: colors.critical + '55',
  },
  secao: { color: colors.textSec, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  entrega: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '55',
    marginBottom: 8,
  },
});
