import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Barra, GraficoBarras } from '../components/GraficoBarras';
import { Card, Chips, Titulo } from '../components/ui';
import { CATEGORIA, DIAS_SEMANA, fmtMoeda, inicioDoDia, MESES, MESES_LONGOS, PAGAMENTO } from '../lib/format';
import { useDados } from '../lib/store';
import type { CategoriaProduto, FormaPagamento } from '../lib/types';
import { colors, radius } from '../theme';

type Periodo = 'hoje' | '7d' | 'mes' | '6m';

export default function Admin() {
  const { ehAdmin } = useDados();
  return (
    <>
      <Stack.Screen options={{ title: 'Painel do administrador' }} />
      {ehAdmin ? (
        <Indicadores />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <View style={st.cadeado}>
            <Ionicons name="lock-closed" size={36} color={colors.primary} />
          </View>
          <Text style={st.h}>Área restrita</Text>
          <Text style={{ color: colors.textSec, textAlign: 'center', lineHeight: 20 }}>
            Os indicadores de vendas, custos e lucro são visíveis apenas para administradores.
          </Text>
        </View>
      )}
    </>
  );
}

function Indicadores() {
  const { vendas, produtos: todos, ordens, loja } = useDados();
  const produtos = todos.filter((p) => !p.excluido);
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const dados = useMemo(() => {
    const hoje = inicioDoDia(new Date());
    const ini =
      periodo === 'hoje' ? hoje
      : periodo === '7d' ? new Date(hoje.getTime() - 6 * 86400000)
      : periodo === 'mes' ? new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      : new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
    const ok = vendas.filter((v) => v.status === 'concluida' && new Date(v.data) >= ini);
    const canceladas = vendas.filter((v) => v.status === 'cancelada' && new Date(v.data) >= ini).length;
    const faturamento = ok.reduce((t, v) => t + v.total, 0);
    const custo = ok.reduce((t, v) => t + v.itens.reduce((s, i) => s + i.qtd * i.custoUnit, 0), 0);
    const lucro = faturamento - custo;
    const unidades = ok.reduce((t, v) => t + v.itens.reduce((s, i) => s + i.qtd, 0), 0);

    const porCat = new Map<CategoriaProduto, { valor: number; qtd: number }>();
    const porPg = new Map<FormaPagamento, number>();
    const porProd = new Map<string, { nome: string; qtd: number; valor: number }>();
    for (const v of ok) {
      porPg.set(v.pagamento, (porPg.get(v.pagamento) ?? 0) + v.total);
      const bruto = v.itens.reduce((t, i) => t + i.qtd * i.precoUnit, 0) || 1;
      for (const i of v.itens) {
        const val = i.qtd * i.precoUnit * (v.total / bruto); // rateia o desconto
        const c = porCat.get(i.categoria) ?? { valor: 0, qtd: 0 };
        porCat.set(i.categoria, { valor: c.valor + val, qtd: c.qtd + i.qtd });
        const p = porProd.get(i.nome) ?? { nome: i.nome, qtd: 0, valor: 0 };
        porProd.set(i.nome, { ...p, qtd: p.qtd + i.qtd, valor: p.valor + val });
      }
    }

    const servicos = ordens
      .filter((o) => o.status === 'entregue' && o.dataSaida && new Date(o.dataSaida) >= ini)
      .reduce((t, o) => t + (o.valorFinal || o.valorOrcamento), 0);

    // série do gráfico
    const doIntervalo = (a: Date, b: Date) =>
      vendas.filter((v) => v.status === 'concluida' && new Date(v.data) >= a && new Date(v.data) < b).reduce((t, v) => t + v.total, 0);
    let serie: Barra[];
    if (periodo === '6m') {
      serie = Array.from({ length: 6 }, (_, k) => {
        const a = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + k, 1);
        const b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
        return { label: MESES[a.getMonth()], detalhe: `${MESES_LONGOS[a.getMonth()]} ${a.getFullYear()}`, valor: doIntervalo(a, b) };
      });
    } else if (periodo === 'mes') {
      const semanas = Math.ceil((hoje.getDate() + 1) / 7);
      serie = Array.from({ length: semanas }, (_, k) => {
        const a = new Date(hoje.getFullYear(), hoje.getMonth(), 1 + k * 7);
        const b = new Date(hoje.getFullYear(), hoje.getMonth(), Math.min(1 + (k + 1) * 7, hoje.getDate() + 1));
        return { label: `Sem ${k + 1}`, detalhe: `${a.getDate()} a ${b.getDate() - 1}/${a.getMonth() + 1}`, valor: doIntervalo(a, b) };
      });
    } else {
      serie = Array.from({ length: 7 }, (_, k) => {
        const a = new Date(hoje.getTime() - (6 - k) * 86400000);
        const b = new Date(a.getTime() + 86400000);
        return { label: DIAS_SEMANA[a.getDay()], detalhe: `${DIAS_SEMANA[a.getDay()]} ${a.getDate()}/${a.getMonth() + 1}`, valor: doIntervalo(a, b) };
      });
    }

    return {
      faturamento, lucro, margem: faturamento ? (lucro / faturamento) * 100 : 0, qtd: ok.length, unidades, canceladas,
      ticket: ok.length ? faturamento / ok.length : 0, servicos, serie,
      porCat: [...porCat.entries()].sort((a, b) => b[1].valor - a[1].valor),
      porPg: [...porPg.entries()].sort((a, b) => b[1] - a[1]),
      top: [...porProd.values()].sort((a, b) => b.valor - a.valor).slice(0, 5),
    };
  }, [vendas, ordens, periodo]);

  const estoqueBaixo = produtos.filter((p) => p.ativo && p.estoque <= p.estoqueMinimo);
  const valorEstoque = produtos.reduce((t, p) => t + Math.max(0, p.estoque) * p.custo, 0);
  const maxCat = Math.max(1, ...dados.porCat.map(([, v]) => v.valor));
  const maxPg = Math.max(1, ...dados.porPg.map(([, v]) => v));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: colors.textSec, marginBottom: 8 }}>{loja.nome}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chips<Periodo>
          opcoes={[
            { value: 'hoje', label: 'Hoje' },
            { value: '7d', label: '7 dias' },
            { value: 'mes', label: 'Mês' },
            { value: '6m', label: '6 meses' },
          ]}
          valor={periodo}
          onChange={setPeriodo}
        />
      </View>

      <View style={st.kpis}>
        <Kpi icon="cash-outline" label="Faturamento" valor={fmtMoeda(dados.faturamento)} destaque />
        <Kpi icon="trending-up-outline" label={`Lucro bruto · ${dados.margem.toFixed(0)}%`} valor={fmtMoeda(dados.lucro)} />
        <Kpi icon="receipt-outline" label="Vendas" valor={`${dados.qtd}`} sub={`${dados.unidades} itens`} />
        <Kpi icon="pricetag-outline" label="Ticket médio" valor={fmtMoeda(dados.ticket)} />
        <Kpi icon="construct-outline" label="Serviços entregues" valor={fmtMoeda(dados.servicos)} />
        <Kpi icon="close-circle-outline" label="Canceladas" valor={`${dados.canceladas}`} />
      </View>

      <Titulo>Faturamento de vendas</Titulo>
      <Card>
        <GraficoBarras dados={dados.serie} formatar={fmtMoeda} />
      </Card>

      <Titulo>Vendas por categoria</Titulo>
      <Card>
        {dados.porCat.length === 0 && <Text style={{ color: colors.textSec }}>Sem vendas no período.</Text>}
        {dados.porCat.map(([cat, v]) => (
          <View key={cat} style={st.barraLinha}>
            <Ionicons name={CATEGORIA[cat].icon} size={16} color={colors.primary} />
            <Text style={st.barraRot}>{CATEGORIA[cat].label}</Text>
            <View style={st.trilho}>
              <View style={[st.barra, { width: `${(v.valor / maxCat) * 100}%` }]} />
            </View>
            <Text style={st.barraVal}>{fmtMoeda(v.valor)}</Text>
          </View>
        ))}
        {dados.porCat.length > 0 && (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
            Drones: {Math.round(((dados.porCat.find(([c]) => c === 'drone')?.[1].valor ?? 0) / (dados.faturamento || 1)) * 100)}% · Video games:{' '}
            {Math.round(((dados.porCat.find(([c]) => c === 'videogame')?.[1].valor ?? 0) / (dados.faturamento || 1)) * 100)}% do faturamento
          </Text>
        )}
      </Card>

      <Titulo>Mais vendidos</Titulo>
      <Card>
        {dados.top.length === 0 && <Text style={{ color: colors.textSec }}>Sem vendas no período.</Text>}
        {dados.top.map((p, i) => (
          <View key={p.nome} style={[st.top, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={st.rank}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{p.nome}</Text>
              <Text style={{ color: colors.textSec, fontSize: 12 }}>{p.qtd} unidade(s)</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{fmtMoeda(p.valor)}</Text>
          </View>
        ))}
      </Card>

      <Titulo>Formas de pagamento</Titulo>
      <Card>
        {dados.porPg.length === 0 && <Text style={{ color: colors.textSec }}>Sem vendas no período.</Text>}
        {dados.porPg.map(([pg, v]) => (
          <View key={pg} style={st.barraLinha}>
            <Text style={st.barraRot}>{PAGAMENTO[pg]}</Text>
            <View style={st.trilho}>
              <View style={[st.barra, { width: `${(v / maxPg) * 100}%` }]} />
            </View>
            <Text style={st.barraVal}>{fmtMoeda(v)}</Text>
          </View>
        ))}
      </Card>

      <Titulo acao={{ label: 'Produtos', onPress: () => router.push('/produtos') }}>Estoque</Titulo>
      <Card>
        <Text style={{ color: colors.textSec }}>
          Valor em estoque (custo): <Text style={{ color: colors.text, fontWeight: '800' }}>{fmtMoeda(valorEstoque)}</Text>
        </Text>
        {estoqueBaixo.length > 0 ? (
          estoqueBaixo.map((p) => (
            <Pressable key={p.id} onPress={() => router.push({ pathname: '/produtos/editar', params: { id: p.id } })} style={st.baixo}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{p.nome}</Text>
              <Text style={{ color: colors.warning, fontWeight: '700' }}>{p.estoque} un.</Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: colors.textSec, marginTop: 8 }}>Nenhum produto com estoque baixo.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

function Kpi({ icon, label, valor, sub, destaque }: { icon: keyof typeof Ionicons.glyphMap; label: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <View style={[st.kpi, destaque && { borderColor: colors.primary + '80' }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={st.kpiValor} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={st.kpiLabel}>{label}</Text>
      {sub && <Text style={[st.kpiLabel, { color: colors.textMuted }]}>{sub}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  cadeado: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  h: { color: colors.text, fontSize: 20, fontWeight: '800' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  kpi: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  kpiValor: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  kpiLabel: { color: colors.textSec, fontSize: 12 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  barraRot: { color: colors.text, fontSize: 13, width: 110 },
  trilho: { flex: 1, height: 8, backgroundColor: colors.bgAlt, borderRadius: 4, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.seriesIn },
  barraVal: { color: colors.text, fontSize: 12, fontWeight: '700', minWidth: 86, textAlign: 'right', fontVariant: ['tabular-nums'] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rank: { color: colors.primary, fontWeight: '900', fontSize: 18, width: 22, textAlign: 'center' },
  baixo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
});
