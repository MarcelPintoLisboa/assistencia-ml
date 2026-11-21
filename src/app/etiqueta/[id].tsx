import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { EtiquetaPreview } from '../../components/EtiquetaPreview';
import { Botao, Card, Chips, Rotulo, toque, Vazio } from '../../components/ui';
import { celularFormatado, CONTATO } from '../../lib/contato';
import { htmlEtiqueta, mmParaPt, TAMANHOS } from '../../lib/etiqueta';
import { compartilharPdf, imprimir } from '../../lib/imprimir';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function ImprimirEtiqueta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ordens, cliente, modelos, loja } = useDados();
  const { width } = useWindowDimensions();
  const [modeloId, setModeloId] = useState(modelos[0]?.id);
  const [copias, setCopias] = useState(1);
  const o = ordens.find((x) => x.id === id);
  if (!o) return <Vazio icon="help-circle-outline" texto="Ordem de serviço não encontrada." />;

  const m = modelos.find((x) => x.id === modeloId) ?? modelos[0];
  const c = cliente(o.clienteId);
  const contato = `${loja.instagram || '@' + CONTATO.instagram} · ${loja.telefone || celularFormatado()}`;
  const tam = TAMANHOS[m.tamanho];
  const pagina = { width: mmParaPt(tam.w), height: mmParaPt(tam.h) };
  const html = () => htmlEtiqueta(o, c, m, contato, copias);

  return (
    <>
      <Stack.Screen
        options={{
          title: `Etiqueta OS #${o.numero}`,
          headerRight: () => (
            <Pressable onPress={() => router.push('/etiquetas')} hitSlop={10} accessibilityLabel="Personalizar modelos">
              <Ionicons name="color-palette-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={st.palco}>
          <EtiquetaPreview o={o} c={c} m={m} contato={contato} largura={Math.min(width - 64, 420)} />
          <Text style={st.tam}>{tam.label}</Text>
        </View>

        {(o.defeitos ?? []).length === 0 && (
          <Text style={st.aviso}>Dica: marque os defeitos na OS (botão editar) para que apareçam na etiqueta.</Text>
        )}

        <Card style={{ marginTop: 16 }}>
          <Rotulo>Modelo</Rotulo>
          <Chips opcoes={modelos.map((x) => ({ value: x.id, label: x.nome }))} valor={m.id} onChange={setModeloId} />
          <Rotulo>Cópias</Rotulo>
          <View style={st.copias}>
            <Pressable style={st.passo} onPress={() => { toque(); setCopias(Math.max(1, copias - 1)); }}>
              <Ionicons name="remove" size={20} color={colors.primary} />
            </Pressable>
            <Text style={st.copiasN}>{copias}</Text>
            <Pressable style={st.passo} onPress={() => { toque(); setCopias(Math.min(20, copias + 1)); }}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Botao label="Personalizar modelos de etiqueta" variante="secundario" icon="images-outline" onPress={() => router.push('/etiquetas')} />
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Botao label="Imprimir" icon="print" onPress={() => imprimir(html(), pagina)} style={{ flex: 1 }} />
          <Botao label="PDF" variante="secundario" icon="share-social" onPress={() => compartilharPdf(html(), `Etiqueta OS ${o.numero}`, pagina)} style={{ flex: 1 }} />
        </View>
        <Text style={st.nota}>
          Imprime em impressoras compatíveis com o sistema (AirPrint, Mopria, Wi-Fi). Para impressoras térmicas Bluetooth,
          use “PDF” e abra no app da impressora.
        </Text>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  palco: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tam: { color: colors.textMuted, fontSize: 12, marginTop: 14 },
  aviso: { color: colors.warning, fontSize: 13, marginTop: 12 },
  copias: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  passo: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  copiasN: { color: colors.text, fontSize: 22, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  nota: { color: colors.textMuted, fontSize: 12, marginTop: 12, lineHeight: 17 },
});
