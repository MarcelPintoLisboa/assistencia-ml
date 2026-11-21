import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { CATEGORIA, fmtMoeda, parseMoeda } from '../../lib/format';
import { useDados } from '../../lib/store';
import type { CategoriaProduto } from '../../lib/types';
import { colors } from '../../theme';

const valorTxt = (n: number | undefined) => (n ? fmtMoeda(n).replace('R$ ', '') : '');

export default function EditarProduto() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { produtos, salvarProduto, removerProduto, adminLiberado } = useDados();
  const p = id ? produtos.find((x) => x.id === id) : undefined;

  const [nome, setNome] = useState(p?.nome ?? '');
  const [categoria, setCategoria] = useState<CategoriaProduto>(p?.categoria ?? 'drone');
  const [marca, setMarca] = useState(p?.marca ?? '');
  const [sku, setSku] = useState(p?.sku ?? '');
  const [custo, setCusto] = useState(valorTxt(p?.custo));
  const [preco, setPreco] = useState(valorTxt(p?.preco));
  const [estoque, setEstoque] = useState(String(p?.estoque ?? 1));
  const [minimo, setMinimo] = useState(String(p?.estoqueMinimo ?? 1));
  const [usado, setUsado] = useState(p?.usado ?? false);
  const [ativo, setAtivo] = useState(p?.ativo ?? true);

  // Funcionário (sem PIN) pode cadastrar, mas custo só aparece/edita para o admin.
  const podeVerCusto = adminLiberado || !p;
  const nPreco = parseMoeda(preco);
  const nCusto = parseMoeda(custo);

  const salvar = async () => {
    if (!nome.trim()) return Alert.alert('Atenção', 'Informe o nome do produto.');
    await salvarProduto({
      id: p?.id,
      nome: nome.trim(),
      categoria,
      marca: marca.trim(),
      sku: sku.trim(),
      custo: podeVerCusto ? nCusto : p?.custo ?? 0,
      preco: nPreco,
      estoque: parseInt(estoque, 10) || 0,
      estoqueMinimo: parseInt(minimo, 10) || 0,
      usado,
      ativo,
    });
    router.back();
  };

  const excluir = () => {
    const fazer = async () => {
      await removerProduto(p!.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir este produto?')) fazer();
    } else {
      Alert.alert('Excluir produto', 'O histórico de vendas é mantido.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: fazer },
      ]);
    }
  };

  const Toggle = ({ rot, v, on }: { rot: string; v: boolean; on: (b: boolean) => void }) => (
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
          <Rotulo>Categoria</Rotulo>
          <Chips
            opcoes={(Object.keys(CATEGORIA) as CategoriaProduto[]).map((c) => ({ value: c, label: CATEGORIA[c].label }))}
            valor={categoria}
            onChange={setCategoria}
          />
          <Campo label="Nome *" value={nome} onChangeText={setNome} placeholder="Ex.: DJI Mini 4 Pro Fly More" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Marca" value={marca} onChangeText={setMarca} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="SKU / código" value={sku} onChangeText={setSku} autoCapitalize="characters" />
            </View>
          </View>
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
          <Toggle rot="Seminovo / usado (garantia 90 dias)" v={usado} on={setUsado} />
          <Toggle rot="Disponível para venda" v={ativo} on={setAtivo} />
        </Card>
        <Botao label="Salvar produto" icon="checkmark" onPress={salvar} style={{ marginTop: 20 }} />
        {p && adminLiberado && <Botao label="Excluir produto" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
