import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export interface Barra {
  label: string;
  detalhe: string;
  valor: number;
}

const ALTURA = 140;

/** Barras de uma série (ex.: faturamento por período). Toque para ver o valor. */
export function GraficoBarras({ dados, formatar }: { dados: Barra[]; formatar: (v: number) => string }) {
  const [sel, setSel] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const p = sel != null ? dados[sel] : null;

  return (
    <View>
      <View style={st.cab}>
        <Text style={st.info} numberOfLines={1}>
          {p ? (
            <>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{p.detalhe}</Text>
              {'  '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>{formatar(p.valor)}</Text>
            </>
          ) : (
            'Toque numa coluna para ver o valor'
          )}
        </Text>
        <Pressable onPress={() => setTabela(!tabela)} hitSlop={8}>
          <Text style={st.link}>{tabela ? 'Ver gráfico' : 'Ver tabela'}</Text>
        </Pressable>
      </View>
      {tabela ? (
        dados.map((d) => (
          <View key={d.detalhe} style={st.tr}>
            <Text style={[st.td, { textAlign: 'left' }]}>{d.detalhe}</Text>
            <Text style={st.td}>{formatar(d.valor)}</Text>
          </View>
        ))
      ) : (
        <>
          <View style={{ height: ALTURA, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.textMuted }}>
            {dados.map((d, i) => (
              <Pressable
                key={d.detalhe}
                onPress={() => setSel(sel === i ? null : i)}
                style={[st.col, sel === i && { backgroundColor: colors.primary + '12' }]}
                accessibilityLabel={`${d.detalhe}: ${formatar(d.valor)}`}
              >
                <View
                  style={[
                    st.barra,
                    { height: (d.valor / max) * (ALTURA - 8), opacity: sel != null && sel !== i ? 0.4 : 1 },
                  ]}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {dados.map((d) => (
              <Text key={d.detalhe} style={st.rot}>
                {d.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  info: { color: colors.textMuted, fontSize: 12, flex: 1 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', borderRadius: 6 },
  barra: { width: '55%', maxWidth: 26, backgroundColor: colors.seriesIn, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  rot: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 10 },
  tr: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  td: { flex: 1, color: colors.text, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
