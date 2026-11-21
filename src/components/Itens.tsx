import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { diasEntre, fmtData, fmtHora, PRIORIDADE, STATUS, TIPO_AG } from '../lib/format';
import type { Agendamento, Cliente, OrdemServico } from '../lib/types';
import { colors, radius } from '../theme';
import { Badge, toque } from './ui';

export function estaAtrasada(o: OrdemServico) {
  return (
    !!o.previsaoEntrega &&
    !['pronto', 'entregue', 'cancelado'].includes(o.status) &&
    new Date(o.previsaoEntrega).getTime() < Date.now()
  );
}

export function OrdemItem({ o, cliente }: { o: OrdemServico; cliente?: Cliente }) {
  const st = STATUS[o.status];
  const atrasada = estaAtrasada(o);
  const feitos = o.procedimentos.filter((p) => p.feito).length;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ordem/[id]', params: { id: o.id } })}
      style={({ pressed }) => [s.item, pressed && { opacity: 0.75 }]}
    >
      <View style={[s.faixa, { backgroundColor: st.color }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.topo}>
          <Text style={s.numero}>OS #{String(o.numero).padStart(4, '0')}</Text>
          <Badge label={st.label} color={st.color} icon={st.icon} />
        </View>
        <Text style={s.titulo} numberOfLines={1}>
          {o.tipoEquipamento} · {o.marca} {o.modelo}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {cliente?.nome ?? 'Cliente removido'} — {o.defeito}
        </Text>
        <View style={s.rodape}>
          <Meta icon="log-in-outline" txt={fmtData(o.dataEntrada)} />
          {o.previsaoEntrega && (
            <Meta
              icon={atrasada ? 'alert-circle' : 'time-outline'}
              txt={atrasada ? `Atrasada ${diasEntre(new Date(o.previsaoEntrega), new Date())}d` : fmtData(o.previsaoEntrega)}
              cor={atrasada ? colors.critical : undefined}
            />
          )}
          {o.procedimentos.length > 0 && (
            <Meta icon="list-outline" txt={`${feitos}/${o.procedimentos.length}`} />
          )}
          {(o.prioridade === 'alta' || o.prioridade === 'urgente') && (
            <Meta icon="flag" txt={PRIORIDADE[o.prioridade].label} cor={PRIORIDADE[o.prioridade].color} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, txt, cor }: { icon: keyof typeof Ionicons.glyphMap; txt: string; cor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={cor ?? colors.textMuted} />
      <Text style={{ color: cor ?? colors.textMuted, fontSize: 12, fontWeight: cor ? '700' : '500' }}>{txt}</Text>
    </View>
  );
}

export function AgendamentoItem({
  a,
  cliente,
  onToggle,
  mostrarData = false,
}: {
  a: Agendamento;
  cliente?: Cliente;
  onToggle: () => void;
  mostrarData?: boolean;
}) {
  const tipo = TIPO_AG[a.tipo];
  const passou = !a.concluido && new Date(a.data).getTime() < Date.now();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/agendamento/novo', params: { id: a.id } })}
      style={({ pressed }) => [s.item, { alignItems: 'center' }, pressed && { opacity: 0.75 }, a.concluido && { opacity: 0.55 }]}
    >
      <View style={s.hora}>
        <Text style={s.horaTxt}>{fmtHora(a.data)}</Text>
        {mostrarData && <Text style={s.horaData}>{fmtData(a.data).slice(0, 5)}</Text>}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={tipo.icon} size={14} color={colors.primary} />
          <Text style={s.tipo}>{tipo.label}</Text>
          {passou && <Badge label="Pendente" color={colors.critical} icon="alert-circle" />}
        </View>
        <Text style={[s.titulo, a.concluido && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {a.titulo}
        </Text>
        {cliente && <Text style={s.sub}>{cliente.nome}</Text>}
      </View>
      <Pressable
        hitSlop={12}
        onPress={() => {
          toque();
          onToggle();
        }}
        accessibilityLabel={a.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}
      >
        <Ionicons
          name={a.concluido ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={a.concluido ? colors.good : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faixa: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numero: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textSec, fontSize: 13 },
  rodape: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  hora: {
    width: 58,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
  },
  horaTxt: { color: colors.primary, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  horaData: { color: colors.textSec, fontSize: 11, marginTop: 2 },
  tipo: { color: colors.textSec, fontSize: 12, fontWeight: '600' },
});
