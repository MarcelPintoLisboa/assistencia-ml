import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { conteudoEtiqueta, fonteBase, mostraFicha, TAMANHOS } from '../lib/etiqueta';
import type { Cliente, ModeloEtiqueta, OrdemServico } from '../lib/types';

/** Prévia em tela da etiqueta — espelha o layout do HTML impresso. */
export function EtiquetaPreview({
  o,
  c,
  m,
  contato,
  largura,
}: {
  o: OrdemServico;
  c?: Cliente;
  m: ModeloEtiqueta;
  contato: string;
  largura: number;
}) {
  const { w, h } = TAMANHOS[m.tamanho];
  const larguraReal = Math.min(largura, m.tamanho === '100x150' ? largura * 0.7 : largura);
  const px = larguraReal / w; // pixels por mm
  const pt = px * 0.3528; // 1pt = 0.3528mm
  const f = fonteBase(m.tamanho) * pt;
  const d = conteudoEtiqueta(o, c);
  const txt = { color: m.corTexto, fontSize: f };

  const linha = (rot: string, val: string) =>
    val ? (
      <Text key={rot} style={txt} numberOfLines={1}>
        <Text style={{ fontWeight: '700', color: m.corDestaque }}>{rot}: </Text>
        {val}
      </Text>
    ) : null;

  return (
    <View style={[st.sombra, { width: larguraReal, height: h * px, backgroundColor: m.corFundo, alignSelf: 'center' }]}>
      {m.fundo && (
        <Image source={{ uri: m.fundo }} style={[StyleSheet.absoluteFill, { opacity: m.opacidadeFundo }]} contentFit="cover" />
      )}
      <View style={{ padding: 2 * px, paddingHorizontal: 2.2 * px, flex: 1, gap: 0.6 * px }}>
        <View style={[st.topo, { borderBottomColor: m.corDestaque, borderBottomWidth: 0.4 * px, paddingBottom: 0.8 * px, gap: 1.5 * px }]}>
          {m.logo && <Image source={{ uri: m.logo }} style={{ height: f * 2.4, width: w * px * 0.25 }} contentFit="contain" />}
          <Text style={[txt, { flex: 1, fontWeight: '700', fontSize: f * 0.85 }]} numberOfLines={1}>
            {m.titulo}
          </Text>
          <View style={{ backgroundColor: m.corDestaque, borderRadius: px, paddingHorizontal: 1.4 * px, paddingVertical: 0.4 * px }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: f * 1.15 }}>{d.numero}</Text>
          </View>
        </View>
        <Text style={[txt, { fontWeight: '800', fontSize: f * 1.1 }]} numberOfLines={1}>
          {d.equipamento}
        </Text>
        {d.defeitos.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0.8 * px }}>
            {d.defeitos.map((x) => (
              <View key={x} style={{ borderWidth: Math.max(0.5, 0.3 * px), borderColor: m.corDestaque, borderRadius: 3 * px, paddingHorizontal: 1.2 * px }}>
                <Text style={[txt, { fontWeight: '700', fontSize: f * 0.9 }]}>{x}</Text>
              </View>
            ))}
          </View>
        )}
        {mostraFicha(m) && d.ficha.map((l) => linha(l.rot, l.val))}
        {m.mostrar.descricao && !!d.descricao && (
          <Text style={[txt, { fontStyle: 'italic' }]} numberOfLines={2}>
            {d.descricao}
          </Text>
        )}
        {m.mostrar.cliente && linha('Cliente', d.cliente)}
        {m.mostrar.telefone && linha('Tel', d.telefone)}
        {m.mostrar.datas && linha('Entrada', d.entrada + (d.previsao ? `  ·  Prev.: ${d.previsao}` : ''))}
        {m.mostrar.serie && linha('Série', d.serie)}
        {m.mostrar.acessorios && linha('Acess.', d.acessorios)}
        {(!!m.rodape || (m.mostrar.contato && !!contato)) && (
          <Text style={[txt, { marginTop: 'auto', textAlign: 'center', fontSize: f * 0.8, opacity: 0.85 }]} numberOfLines={1}>
            {[m.rodape, m.mostrar.contato ? contato : ''].filter(Boolean).join('  ·  ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  sombra: {
    overflow: 'hidden',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  topo: { flexDirection: 'row', alignItems: 'center' },
});
