import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../../components/ui';
import { novoModelo, TAMANHOS } from '../../lib/etiqueta';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function Modelos() {
  const { modelos, salvarModelo } = useDados();

  const criar = async () => {
    const m = novoModelo();
    await salvarModelo(m);
    router.push({ pathname: '/etiquetas/editar', params: { id: m.id } });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Modelos de etiqueta' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={st.intro}>
          Personalize as etiquetas com sua logo, uma imagem de fundo, cores e o tamanho do papel. Crie quantos modelos quiser
          (ex.: um para drones e outro para games).
        </Text>
        {modelos.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.push({ pathname: '/etiquetas/editar', params: { id: m.id } })}
            style={({ pressed }) => [st.item, pressed && { opacity: 0.75 }]}
          >
            <View style={[st.miniatura, { backgroundColor: m.corFundo, borderColor: m.corDestaque }]}>
              {m.fundo && <Image source={{ uri: m.fundo }} style={[StyleSheet.absoluteFill, { opacity: m.opacidadeFundo }]} contentFit="cover" />}
              {m.logo ? (
                <Image source={{ uri: m.logo }} style={{ width: 40, height: 28 }} contentFit="contain" />
              ) : (
                <Ionicons name="pricetag" size={22} color={m.corDestaque} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.nome}>{m.nome}</Text>
              <Text style={st.sub}>
                {TAMANHOS[m.tamanho].label}
                {m.logo ? ' · com logo' : ''}
                {m.fundo ? ' · com fundo' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
        <Botao label="Novo modelo" icon="add" onPress={criar} style={{ marginTop: 12 }} />
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  intro: { color: colors.textSec, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniatura: {
    width: 72,
    height: 48,
    borderRadius: 6,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.textSec, fontSize: 12, marginTop: 2 },
});
