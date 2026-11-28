import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, Busca, Campo, Card, Chips, Rotulo, s as ui, Titulo, toque } from '../../components/ui';
import { CATEGORIA, fmtMoeda, PAGAMENTO, parseMoeda } from '../../lib/format';
import { useDesktop } from '../../lib/desktop';
import { itensSemEstoque } from '../../lib/estoque';
import { useDados } from '../../lib/store';
import type { FormaPagamento, ItemVenda } from '../../lib/types';
import { colors, radius } from '../../theme';

export default function NovaVenda() {
  const { produtos, clientes, registrarVenda, salvarCliente } = useDados();
  const desktop = useDesktop();
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [desconto, setDesconto] = useState('');
  const [pagamento, setPagamento] = useState<FormaPagamento>('pix');
  const [parcelas, setParcelas] = useState(2);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const [garantia, setGarantia] = useState(90);
  const [obs, setObs] = useState('');

  const disponiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => p.ativo && !p.excluido && (!q || `${p.nome} ${p.marca} ${p.sku}`.toLowerCase().includes(q)))
      .slice(0, q ? 30 : 8);
  }, [produtos, busca]);

  const subtotal = itens.reduce((t, i) => t + i.qtd * i.precoUnit, 0);
  const desc = Math.min(subtotal, parseMoeda(desconto));
  const total = subtotal - desc;

  const qtdNoCarrinho = (id: string) => itens.filter((i) => i.produtoId === id).reduce((t, i) => t + i.qtd, 0);

  const adicionar = (pid: string) => {
    const p = produtos.find((x) => x.id === pid);
    if (!p) return;
    // nunca coloca no carrinho mais do que há em estoque
    if (p.estoque <= 0) {
      return Alert.alert('Sem estoque', `${p.nome} está sem estoque e não pode ser vendido. Adicione o estoque antes de vender.`, [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Adicionar estoque', onPress: () => router.push({ pathname: '/produtos/editar', params: { id: p.id } }) },
      ]);
    }
    if (qtdNoCarrinho(pid) >= p.estoque) {
      return Alert.alert('Estoque insuficiente', `Só há ${p.estoque} unidade(s) de ${p.nome} em estoque.`);
    }
    toque();
    setItens((l) =>
      l.some((i) => i.produtoId === pid)
        ? l.map((i) => (i.produtoId === pid ? { ...i, qtd: i.qtd + 1 } : i))
        : [...l, { produtoId: p.id, nome: p.nome, categoria: p.categoria, qtd: 1, precoUnit: p.preco, custoUnit: p.custo }],
    );
    if (p.usado) setGarantia(90);
  };

  const mudarQtd = (idx: number, delta: number) => {
    const item = itens[idx];
    const p = produtos.find((x) => x.id === item?.produtoId);
    if (delta > 0 && (!p || item.qtd + delta > p.estoque)) {
      return Alert.alert('Estoque insuficiente', `Só há ${p?.estoque ?? 0} unidade(s) de ${item?.nome} em estoque.`);
    }
    setItens((l) => l.map((i, k) => (k === idx ? { ...i, qtd: i.qtd + delta } : i)).filter((i) => i.qtd > 0));
  };

  const finalizar = async () => {
    if (!itens.length) return Alert.alert('Venda vazia', 'Adicione pelo menos um produto.');
    const semEstoque = itensSemEstoque(itens, produtos);
    if (semEstoque.length) return Alert.alert('Estoque insuficiente', `Não há estoque suficiente de: ${semEstoque.join(', ')}.`);
    let cid = clienteId;
    if (!cid && nomeNovo.trim()) {
      const c = await salvarCliente({ nome: nomeNovo.trim(), telefone: '', email: '', endereco: '', notas: '' });
      cid = c.id;
    }
    let v;
    try {
      v = await registrarVenda({
      data: new Date().toISOString(),
      clienteId: cid,
      itens,
      desconto: desc,
      total,
      pagamento,
      parcelas: pagamento === 'parcelado' ? parcelas : 1,
      garantiaDias: garantia,
      observacoes: obs.trim(),
      });
    } catch (e) {
      return Alert.alert('Venda não registrada', String((e as Error).message));
    }
    router.replace({ pathname: '/venda/[id]', params: { id: v.id, nova: '1' } });
  };

  const listaProdutos = (
    <>
        <Busca value={busca} onChangeText={setBusca} placeholder="Buscar produto, marca ou SKU" />
        <View style={{ marginTop: 10, gap: 8 }}>
          {disponiveis.map((p) => {
            const noCarrinho = qtdNoCarrinho(p.id);
            return (
              <Pressable key={p.id} onPress={() => adicionar(p.id)} style={({ pressed }) => [st.prod, pressed && { opacity: 0.7 }, p.estoque <= 0 && { opacity: 0.45 }]}>
                <Ionicons name={CATEGORIA[p.categoria].icon} size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {p.nome}
                  </Text>
                  <Text style={{ color: p.estoque <= 0 ? colors.critical : colors.textSec, fontSize: 12 }}>
                    {p.estoque <= 0 ? 'Sem estoque · toque para adicionar' : `${p.estoque} em estoque`}
                    {p.usado ? ' · usado' : ' · novo'}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{fmtMoeda(p.preco)}</Text>
                <View style={[st.add, noCarrinho > 0 && { backgroundColor: colors.primary }]}>
                  {noCarrinho > 0 ? (
                    <Text style={{ color: colors.bg, fontWeight: '800' }}>{noCarrinho}</Text>
                  ) : (
                    <Ionicons name="add" size={18} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            );
          })}
          {disponiveis.length === 0 && (
            <Text style={{ color: colors.textSec }}>
              Nenhum produto encontrado.{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => router.push('/produtos/editar')}>
                Cadastrar produto
              </Text>
            </Text>
          )}
        </View>
    </>
  );
  const fechamento = (
    <>
        <Titulo>Carrinho</Titulo>
        <Card>
          {itens.length === 0 ? (
            <Text style={{ color: colors.textSec }}>{desktop ? 'Clique nos produtos ao lado para adicionar.' : 'Toque nos produtos acima para adicionar.'}</Text>
          ) : (
            itens.map((i, idx) => (
              <View key={i.produtoId} style={st.linha}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{i.nome}</Text>
                  <Text style={{ color: colors.textSec, fontSize: 12 }}>{fmtMoeda(i.precoUnit)} cada</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => mudarQtd(idx, -1)} style={st.passo}>
                  <Ionicons name="remove" size={16} color={colors.primary} />
                </Pressable>
                <Text style={{ color: colors.text, fontWeight: '800', minWidth: 20, textAlign: 'center' }}>{i.qtd}</Text>
                <Pressable hitSlop={8} onPress={() => mudarQtd(idx, 1)} style={st.passo}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                </Pressable>
                <Text style={{ color: colors.text, fontWeight: '700', minWidth: 90, textAlign: 'right' }}>{fmtMoeda(i.qtd * i.precoUnit)}</Text>
              </View>
            ))
          )}
          <View style={{ marginTop: 12 }}>
            <Campo label="Desconto (R$)" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" placeholder="0,00" />
          </View>
          <View style={st.totalRow}>
            <Text style={{ color: colors.textSec }}>Subtotal {fmtMoeda(subtotal)}{desc ? `  ·  Desconto ${fmtMoeda(desc)}` : ''}</Text>
          </View>
          <View style={st.totalRow}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Total</Text>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900' }}>{fmtMoeda(total)}</Text>
          </View>
        </Card>

        <Titulo>Pagamento</Titulo>
        <Card>
          <Chips opcoes={(Object.keys(PAGAMENTO) as FormaPagamento[]).map((p) => ({ value: p, label: PAGAMENTO[p] }))} valor={pagamento} onChange={setPagamento} />
          {pagamento === 'parcelado' && (
            <>
              <Rotulo>Parcelas</Rotulo>
              <Chips opcoes={[2, 3, 4, 5, 6, 10, 12].map((n) => ({ value: n, label: `${n}× ${fmtMoeda(total / n)}` }))} valor={parcelas} onChange={setParcelas} />
            </>
          )}
          <Rotulo>Garantia</Rotulo>
          <Chips opcoes={[0, 30, 90, 180, 365].map((d) => ({ value: d, label: d === 0 ? 'Fabricante' : `${d} dias` }))} valor={garantia} onChange={setGarantia} />
        </Card>

        <Titulo>Cliente (opcional)</Titulo>
        <Card>
          {clientes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {clientes.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setClienteId(c.id === clienteId ? null : c.id)}
                  style={[ui.chip, c.id === clienteId && { borderColor: colors.primary, backgroundColor: colors.primary + '26' }]}
                >
                  <Text style={[ui.chipTxt, c.id === clienteId && { color: colors.text }]}>{c.nome}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {!clienteId && <Campo label="Ou digite o nome de um cliente novo" value={nomeNovo} onChangeText={setNomeNovo} />}
          <Campo label="Observações" value={obs} onChangeText={setObs} multiline placeholder="Nº de série, cor, condições…" />
        </Card>

        <Botao label={`Finalizar venda · ${fmtMoeda(total)}`} icon="checkmark-done" onPress={finalizar} style={{ marginTop: 24 }} />
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: desktop ? 'Nova venda (F3)' : 'Nova venda', ...(desktop && { contentStyle: { backgroundColor: colors.bg } }) }} />
      {desktop ? (
        // Desktop: produtos à esquerda e carrinho/pagamento fixos à direita, como um caixa
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {listaProdutos}
          </ScrollView>
          <ScrollView style={st.ladoCaixa} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {fechamento}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {listaProdutos}
          {fechamento}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  ladoCaixa: { width: 440, flexGrow: 0, backgroundColor: colors.bgAlt, borderLeftWidth: 1, borderLeftColor: colors.border },
  prod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  add: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  passo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});
