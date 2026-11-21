import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { compartilharPdf, imprimir } from '../lib/imprimir';
import { colors, radius } from '../theme';
import { toque } from './ui';

type IconName = keyof typeof Ionicons.glyphMap;

export interface Doc {
  titulo: string;
  descricao: string;
  icon: IconName;
  cor: string;
  html: () => string;
  destaque?: boolean;
}

/** Lista de documentos com ações de imprimir e gerar PDF. */
export function ListaDocumentos({ docs }: { docs: Doc[] }) {
  return (
    <View style={{ gap: 10 }}>
      {docs.map((d) => (
        <View key={d.titulo} style={[st.doc, d.destaque && { borderColor: d.cor }]}>
          <View style={[st.icone, { backgroundColor: d.cor + '22' }]}>
            <Ionicons name={d.icon} size={22} color={d.cor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.titulo}>{d.titulo}</Text>
            <Text style={st.desc}>{d.descricao}</Text>
          </View>
          <Pressable
            hitSlop={8}
            style={st.acao}
            accessibilityLabel={`Imprimir ${d.titulo}`}
            onPress={() => {
              toque();
              imprimir(d.html());
            }}
          >
            <Ionicons name="print-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            hitSlop={8}
            style={st.acao}
            accessibilityLabel={`Compartilhar PDF de ${d.titulo}`}
            onPress={() => {
              toque();
              compartilharPdf(d.html(), d.titulo);
            }}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icone: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: colors.text, fontWeight: '700', fontSize: 14 },
  desc: { color: colors.textSec, fontSize: 12, marginTop: 2 },
  acao: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
