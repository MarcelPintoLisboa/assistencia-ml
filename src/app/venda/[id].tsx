import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { ListaDocumentos } from '../../components/Documentos';
import { Badge, Botao, Card, Linha, Titulo, Vazio } from '../../components/ui';
import { htmlOrdemVenda } from '../../lib/documentos';
import { fmtData, fmtDataHora, fmtMoeda, PAGAMENTO } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

export default function DetalheVenda() {
  const { id, nova } = useLocalSearchParams<{ id: string; nova?: string }>();
  const { vendas, produtos, cliente, loja, cancelarVenda, adminLiberado } = useDados();
  const v = vendas.find((x) => x.id === id);
  if (!v) return <Vazio icon="help-circle-outline" texto="Venda não encontrada." />;

  const c = cliente(v.clienteId);
  const usado = v.itens.some((i) => produtos.find((p) => p.id === i.produtoId)?.usado);
  const lucro = v.itens.reduce((t, i) => t + i.qtd * (i.precoUnit - i.custoUnit), 0) - v.desconto;
  const fimGarantia = v.garantiaDias ? fmtData(new Date(new Date(v.data).getTime() + v.garantiaDias * 86400000).toISOString()) : null;

  const cancelar = () => {
    if (!adminLiberado) {
      const msg = 'Somente o administrador pode cancelar vendas. Desbloqueie em Vendas → Indicadores.';
      return Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Acesso restrito', msg);
    }
    const fazer = () => cancelarVenda(v.id);
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Cancelar esta venda? Os itens voltam ao estoque.')) fazer();
    } else {
      Alert.alert('Cancelar venda', 'Os itens voltam ao estoque.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar venda', style: 'destructive', onPress: fazer },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: `Venda #${String(v.numero).padStart(4, '0')}` }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {nova === '1' && (
          <View
            style={{
              flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, marginBottom: 12, borderRadius: radius.md,
              backgroundColor: colors.good + '18', borderWidth: 1, borderColor: colors.good + '66',
            }}
          >
            <Ionicons name="checkmark-circle" size={22} color={colors.good} />
            <Text style={{ color: colors.text, flex: 1 }}>Venda registrada e estoque atualizado. Gere a ordem de venda abaixo.</Text>
          </View>
        )}

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textSec }}>{fmtDataHora(v.data)}</Text>
            {v.status === 'cancelada' ? (
              <Badge label="Cancelada" color={colors.critical} icon="close-circle-outline" />
            ) : (
              <Badge label="Concluída" color={colors.good} icon="checkmark-circle-outline" />
            )}
          </View>
          {v.itens.map((i) => (
            <View key={i.produtoId} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, flex: 1 }}>
                {i.qtd}× {i.nome}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{fmtMoeda(i.qtd * i.precoUnit)}</Text>
            </View>
          ))}
          {v.desconto > 0 && <Text style={{ color: colors.textSec, marginTop: 8, textAlign: 'right' }}>Desconto: − {fmtMoeda(v.desconto)}</Text>}
          <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '900', textAlign: 'right', marginTop: 6 }}>{fmtMoeda(v.total)}</Text>
          {adminLiberado && (
            <Text style={{ color: colors.textSec, textAlign: 'right', fontSize: 12 }}>
              Lucro bruto: {fmtMoeda(lucro)} ({v.total ? Math.round((lucro / v.total) * 100) : 0}%)
            </Text>
          )}
        </Card>

        <Titulo>Detalhes</Titulo>
        <Card>
          <Linha icon="person-outline" label="Cliente" valor={c?.nome ?? 'Consumidor'} />
          <Linha icon="card-outline" label="Pagamento" valor={`${PAGAMENTO[v.pagamento]}${v.pagamento === 'parcelado' ? ` em ${v.parcelas}×` : ''}`} />
          <Linha icon="shield-checkmark-outline" label="Garantia" valor={v.garantiaDias ? `${v.garantiaDias} dias (até ${fimGarantia})` : 'Conforme fabricante'} />
          <Linha icon="document-text-outline" label="Observações" valor={v.observacoes} />
        </Card>

        <Titulo>Documento</Titulo>
        <ListaDocumentos
          docs={[
            {
              titulo: 'Ordem de venda / Ficha de saída',
              descricao: 'Itens, garantia e termo de venda para o cliente assinar',
              icon: 'receipt-outline',
              cor: colors.good,
              html: () => htmlOrdemVenda(v, c, loja, usado),
              destaque: true,
            },
          ]}
        />

        {v.status === 'concluida' && (
          <Botao label="Cancelar venda" variante="perigo" icon="close-circle-outline" onPress={cancelar} style={{ marginTop: 28 }} />
        )}
        <Botao label="Nova venda" variante="secundario" icon="cart-outline" onPress={() => router.replace('/venda/nova')} style={{ marginTop: 10 }} />
      </ScrollView>
    </>
  );
}
