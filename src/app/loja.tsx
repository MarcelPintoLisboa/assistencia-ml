import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Botao, Campo, Card, Titulo } from '../components/ui';
import { LOJA_PADRAO } from '../lib/documentos';
import { escolherImagem } from '../lib/imagens';
import { useDados } from '../lib/store';
import type { DadosLoja } from '../lib/types';
import { colors, radius } from '../theme';

export default function Loja() {
  const { loja, salvarLoja, ehAdmin } = useDados();
  const [l, setL] = useState<DadosLoja>(loja);
  if (!ehAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Ionicons name="lock-closed" size={40} color={colors.textSec} />
        <Text style={{ color: colors.textSec, textAlign: 'center' }}>Somente o administrador pode alterar os dados da empresa.</Text>
      </View>
    );
  }
  const set = <K extends keyof DadosLoja>(k: K, v: DadosLoja[K]) => setL((x) => ({ ...x, [k]: v }));

  const pegarLogo = async () => {
    try {
      const img = await escolherImagem(500, true);
      if (img) set('logo', img);
    } catch {
      Alert.alert('Ops', 'Não foi possível abrir a galeria.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Empresa e documentos' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.textSec, lineHeight: 20 }}>
          O nome e o logo da empresa aparecem em todos os documentos (orçamento, fichas de entrada, saída e envio, ordem de venda), no relatório de indicadores e nas etiquetas que não têm logo próprio.
        </Text>

        <Titulo>Logo da empresa</Titulo>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={pegarLogo}
            style={{ width: 110, height: 70, borderRadius: radius.sm, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
          >
            {l.logo ? (
              <Image source={{ uri: l.logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : (
              <Ionicons name="image-outline" size={28} color={colors.blue} />
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 8 }}>
            <Pressable onPress={pegarLogo} hitSlop={6}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{l.logo ? 'Trocar logo' : 'Escolher logo'}</Text>
            </Pressable>
            {l.logo && (
              <Pressable onPress={() => set('logo', null)} hitSlop={6}>
                <Text style={{ color: colors.critical, fontWeight: '700' }}>Remover</Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Switch
                value={l.marcaDagua}
                onValueChange={(v) => set('marcaDagua', v)}
                trackColor={{ true: colors.primaryDim, false: colors.border }}
                thumbColor={l.marcaDagua ? colors.primary : colors.textMuted}
              />
              <Text style={{ color: colors.textSec, fontSize: 13, flex: 1 }}>Marca d’água no fundo</Text>
            </View>
          </View>
        </Card>

        <Titulo>Cabeçalho</Titulo>
        <Card>
          <Campo label="Nome da empresa" value={l.nome} onChangeText={(t) => set('nome', t)} />
          <Campo label="Slogan" value={l.slogan} onChangeText={(t) => set('slogan', t)} />
          <Campo label="Endereço" value={l.endereco} onChangeText={(t) => set('endereco', t)} />
          <Campo label="Telefone" value={l.telefone} onChangeText={(t) => set('telefone', t)} keyboardType="phone-pad" />
          <Campo label="E-mail" value={l.email} onChangeText={(t) => set('email', t)} autoCapitalize="none" keyboardType="email-address" />
          <Campo label="Instagram" value={l.instagram} onChangeText={(t) => set('instagram', t)} autoCapitalize="none" />
          <Campo label="CNPJ (opcional)" value={l.documento} onChangeText={(t) => set('documento', t)} keyboardType="numbers-and-punctuation" />
        </Card>

        <Titulo>Textos das fichas</Titulo>
        <Card>
          <Campo label="Observações do orçamento (uma por linha)" value={l.obsOrcamento} onChangeText={(t) => set('obsOrcamento', t)} multiline style={{ minHeight: 110 }} />
          <Campo label="Termo de venda / garantia" value={l.termoVenda} onChangeText={(t) => set('termoVenda', t)} multiline style={{ minHeight: 220 }} />
          <Pressable
            onPress={() => setL((x) => ({ ...x, obsOrcamento: LOJA_PADRAO.obsOrcamento, termoVenda: LOJA_PADRAO.termoVenda }))}
            hitSlop={6}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Restaurar textos padrão</Text>
          </Pressable>
        </Card>

        <Botao
          label="Salvar"
          icon="checkmark"
          onPress={async () => {
            await salvarLoja(l);
            router.back();
          }}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
