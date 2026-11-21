import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GraficoEntradasSaidas, Ponto } from '../../components/GraficoEntradasSaidas';
import { AgendamentoItem, estaAtrasada } from '../../components/Itens';
import { Botao, Card, Chips, Titulo, Vazio } from '../../components/ui';
import { DIAS_SEMANA, diasEntre, fmtMoeda, inicioDoDia, MESES, MESES_LONGOS, mesmoDia, STATUS, STATUS_ORDEM } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Periodo = '7d' | '30d' | '6m';

export default function Painel() {
  const insets = useSafeAreaInsets();
  const { ordens, agendamentos, cliente, alternarAgendamento, carregarExemplo, carregado } = useDados();
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const agora = new Date();

  const ind = useMemo(() => {
    const iniMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const abertas = ordens.filter((o) => !['entregue', 'cancelado', 'pronto'].includes(o.status));
    const entregues = ordens.filter((o) => o.status === 'entregue' && o.dataSaida);
    const entradasMes = ordens.filter((o) => new Date(o.dataEntrada) >= iniMes).length;
    const saidasMes = entregues.filter((o) => new Date(o.dataSaida!) >= iniMes);
    const prontos = ordens.filter((o) => o.status === 'pronto');
    const atrasadas = ordens.filter(estaAtrasada);
    const faturamento = saidasMes.reduce((t, o) => t + (o.valorFinal || o.valorOrcamento), 0);
    const tempos = entregues.slice(0, 30).map((o) => diasEntre(new Date(o.dataEntrada), new Date(o.dataSaida!)));
    const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const porStatus = STATUS_ORDEM.filter((s) => s !== 'entregue' && s !== 'cancelado').map((s) => ({
      s,
      n: ordens.filter((o) => o.status === s).length,
    }));
    return { abertas, entradasMes, saidasMes: saidasMes.length, prontos, atrasadas, faturamento, tempoMedio, porStatus };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordens]);

  const serie: Ponto[] = useMemo(() => {
    const contar = (ini: Date, fim: Date) => ({
      entradas: ordens.filter((o) => { const d = new Date(o.dataEntrada); return d >= ini && d < fim; }).length,
      saidas: ordens.filter((o) => { if (!o.dataSaida || o.status !== 'entregue') return false; const d = new Date(o.dataSaida); return d >= ini && d < fim; }).length,
    });
    const hoje = inicioDoDia(new Date());
    if (periodo === '6m') {
      return Array.from({ length: 6 }, (_, i) => {
        const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
        const fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
        return { label: MESES[ini.getMonth()], detalhe: `${MESES_LONGOS[ini.getMonth()]} ${ini.getFullYear()}`, ...contar(ini, fim) };
      });
    }
    if (periodo === '30d') {
      return Array.from({ length: 5 }, (_, i) => {
        const ini = new Date(hoje); ini.setDate(ini.getDate() - (4 - i) * 7 - 6);
        const fim = new Date(ini); fim.setDate(fim.getDate() + 7);
        const f = new Date(fim); f.setDate(f.getDate() - 1);
        const dm = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
        return { label: dm(ini), detalhe: `${dm(ini)} a ${dm(f)}`, ...contar(ini, fim) };
      });
    }
    return Array.from({ length: 7 }, (_, i) => {
      const ini = new Date(hoje); ini.setDate(ini.getDate() - 6 + i);
      const fim = new Date(ini); fim.setDate(fim.getDate() + 1);
      return { label: DIAS_SEMANA[ini.getDay()], detalhe: `${DIAS_SEMANA[ini.getDay()]} ${ini.getDate()}/${ini.getMonth() + 1}`, ...contar(ini, fim) };
    });
  }, [ordens, periodo]);

  const proximos = useMemo(
    () =>
      agendamentos
        .filter((a) => !a.concluido && (new Date(a.data) >= inicioDoDia(new Date())))
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 4),
    [agendamentos],
  );
  const agHoje = agendamentos.filter((a) => !a.concluido && mesmoDia(new Date(a.data), agora)).length;
  const agAtrasados = agendamentos.filter((a) => !a.concluido && new Date(a.data) < inicioDoDia(agora)).length;
  const procPendentes = ind.abertas.reduce((t, o) => t + o.procedimentos.filter((p) => !p.feito).length, 0);

  const avisos: { icon: IconName; cor: string; texto: string; onPress: () => void }[] = [];
  if (ind.atrasadas.length)
    avisos.push({ icon: 'alert-circle', cor: colors.critical, texto: `${ind.atrasadas.length} OS com prazo de entrega vencido`, onPress: () => router.push({ pathname: '/ordens', params: { filtro: 'atrasadas' } }) });
  if (agAtrasados)
    avisos.push({ icon: 'calendar', cor: colors.serious, texto: `${agAtrasados} agendamento(s) passados sem conclusão`, onPress: () => router.push('/agenda') });
  if (agHoje)
    avisos.push({ icon: 'today', cor: colors.primary, texto: `${agHoje} compromisso(s) para hoje`, onPress: () => router.push('/agenda') });
  const parados = ind.prontos.filter((o) => {
    const ult = o.historico[o.historico.length - 1];
    return ult && diasEntre(new Date(ult.data), agora) >= 7;
  }).length;
  if (parados)
    avisos.push({ icon: 'hourglass', cor: colors.warning, texto: `${parados} equipamento(s) prontos há 7+ dias sem retirada`, onPress: () => router.push({ pathname: '/ordens', params: { filtro: 'pronto' } }) });
  if (procPendentes)
    avisos.push({ icon: 'list', cor: colors.textSec, texto: `${procPendentes} procedimento(s) pendentes nas OS abertas`, onPress: () => router.push('/ordens') });

  const saudacao = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const maxStatus = Math.max(1, ...ind.porStatus.map((p) => p.n));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Hero com a imagem da marca */}
      <View style={[st.hero, { paddingTop: insets.top + 16 }]}>
        <Image source={require('../../../assets/marca.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(5,11,26,0.35)', 'rgba(5,11,26,0.75)', colors.bg]}
          style={StyleSheet.absoluteFill}
        />
        <View style={st.heroTopo}>
          <View style={st.logo}>
            <Ionicons name="build" size={18} color={colors.bg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.marca}>ASSISTÊNCIA ML</Text>
            <Text style={st.nicho}>DRONES & VIDEO GAMES</Text>
          </View>
          <Pressable onPress={() => router.push('/ajustes')} hitSlop={10} style={st.btnContato} accessibilityLabel="Contatos">
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={st.saudacao}>{saudacao}!</Text>
        <Text style={st.data}>
          {DIAS_SEMANA[agora.getDay()]}, {agora.getDate()} de {MESES_LONGOS[agora.getMonth()].toLowerCase()}
        </Text>
        <View style={st.heroResumo}>
          <ResumoHero n={ind.abertas.length} label="em bancada" />
          <View style={st.sep} />
          <ResumoHero n={ind.prontos.length} label="prontos" />
          <View style={st.sep} />
          <ResumoHero n={agHoje} label="hoje na agenda" />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {carregado && ordens.length === 0 ? (
          <Card style={{ marginTop: 8 }}>
            <Vazio icon="rocket-outline" texto="Bem-vindo! Cadastre sua primeira ordem de serviço ou carregue dados de exemplo para conhecer o app.">
              <Botao label="Nova ordem de serviço" icon="add" onPress={() => router.push('/ordem/nova')} style={{ alignSelf: 'stretch' }} />
              <Botao label="Carregar exemplo" variante="secundario" icon="sparkles-outline" onPress={carregarExemplo} style={{ alignSelf: 'stretch' }} />
            </Vazio>
          </Card>
        ) : (
          <>
            {/* Ações rápidas */}
            <View style={st.acoes}>
              <Acao icon="add-circle" label="Nova OS" onPress={() => router.push('/ordem/nova')} />
              <Acao icon="calendar" label="Agendar" onPress={() => router.push('/agendamento/novo')} />
              <Acao icon="person-add" label="Cliente" onPress={() => router.push('/cliente/novo')} />
            </View>

            {avisos.length > 0 && (
              <>
                <Titulo>Avisos</Titulo>
                <Card style={{ paddingVertical: 4 }}>
                  {avisos.map((a, i) => (
                    <Pressable key={i} onPress={a.onPress} style={[st.aviso, i > 0 && st.avisoBorda]}>
                      <Ionicons name={a.icon} size={20} color={a.cor} />
                      <Text style={st.avisoTxt}>{a.texto}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </Card>
              </>
            )}

            <Titulo>Indicadores do mês</Titulo>
            <View style={st.kpis}>
              <Kpi icon="log-in-outline" label="Entradas" valor={String(ind.entradasMes)} />
              <Kpi icon="log-out-outline" label="Saídas" valor={String(ind.saidasMes)} />
              <Kpi icon="cash-outline" label="Faturamento" valor={fmtMoeda(ind.faturamento)} pequeno />
              <Kpi icon="timer-outline" label="Tempo médio" valor={`${ind.tempoMedio.toFixed(1)} dias`} pequeno />
            </View>

            <Titulo>Entradas e saídas</Titulo>
            <Card>
              <Chips<Periodo>
                opcoes={[
                  { value: '7d', label: '7 dias' },
                  { value: '30d', label: '5 semanas' },
                  { value: '6m', label: '6 meses' },
                ]}
                valor={periodo}
                onChange={setPeriodo}
              />
              <GraficoEntradasSaidas dados={serie} />
            </Card>

            <Titulo acao={{ label: 'Ver todas', onPress: () => router.push('/ordens') }}>Equipamentos por etapa</Titulo>
            <Card>
              {ind.porStatus.map(({ s, n }) => (
                <Pressable
                  key={s}
                  style={st.statusLinha}
                  onPress={() => router.push({ pathname: '/ordens', params: { filtro: s } })}
                >
                  <Ionicons name={STATUS[s].icon} size={16} color={STATUS[s].color} />
                  <Text style={st.statusLabel}>{STATUS[s].label}</Text>
                  <View style={st.statusTrilho}>
                    <View style={[st.statusBarra, { width: `${(n / maxStatus) * 100}%`, backgroundColor: STATUS[s].color }]} />
                  </View>
                  <Text style={st.statusN}>{n}</Text>
                </Pressable>
              ))}
            </Card>

            <Titulo acao={{ label: 'Agenda', onPress: () => router.push('/agenda') }}>Próximos compromissos</Titulo>
            {proximos.length === 0 ? (
              <Card>
                <Text style={{ color: colors.textSec }}>Nenhum compromisso agendado.</Text>
              </Card>
            ) : (
              proximos.map((a) => (
                <AgendamentoItem key={a.id} a={a} cliente={cliente(a.clienteId)} onToggle={() => alternarAgendamento(a.id)} mostrarData />
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ResumoHero({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={st.heroN}>{n}</Text>
      <Text style={st.heroLabel}>{label}</Text>
    </View>
  );
}

function Acao({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.acao, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={st.acaoTxt}>{label}</Text>
    </Pressable>
  );
}

function Kpi({ icon, label, valor, pequeno }: { icon: IconName; label: string; valor: string; pequeno?: boolean }) {
  return (
    <View style={st.kpi}>
      <View style={st.kpiIcone}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[st.kpiValor, pequeno && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={st.kpiLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  heroTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logo: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  marca: { color: colors.text, fontWeight: '800', letterSpacing: 2, fontSize: 14 },
  nicho: { color: colors.primary, fontWeight: '700', letterSpacing: 1.5, fontSize: 10, marginTop: 1 },
  btnContato: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(14,26,51,0.8)',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saudacao: { color: colors.text, fontSize: 30, fontWeight: '800' },
  data: { color: colors.textSec, fontSize: 15, marginTop: 2, marginBottom: 20 },
  heroResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,26,51,0.8)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingVertical: 14,
  },
  heroN: { color: colors.primary, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroLabel: { color: colors.textSec, fontSize: 12, marginTop: 2 },
  sep: { width: 1, height: 32, backgroundColor: colors.border },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 4 },
  acao: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acaoTxt: { color: colors.text, fontSize: 13, fontWeight: '600' },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avisoBorda: { borderTopWidth: 1, borderTopColor: colors.border },
  avisoTxt: { color: colors.text, flex: 1, fontSize: 14 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  kpiIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValor: { color: colors.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiLabel: { color: colors.textSec, fontSize: 12, marginTop: 2 },
  statusLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  statusLabel: { color: colors.text, fontSize: 13, width: 120 },
  statusTrilho: { flex: 1, height: 8, backgroundColor: colors.bgAlt, borderRadius: 4, overflow: 'hidden' },
  statusBarra: { height: 8, borderRadius: 4 },
  statusN: { color: colors.text, fontWeight: '700', width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
