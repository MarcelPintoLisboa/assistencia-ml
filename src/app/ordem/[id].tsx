import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AgendamentoItem, estaAtrasada } from '../../components/Itens';
import { Badge, Botao, Card, Linha, Titulo, toque, Vazio } from '../../components/ui';
import { diasEntre, fmtData, fmtDataHora, fmtMoeda, PRIORIDADE, STATUS, STATUS_ORDEM } from '../../lib/format';
import { useDados } from '../../lib/store';
import type { StatusOS } from '../../lib/types';
import { colors, radius } from '../../theme';

const FLUXO: StatusOS[] = ['recebido', 'diagnostico', 'aguardando_aprovacao', 'aguardando_peca', 'em_reparo', 'pronto', 'entregue'];

export default function DetalheOrdem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ordens, agendamentos, cliente, alterarStatus, alternarProcedimento, removerOrdem, alternarAgendamento } = useDados();
  const o = ordens.find((x) => x.id === id);

  if (!o) {
    return <Vazio icon="help-circle-outline" texto="Ordem de serviço não encontrada." />;
  }

  const c = cliente(o.clienteId);
  const st = STATUS[o.status];
  const atrasada = estaAtrasada(o);
  const feitos = o.procedimentos.filter((p) => p.feito).length;
  const idx = FLUXO.indexOf(o.status);
  const proximo = idx >= 0 && idx < FLUXO.length - 1 ? FLUXO[idx + 1] : null;
  const ags = agendamentos.filter((a) => a.ordemId === o.id).sort((a, b) => a.data.localeCompare(b.data));
  const fimGarantia = o.dataSaida && o.garantiaDias ? new Date(new Date(o.dataSaida).getTime() + o.garantiaDias * 86400000) : null;

  const mudar = (s: StatusOS) => {
    toque();
    alterarStatus(o.id, s);
  };

  const escolherStatus = () => {
    if (Platform.OS === 'web') return; // no web usa os chips abaixo
    Alert.alert(
      'Alterar status',
      undefined,
      [...STATUS_ORDEM.filter((s) => s !== o.status).map((s) => ({ text: STATUS[s].label, onPress: () => mudar(s) })), { text: 'Cancelar', style: 'cancel' as const }],
    );
  };

  const whatsapp = () => {
    if (!c?.telefone) return;
    const num = c.telefone.replace(/\D/g, '');
    const msg = `Olá ${c.nome.split(' ')[0]}! Sobre a OS #${o.numero} (${o.marca} ${o.modelo}): status atual "${st.label}".`;
    Linking.openURL(`https://wa.me/${num.length <= 11 ? '55' + num : num}?text=${encodeURIComponent(msg)}`);
  };

  const excluir = () => {
    const fazer = async () => {
      await removerOrdem(o.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir esta ordem de serviço?')) fazer();
      return;
    }
    Alert.alert('Excluir OS', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: fazer },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `OS #${String(o.numero).padStart(4, '0')}`,
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/ordem/nova', params: { id: o.id } })} hitSlop={10}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card style={{ borderColor: st.color + '80' }}>
          <View style={s.topo}>
            <Pressable onPress={escolherStatus}>
              <Badge label={st.label} color={st.color} icon={st.icon} />
            </Pressable>
            <Badge label={`Prioridade ${PRIORIDADE[o.prioridade].label.toLowerCase()}`} color={PRIORIDADE[o.prioridade].color} icon="flag" />
          </View>
          <Text style={s.equip}>{o.tipoEquipamento} · {o.marca} {o.modelo}</Text>
          <Text style={s.defeito}>{o.defeito}</Text>
          {atrasada && (
            <View style={s.alerta}>
              <Ionicons name="alert-circle" size={16} color={colors.critical} />
              <Text style={{ color: colors.text, fontSize: 13 }}>
                Prazo vencido há {diasEntre(new Date(o.previsaoEntrega!), new Date())} dia(s)
              </Text>
            </View>
          )}

          {/* Linha do tempo do fluxo */}
          {o.status !== 'cancelado' && (
            <View style={s.fluxo}>
              {FLUXO.map((f, i) => (
                <View key={f} style={[s.passo, { backgroundColor: i <= idx ? colors.primary : colors.border }]} />
              ))}
            </View>
          )}

          {proximo && (
            <Botao label={`Avançar para "${STATUS[proximo].label}"`} icon="arrow-forward" onPress={() => mudar(proximo)} style={{ marginTop: 14 }} />
          )}
        </Card>

        {Platform.OS === 'web' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {STATUS_ORDEM.filter((x) => x !== o.status).map((x) => (
              <Pressable key={x} onPress={() => mudar(x)} style={s.statusChip}>
                <Text style={{ color: colors.textSec, fontSize: 12 }}>{STATUS[x].label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Titulo>Procedimentos {o.procedimentos.length > 0 && `(${feitos}/${o.procedimentos.length})`}</Titulo>
        <Card style={{ paddingVertical: 6 }}>
          {o.procedimentos.length === 0 ? (
            <Text style={{ color: colors.textSec, paddingVertical: 8 }}>Nenhum procedimento cadastrado. Toque em editar para adicionar.</Text>
          ) : (
            <>
              <View style={s.progresso}>
                <View style={[s.progressoBarra, { width: `${(feitos / o.procedimentos.length) * 100}%` }]} />
              </View>
              {o.procedimentos.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    toque();
                    alternarProcedimento(o.id, p.id);
                  }}
                  style={s.proc}
                >
                  <Ionicons name={p.feito ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={p.feito ? colors.good : colors.textMuted} />
                  <Text style={[{ color: colors.text, flex: 1, fontSize: 15 }, p.feito && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                    {p.descricao}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </Card>

        <Titulo>Cliente</Titulo>
        <Card>
          <Pressable onPress={() => c && router.push({ pathname: '/cliente/[id]', params: { id: c.id } })}>
            <Linha icon="person-outline" label="Nome" valor={c?.nome ?? 'Cliente removido'} />
            <Linha icon="call-outline" label="Telefone" valor={c?.telefone ?? ''} />
          </Pressable>
          {!!c?.telefone && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Botao label="Ligar" variante="secundario" icon="call" onPress={() => Linking.openURL(`tel:${c.telefone.replace(/\D/g, '')}`)} style={{ flex: 1 }} />
              <Botao label="WhatsApp" variante="secundario" icon="logo-whatsapp" onPress={whatsapp} style={{ flex: 1 }} />
            </View>
          )}
        </Card>

        <Titulo>Detalhes</Titulo>
        <Card>
          <Linha icon="barcode-outline" label="Nº série" valor={o.numeroSerie} />
          <Linha icon="bag-outline" label="Acessórios" valor={o.acessorios} />
          <Linha icon="medkit-outline" label="Diagnóstico" valor={o.diagnostico} />
          <Linha icon="log-in-outline" label="Entrada" valor={fmtDataHora(o.dataEntrada)} />
          <Linha icon="time-outline" label="Previsão" valor={fmtDataHora(o.previsaoEntrega)} />
          <Linha icon="log-out-outline" label="Saída" valor={fmtDataHora(o.dataSaida)} />
          <Linha icon="shield-checkmark-outline" label="Garantia" valor={o.garantiaDias ? `${o.garantiaDias} dias${fimGarantia ? ` (até ${fmtData(fimGarantia.toISOString())})` : ''}` : 'Sem garantia'} />
          <Linha icon="pricetag-outline" label="Orçamento" valor={fmtMoeda(o.valorOrcamento)} />
          <Linha icon="cash-outline" label="Valor final" valor={o.valorFinal ? fmtMoeda(o.valorFinal) : '—'} />
        </Card>

        <Titulo acao={{ label: '+ Agendar', onPress: () => router.push({ pathname: '/agendamento/novo', params: { ordemId: o.id } }) }}>
          Agendamentos
        </Titulo>
        {ags.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSec }}>Agende entrega, retirada ou retorno desta OS para receber lembretes.</Text>
          </Card>
        ) : (
          ags.map((a) => <AgendamentoItem key={a.id} a={a} cliente={c} onToggle={() => alternarAgendamento(a.id)} mostrarData />)
        )}

        <Titulo>Histórico</Titulo>
        <Card>
          {[...o.historico].reverse().map((h, i) => (
            <View key={i} style={s.hist}>
              <View style={[s.histPonto, { backgroundColor: STATUS[h.status].color }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{h.nota || STATUS[h.status].label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{fmtDataHora(h.data)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Botao label="Excluir ordem de serviço" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 28 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  equip: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  defeito: { color: colors.textSec, fontSize: 14, marginTop: 4, lineHeight: 20 },
  alerta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.critical + '18',
  },
  fluxo: { flexDirection: 'row', gap: 4, marginTop: 16 },
  passo: { flex: 1, height: 4, borderRadius: 2 },
  statusChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  progresso: { height: 6, backgroundColor: colors.bgAlt, borderRadius: 3, overflow: 'hidden', marginVertical: 10 },
  progressoBarra: { height: 6, backgroundColor: colors.good, borderRadius: 3 },
  proc: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  hist: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  histPonto: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
