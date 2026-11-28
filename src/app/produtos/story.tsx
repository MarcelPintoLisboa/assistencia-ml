import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, PixelRatio, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { STORY, StoryProduto } from '../../components/StoryProduto';
import { Botao, Vazio } from '../../components/ui';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

const web = Platform.OS === 'web';

export default function StoryDoProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { produtos, loja } = useDados();
  const p = produtos.find((x) => x.id === id);
  const { width, height } = useWindowDimensions();
  const alvo = useRef<ComponentRef<typeof View>>(null);
  const [gerando, setGerando] = useState(false);

  if (!p) return <Vazio icon="cube-outline" texto="Produto não encontrado." />;

  // Arte em tamanho real: 1080 × 1920 pixels físicos (largura lógica = 1080 / densidade da tela)
  const larguraReal = 1080 / PixelRatio.get();
  const u = larguraReal / STORY.w;
  const alturaReal = STORY.h * u;
  // prévia reduzida para caber na tela
  const escala = Math.min((Math.min(width, 520) - 32) / larguraReal, (height * 0.66) / alturaReal);

  const gerar = async () => {
    if (!alvo.current) return;
    setGerando(true);
    try {
      const nomeArq = `story-${p.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
      if (web) {
        // navegador / desktop: baixa o PNG
        const uri = await captureRef(alvo, { format: 'png', result: 'data-uri', width: 1080, height: 1920 });
        const a = globalThis.document.createElement('a');
        a.href = uri;
        a.download = nomeArq;
        globalThis.document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const uri = await captureRef(alvo, { format: 'png', result: 'tmpfile', width: larguraReal, height: alturaReal });
        if (!(await Sharing.isAvailableAsync())) return Alert.alert('Ops', 'Compartilhamento indisponível neste aparelho.');
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Publicar no story' });
      }
    } catch (e) {
      const msg = 'Não foi possível gerar a imagem.';
      if (web) globalThis.alert?.(msg);
      else Alert.alert('Ops', msg);
      console.warn('[story]', e);
    } finally {
      setGerando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, alignItems: 'center' }}>
      <Stack.Screen options={{ title: 'Story do Instagram' }} />

      {/* prévia (no celular é ela que vira a imagem) */}
      <View style={{ width: larguraReal * escala, height: alturaReal * escala, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <View style={{ width: larguraReal, height: alturaReal, transform: [{ scale: escala }], transformOrigin: 'top left' }}>
          <StoryProduto ref={web ? undefined : alvo} p={p} loja={loja} u={u} />
        </View>
      </View>

      {/* no navegador a captura precisa da arte sem redução: cópia fora da tela */}
      {web && (
        <View style={{ position: 'absolute', left: -20000, top: 0 }} pointerEvents="none" aria-hidden>
          <StoryProduto ref={alvo} p={p} loja={loja} u={u} />
        </View>
      )}

      <View style={{ width: '100%', maxWidth: 520, marginTop: 20 }}>
        <Botao
          label={gerando ? 'Gerando imagem…' : web ? 'Baixar imagem do story' : 'Publicar no story'}
          icon={web ? 'download-outline' : 'logo-instagram'}
          onPress={gerando ? () => {} : gerar}
        />
        <Text style={{ color: colors.textSec, fontSize: 12, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
          {web
            ? 'A imagem (1080 × 1920) é salva no computador. Envie para o celular e publique no story pelo Instagram.'
            : 'Escolha o Instagram na lista e depois "Stories". Estoque e custo não aparecem na arte.'}
        </Text>
        {!p.foto && (
          <Text style={{ color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            Produto sem foto — adicione uma no cadastro para a arte ficar completa.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
