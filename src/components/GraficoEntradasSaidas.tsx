import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export interface Ponto {
  label: string;
  detalhe: string;
  entradas: number;
  saidas: number;
}

const ALTURA = 150;

/** Barras agrupadas: entradas x saídas por período. Toque numa coluna para ver os valores. */
export function GraficoEntradasSaidas({ dados }: { dados: Ponto[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const max = Math.max(1, ...dados.map((d) => Math.max(d.entradas, d.saidas)));
  const topo = Math.max(2, Math.ceil(max / 2) * 2);
  const linhas = [topo, topo / 2, 0];
  const p = sel != null ? dados[sel] : null;

  return (
    <View>
      <View style={st.cabecalho}>
        <View style={st.legenda}>
          <Legenda cor={colors.seriesIn} texto="Entradas" />
          <Legenda cor={colors.seriesOut} texto="Saídas" />
        </View>
        <Pressable onPress={() => setTabela(!tabela)} hitSlop={8}>
          <Text style={st.link}>{tabela ? 'Ver gráfico' : 'Ver tabela'}</Text>
        </Pressable>
      </View>

      {tabela ? (
        <View>
          <View style={[st.tr, st.trHead]}>
            <Text style={[st.td, st.th, { flex: 2 }]}>Período</Text>
            <Text style={[st.td, st.th]}>Entradas</Text>
            <Text style={[st.td, st.th]}>Saídas</Text>
            <Text style={[st.td, st.th]}>Saldo</Text>
          </View>
          {dados.map((d) => (
            <View key={d.detalhe} style={st.tr}>
              <Text style={[st.td, { flex: 2, textAlign: 'left' }]}>{d.detalhe}</Text>
              <Text style={st.td}>{d.entradas}</Text>
              <Text style={st.td}>{d.saidas}</Text>
              <Text style={st.td}>{d.entradas - d.saidas > 0 ? '+' : ''}{d.entradas - d.saidas}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={st.tooltip}>
            {p ? (
              <Text style={st.tooltipTxt}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{p.detalhe}</Text>
                {'   '}Entradas <Text style={st.num}>{p.entradas}</Text>
                {'   '}Saídas <Text style={st.num}>{p.saidas}</Text>
              </Text>
            ) : (
              <Text style={[st.tooltipTxt, { color: colors.textMuted }]}>Toque numa coluna para ver os valores</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ height: ALTURA, justifyContent: 'space-between', marginRight: 6 }}>
              {linhas.map((v) => (
                <Text key={v} style={st.eixo}>{v}</Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <View style={[StyleSheet.absoluteFill, { height: ALTURA, justifyContent: 'space-between' }]}>
                {linhas.map((v) => (
                  <View key={v} style={[st.grade, v === 0 && st.base]} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', height: ALTURA, alignItems: 'flex-end' }}>
                {dados.map((d, i) => {
                  const ativo = sel === i;
                  const esmaecer = sel != null && !ativo;
                  return (
                    <Pressable
                      key={d.detalhe}
                      onPress={() => setSel(ativo ? null : i)}
                      style={[st.grupo, ativo && st.grupoAtivo]}
                      accessibilityLabel={`${d.detalhe}: ${d.entradas} entradas, ${d.saidas} saídas`}
                    >
                      <View style={[st.barra, { height: (d.entradas / topo) * ALTURA, backgroundColor: colors.seriesIn, opacity: esmaecer ? 0.4 : 1 }]} />
                      <View style={[st.barra, { height: (d.saidas / topo) * ALTURA, backgroundColor: colors.seriesOut, opacity: esmaecer ? 0.4 : 1 }]} />
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {dados.map((d) => (
                  <Text key={d.detalhe} style={st.rotulo}>{d.label}</Text>
                ))}
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cor }} />
      <Text style={{ color: colors.textSec, fontSize: 12, fontWeight: '600' }}>{texto}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legenda: { flexDirection: 'row', gap: 14 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  tooltip: { height: 26, justifyContent: 'center', marginBottom: 6 },
  tooltipTxt: { color: colors.textSec, fontSize: 12 },
  num: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eixo: { color: colors.textMuted, fontSize: 10, textAlign: 'right', minWidth: 18, fontVariant: ['tabular-nums'] },
  grade: { height: 1, backgroundColor: colors.border, opacity: 0.5 },
  base: { opacity: 1, backgroundColor: colors.textMuted },
  grupo: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 6,
  },
  grupoAtivo: { backgroundColor: colors.primary + '12' },
  barra: { width: '28%', maxWidth: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 0 },
  rotulo: { flex: 1, color: colors.textMuted, fontSize: 10, textAlign: 'center' },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  trHead: { borderBottomColor: colors.textMuted },
  td: { flex: 1, color: colors.text, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] },
  th: { color: colors.textSec, fontWeight: '700', fontSize: 12 },
});
