// Ponte entre os dados do app (AppData) e as tabelas assistencia_* da base de dados.
// O app continua trabalhando com o mesmo formato de antes; aqui ficam:
//  - a conversão de nomes (camelCase no app <-> snake_case no banco);
//  - a carga inicial de tudo do usuário logado;
//  - o envio só do que mudou (comparando o estado antes e depois de cada alteração).
import { supabase } from './supabase';
import type { Agendamento, AppData, Cliente, DadosLoja, ModeloEtiqueta, OrdemServico, Produto, Venda } from './types';

type Linha = Record<string, unknown>;
const num = (v: unknown) => Number(v) || 0;
const vazioParaNull = (v: unknown) => (v === '' || v === undefined ? null : v);

// ---------- conversões ----------
const clienteDb = (c: Cliente): Linha => ({
  id: c.id, nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '', endereco: c.endereco ?? '',
  documento: c.documento ?? null, notas: c.notas ?? '', criado_em: c.criadoEm,
});
const clienteApp = (r: Linha): Cliente => ({
  id: r.id as string, nome: r.nome as string, telefone: r.telefone as string, email: r.email as string,
  endereco: r.endereco as string, documento: (r.documento as string) ?? undefined, notas: r.notas as string,
  criadoEm: r.criado_em as string,
});

const ordemDb = (o: OrdemServico): Linha => ({
  id: o.id, numero: o.numero, cliente_id: vazioParaNull(o.clienteId), tipo_equipamento: o.tipoEquipamento ?? '',
  marca: o.marca ?? '', modelo: o.modelo ?? '', numero_serie: o.numeroSerie ?? '', cor: o.cor ?? null,
  tecnico: o.tecnico ?? null, itens_orcamento: o.itensOrcamento ?? [], acessorios: o.acessorios ?? '',
  defeito: o.defeito ?? '', defeitos: o.defeitos ?? [], diagnostico: o.diagnostico ?? '', status: o.status,
  prioridade: o.prioridade, valor_orcamento: num(o.valorOrcamento), valor_final: num(o.valorFinal),
  data_entrada: o.dataEntrada, previsao_entrega: o.previsaoEntrega || null, data_saida: o.dataSaida || null,
  garantia_dias: Math.max(0, Math.round(num(o.garantiaDias))), procedimentos: o.procedimentos ?? [],
  historico: o.historico ?? [],
});
const ordemApp = (r: Linha): OrdemServico => ({
  id: r.id as string, numero: r.numero as number, clienteId: (r.cliente_id as string) ?? '',
  tipoEquipamento: r.tipo_equipamento as string, marca: r.marca as string, modelo: r.modelo as string,
  numeroSerie: r.numero_serie as string, cor: (r.cor as string) ?? undefined, tecnico: (r.tecnico as string) ?? undefined,
  itensOrcamento: (r.itens_orcamento as OrdemServico['itensOrcamento']) ?? [], acessorios: r.acessorios as string,
  defeito: r.defeito as string, defeitos: (r.defeitos as string[]) ?? [], diagnostico: r.diagnostico as string,
  status: r.status as OrdemServico['status'], prioridade: r.prioridade as OrdemServico['prioridade'],
  valorOrcamento: num(r.valor_orcamento), valorFinal: num(r.valor_final), dataEntrada: r.data_entrada as string,
  previsaoEntrega: (r.previsao_entrega as string) ?? null, dataSaida: (r.data_saida as string) ?? null,
  garantiaDias: r.garantia_dias as number, procedimentos: (r.procedimentos as OrdemServico['procedimentos']) ?? [],
  historico: (r.historico as OrdemServico['historico']) ?? [],
});

const agendamentoDb = (a: Agendamento): Linha => ({
  id: a.id, titulo: a.titulo, tipo: a.tipo, data: a.data, lembrete_min: Math.max(0, Math.round(num(a.lembreteMin))),
  cliente_id: vazioParaNull(a.clienteId), ordem_id: vazioParaNull(a.ordemId), notas: a.notas ?? '', concluido: !!a.concluido,
});
const agendamentoApp = (r: Linha): Agendamento => ({
  id: r.id as string, titulo: r.titulo as string, tipo: r.tipo as Agendamento['tipo'], data: r.data as string,
  lembreteMin: r.lembrete_min as number, clienteId: (r.cliente_id as string) ?? null, ordemId: (r.ordem_id as string) ?? null,
  notas: r.notas as string, concluido: r.concluido as boolean,
});

const produtoDb = (p: Produto): Linha => ({
  id: p.id, nome: p.nome, categoria: p.categoria, marca: p.marca ?? '', sku: p.sku ?? '', custo: num(p.custo),
  preco: num(p.preco), estoque: Math.round(num(p.estoque)), estoque_minimo: Math.max(0, Math.round(num(p.estoqueMinimo))),
  usado: !!p.usado, ativo: p.ativo !== false, criado_em: p.criadoEm,
});
const produtoApp = (r: Linha): Produto => ({
  id: r.id as string, nome: r.nome as string, categoria: r.categoria as Produto['categoria'], marca: r.marca as string,
  sku: r.sku as string, custo: num(r.custo), preco: num(r.preco), estoque: r.estoque as number,
  estoqueMinimo: r.estoque_minimo as number, usado: r.usado as boolean, ativo: r.ativo as boolean, criadoEm: r.criado_em as string,
});

const vendaDb = (v: Venda): Linha => ({
  id: v.id, numero: v.numero, data: v.data, cliente_id: vazioParaNull(v.clienteId), itens: v.itens ?? [],
  desconto: Math.max(0, num(v.desconto)), total: num(v.total), pagamento: v.pagamento,
  parcelas: Math.max(1, Math.round(num(v.parcelas) || 1)), garantia_dias: Math.max(0, Math.round(num(v.garantiaDias))),
  observacoes: v.observacoes ?? '', status: v.status,
});
const vendaApp = (r: Linha): Venda => ({
  id: r.id as string, numero: r.numero as number, data: r.data as string, clienteId: (r.cliente_id as string) ?? null,
  itens: (r.itens as Venda['itens']) ?? [], desconto: num(r.desconto), total: num(r.total),
  pagamento: r.pagamento as Venda['pagamento'], parcelas: r.parcelas as number, garantiaDias: r.garantia_dias as number,
  observacoes: r.observacoes as string, status: r.status as Venda['status'],
});

const modeloDb = (m: ModeloEtiqueta): Linha => ({
  id: m.id, nome: m.nome, tamanho: m.tamanho, cor_destaque: m.corDestaque, cor_texto: m.corTexto, cor_fundo: m.corFundo,
  logo: m.logo, fundo: m.fundo, opacidade_fundo: Math.min(1, Math.max(0, num(m.opacidadeFundo))), titulo: m.titulo ?? '',
  rodape: m.rodape ?? '', mostrar: m.mostrar,
});
const modeloApp = (r: Linha): ModeloEtiqueta => ({
  id: r.id as string, nome: r.nome as string, tamanho: r.tamanho as ModeloEtiqueta['tamanho'],
  corDestaque: r.cor_destaque as string, corTexto: r.cor_texto as string, corFundo: r.cor_fundo as string,
  logo: (r.logo as string) ?? null, fundo: (r.fundo as string) ?? null, opacidadeFundo: num(r.opacidade_fundo),
  titulo: r.titulo as string, rodape: r.rodape as string, mostrar: r.mostrar as ModeloEtiqueta['mostrar'],
});

const lojaDb = (l: DadosLoja): Linha => ({
  nome: l.nome ?? '', slogan: l.slogan ?? '', endereco: l.endereco ?? '', telefone: l.telefone ?? '', email: l.email ?? '',
  instagram: l.instagram ?? '', documento: l.documento ?? '', logo: l.logo ?? null, marca_dagua: !!l.marcaDagua,
  obs_orcamento: l.obsOrcamento ?? '', termo_venda: l.termoVenda ?? '',
});
const lojaApp = (r: Linha): Partial<DadosLoja> => ({
  nome: r.nome as string, slogan: r.slogan as string, endereco: r.endereco as string, telefone: r.telefone as string,
  email: r.email as string, instagram: r.instagram as string, documento: r.documento as string,
  logo: (r.logo as string) ?? null, marcaDagua: r.marca_dagua as boolean, obsOrcamento: r.obs_orcamento as string,
  termoVenda: r.termo_venda as string,
});

// Coleções do AppData e suas tabelas, na ordem certa para inserir (clientes antes das ordens etc.)
type Colecao = 'clientes' | 'ordens' | 'agendamentos' | 'produtos' | 'vendas';
const TABELAS: { chave: Colecao; tabela: string; paraDb: (x: never) => Linha; paraApp: (r: Linha) => unknown }[] = [
  { chave: 'clientes', tabela: 'assistencia_clientes', paraDb: clienteDb as (x: never) => Linha, paraApp: clienteApp },
  { chave: 'ordens', tabela: 'assistencia_ordens', paraDb: ordemDb as (x: never) => Linha, paraApp: ordemApp },
  { chave: 'agendamentos', tabela: 'assistencia_agendamentos', paraDb: agendamentoDb as (x: never) => Linha, paraApp: agendamentoApp },
  { chave: 'produtos', tabela: 'assistencia_produtos', paraDb: produtoDb as (x: never) => Linha, paraApp: produtoApp },
  { chave: 'vendas', tabela: 'assistencia_vendas', paraDb: vendaDb as (x: never) => Linha, paraApp: vendaApp },
];

const pedacos = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, k) => arr.slice(k * n, k * n + n));

async function lerTabela(tabela: string, ordem: string, asc = false): Promise<Linha[]> {
  const todos: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('*').order(ordem, { ascending: asc }).range(de, de + 999);
    if (error) throw error;
    todos.push(...(data as Linha[]));
    if (data.length < 1000) break;
  }
  return todos;
}

async function enviar(tabela: string, linhas: Linha[]) {
  for (const parte of pedacos(linhas, 300)) {
    const { error } = await supabase.from(tabela).upsert(parte);
    if (error) throw error;
  }
}

async function apagar(tabela: string, ids: string[]) {
  for (const parte of pedacos(ids, 200)) {
    const { error } = await supabase.from(tabela).delete().in('id', parte);
    if (error) throw error;
  }
}

// ---------- carga inicial ----------
export async function carregarDaNuvem(): Promise<{ dados: AppData; modelos: ModeloEtiqueta[]; loja: Partial<DadosLoja> | null }> {
  const [clientes, ordens, agendamentos, produtos, vendas, modelos, loja] = await Promise.all([
    lerTabela('assistencia_clientes', 'criado_em'),
    lerTabela('assistencia_ordens', 'numero'),
    lerTabela('assistencia_agendamentos', 'data', true),
    lerTabela('assistencia_produtos', 'criado_em'),
    lerTabela('assistencia_vendas', 'numero'),
    lerTabela('assistencia_etiquetas', 'criado_em', true),
    supabase.from('assistencia_loja').select('*').maybeSingle(),
  ]);
  if (loja.error) throw loja.error;
  const os = ordens.map(ordemApp);
  const vs = vendas.map(vendaApp);
  return {
    dados: {
      clientes: clientes.map(clienteApp),
      ordens: os,
      agendamentos: agendamentos.map(agendamentoApp),
      produtos: produtos.map(produtoApp),
      vendas: vs,
      proximoNumero: Math.max(0, ...os.map((o) => o.numero || 0)) + 1,
      proximaVenda: Math.max(0, ...vs.map((v) => v.numero || 0)) + 1,
    },
    modelos: modelos.map(modeloApp),
    loja: loja.data ? lojaApp(loja.data as Linha) : null,
  };
}

// ---------- envio das diferenças ----------
// Compara o estado antes e depois de uma alteração. Itens novos ou alterados (objeto diferente)
// são gravados; itens que sumiram são apagados. Os objetos que não mudaram mantêm a mesma referência.
export async function enviarDiferencas(antes: AppData, depois: AppData) {
  const apagarDepois: { tabela: string; ids: string[] }[] = [];
  for (const t of TABELAS) {
    const a = antes[t.chave] as { id: string }[];
    const d = depois[t.chave] as { id: string }[];
    if (a === d) continue;
    const mapaAntes = new Map(a.map((x) => [x.id, x]));
    const idsDepois = new Set(d.map((x) => x.id));
    const mudou = d.filter((x) => mapaAntes.get(x.id) !== x);
    if (mudou.length) await enviar(t.tabela, mudou.map((x) => t.paraDb(x as never)));
    const sumiu = a.filter((x) => !idsDepois.has(x.id)).map((x) => x.id);
    if (sumiu.length) apagarDepois.push({ tabela: t.tabela, ids: sumiu });
  }
  // apaga na ordem inversa (vendas/agendamentos antes de ordens/clientes)
  for (const x of apagarDepois.reverse()) await apagar(x.tabela, x.ids);
}

export async function salvarModeloNaNuvem(m: ModeloEtiqueta) {
  await enviar('assistencia_etiquetas', [modeloDb(m)]);
}
export async function removerModeloDaNuvem(id: string) {
  await apagar('assistencia_etiquetas', [id]);
}
export async function salvarLojaNaNuvem(l: DadosLoja, ownerId: string) {
  const { error } = await supabase.from('assistencia_loja').upsert({ owner_id: ownerId, ...lojaDb(l) }, { onConflict: 'owner_id' });
  if (error) throw error;
}

// Envia de uma vez todos os dados (usado para levar para a conta o que estava só no aparelho)
export async function enviarTudo(d: AppData, modelos: ModeloEtiqueta[]) {
  for (const t of TABELAS) {
    const lista = d[t.chave] as never[];
    if (lista.length) await enviar(t.tabela, lista.map((x) => t.paraDb(x)));
  }
  if (modelos.length) await enviar('assistencia_etiquetas', modelos.map(modeloDb));
}
