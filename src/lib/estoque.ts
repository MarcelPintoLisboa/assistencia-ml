import type { ItemVenda, Produto } from './types';

/** Nomes dos itens cuja quantidade passa do estoque (ou cujo produto não existe / foi excluído). */
export function itensSemEstoque(itens: ItemVenda[], produtos: Produto[]): string[] {
  const pedido = new Map<string, { nome: string; qtd: number }>();
  for (const i of itens) {
    const atual = pedido.get(i.produtoId);
    pedido.set(i.produtoId, { nome: i.nome, qtd: (atual?.qtd ?? 0) + i.qtd });
  }
  const faltam: string[] = [];
  for (const [id, { nome, qtd }] of pedido) {
    const p = produtos.find((x) => x.id === id);
    if (!p || p.excluido || !p.ativo || qtd <= 0 || qtd > p.estoque) faltam.push(nome);
  }
  return faltam;
}
