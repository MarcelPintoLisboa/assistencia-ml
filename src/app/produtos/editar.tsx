import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { FichaEntradaForm, limparFicha } from '../../components/FichaEntradaForm';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { CATEGORIA, fmtMoeda, parseMoeda } from '../../lib/format';
import { escolherImagem } from '../../lib/imagens';
import { useDados } from '../../lib/store';
import type { CategoriaProduto, FichaEntrada } from '../../lib/types';
import { colors } from '../../theme';

const valorTxt = (n: number | undefined) => (n ? fmtMoeda(n).replace('R$ ', '') : '');

export default function EditarProduto() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { produtos, salvarProduto, removerProduto, ehAdmin } = useDados();
  const p = id ? produtos.find((x) => x.id === id) : undefined;

  const [nome, setNome] = useState(p?.nome ?? '');
  const [categoria, setCategoria] = useState<CategoriaProduto>(p?.categoria ?? 'drone');
  const [marca, setMarca] = useState(p?.marca ?? '');
  const [sku, setSku] = useState(p?.sku ?? '');
  const [custo, setCusto] = useState(valorTxt(p?.custo));
  const [preco, setPreco] = useState(valorTxt(p?.preco));
  const [estoque, setEstoque] = useState(String(p?.estoque ?? 1));
  const [minimo, setMinimo] = useState(String(p?.estoqueMinimo ?? 1));
  // condição obrigatória: produto novo começa sem nenhuma marcada
  const [condicao, setCondicao] = useState<'novo' | 'usado' | undefined>(p ? (p.usado ? 'usado' : 'novo') : undefined);
  const usado = condicao === 'usado';
  const [ativo, setAtivo] = useState(p?.ativo ?? true);
  const [ficha, setFicha] = useState<FichaEntrada>(p?.ficha ?? {});
  const [modelo, setModelo] = useState(p?.modelo ?? '');
  const [foto, setFoto] = useState<string | null>(p?.foto ?? null);

  const pegarFoto = async () => {
    try {
      const img = await escolherImagem(1080);
      if (img) setFoto(img);
    } catch {
      Alert.alert('Ops', 'Não foi possível abrir a galeria.');
    }
  };

  // Usuário comum pode cadastrar, mas o custo só aparece/edita para o admin.
  const podeVerCusto = ehAdmin || !p;
  const nPreco = parseMoeda(preco);
  const nCusto = parseMoeda(custo);

  /** Grava o produto; devolve o id (ou null se faltou algo). */
  const gravar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do produto.');
      return null;
    }
    if (!condicao) {
      Alert.alert('Atenção', 'Escolha se o produto é novo ou usado.');
      return null;
    }
    // ficha vazia: não envia nada (ou limpa, se o produto já tinha uma)
    const fichaFinal = limparFicha(ficha) ?? (p?.ficha ? null : undefined);
    // foto e modelo: só envia quando há valor ou quando estão sendo apagados
    const fotoFinal = foto ?? (p?.foto ? null : undefined);
    const modeloFinal = modelo.trim() || (p?.modelo ? '' : undefined);
    const salvo = await salvarProduto({
      ...(fichaFinal !== undefined ? { ficha: fichaFinal } : {}),
      ...(fotoFinal !== undefined ? { foto: fotoFinal } : {}),
      ...(modeloFinal !== undefined ? { modelo: modeloFinal } : {}),
      id: p?.id,
      nome: nome.trim(),
      categoria,
      marca: marca.trim(),
      sku: sku.trim(),
      custo: podeVerCusto ? nCusto : p?.custo ?? 0,
      preco: nPreco,
      estoque: Math.max(0, parseInt(estoque, 10) || 0),
      estoqueMinimo: Math.max(0, parseInt(minimo, 10) || 0),
      usado,
      ativo,
    });
    return salvo.id;
  };

  const salvar = async () => {
    if (await gravar()) router.back();
  };

  // salva antes, para a arte já sair com a foto e os dados que acabaram de ser editados
  const abrirStory = async () => {
    const pid = await gravar();
    if (pid) router.push({ pathname: '/produtos/story', params: { id: pid } });
  };

  const excluir = () => {
    const fazer = async () => {
      try {
        await removerProduto(p!.id);
        router.back();
      } catch (err) {
        Alert.alert('Não foi possível excluir', String((err as Error).message));
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir este produto?')) fazer();
    } else {
      Alert.alert('Excluir produto', 'O produto sai das listas e não pode mais ser vendido. O histórico de vendas é mantido.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: fazer },
      ]);
    }
  };

  const toggle = (rot: string, v: boolean, on: (b: boolean) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ color: colors.text, flex: 1 }}>{rot}</Text>
      <Switch value={v} onValueChange={on} trackColor={{ true: colors.primaryDim, false: colors.border }} thumbColor={v ? colors.primary : colors.textMuted} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: p ? 'Editar produto' : 'Novo produto' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Rotulo>Foto do produto (opcional)</Rotulo>
          {foto ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <Image source={{ uri: foto }} style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: '#fff' }} contentFit="contain" />
              <View style={{ flex: 1, gap: 8 }}>
                <Botao label="Trocar foto" variante="secundario" icon="image-outline" onPress={pegarFoto} />
                <Botao label="Remover" variante="perigo" icon="trash-outline" onPress={() => setFoto(null)} />
              </View>
            </View>
          ) : (
            <Botao label="Adicionar foto" variante="secundario" icon="camera-outline" onPress={pegarFoto} style={{ marginBottom: 14 }} />
          )}
          <Rotulo>Categoria</Rotulo>
          <Chips
            opcoes={(Object.keys(CATEGORIA) as CategoriaProduto[]).map((c) => ({ value: c, label: CATEGORIA[c].label }))}
            valor={categoria}
            onChange={setCategoria}
          />
          <Rotulo>Condição *</Rotulo>
          <Chips<'novo' | 'usado' | ''>
            opcoes={[
              { value: 'novo', label: 'Novo', color: colors.good },
              { value: 'usado', label: 'Usado / seminovo', color: colors.seriesOut },
            ]}
            valor={condicao ?? ''}
            onChange={(v) => setCondicao(v || undefined)}
          />
          <Text style={{ color: condicao ? colors.textSec : colors.warning, fontSize: 12, marginTop: -4, marginBottom: 12 }}>
            {!condicao ? 'Obrigatório: escolha se o produto é novo ou usado.' : usado ? 'Garantia de 90 dias na venda.' : 'Produto novo, na garantia padrão.'}
          </Text>
          <Campo label="Nome *" value={nome} onChangeText={setNome} placeholder="Ex.: DJI Mini 4 Pro Fly More" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Marca" value={marca} onChangeText={setMarca} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Modelo" value={modelo} onChangeText={setModelo} placeholder="Ex.: PS5 Slim" />
            </View>
          </View>
          <Campo label="SKU / código" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {podeVerCusto && (
              <View style={{ flex: 1 }}>
                <Campo label="Custo (R$)" value={custo} onChangeText={setCusto} keyboardType="decimal-pad" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Campo label="Preço de venda (R$)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" />
            </View>
          </View>
          {podeVerCusto && nPreco > 0 && (
            <Text style={{ color: colors.textSec, marginBottom: 12 }}>
              Margem: {fmtMoeda(nPreco - nCusto)} ({Math.round(((nPreco - nCusto) / nPreco) * 100)}%)
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Estoque atual" value={estoque} onChangeText={setEstoque} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Avisar abaixo de" value={minimo} onChangeText={setMinimo} keyboardType="number-pad" />
            </View>
          </View>
          {toggle('Disponível para venda', ativo, setAtivo)}
        </Card>
        <FichaEntradaForm ficha={ficha} onChange={setFicha} abertaInicial={!!p?.ficha} />
        <Botao label="Salvar produto" icon="checkmark" onPress={salvar} style={{ marginTop: 20 }} />
        <Botao label="Publicar no story do Instagram" variante="secundario" icon="logo-instagram" onPress={abrirStory} style={{ marginTop: 10 }} />
        {p && ehAdmin && <Botao label="Excluir produto" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
