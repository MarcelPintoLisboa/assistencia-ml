import { fmtData, uid } from './format';
import type { Cliente, DadosLoja, ModeloEtiqueta, OrdemServico, TamanhoEtiqueta } from './types';

/** Modelo pronto para imprimir: sem logo próprio, usa o logo da empresa; sem título, o nome da empresa. */
export const comLoja = (m: ModeloEtiqueta, loja: DadosLoja): ModeloEtiqueta => ({
  ...m,
  logo: m.logo ?? loja.logo ?? null,
  titulo: m.titulo || loja.nome,
});

export const TAMANHOS: Record<TamanhoEtiqueta, { w: number; h: number; label: string }> = {
  '50x30': { w: 50, h: 30, label: '50 × 30 mm' },
  '60x40': { w: 60, h: 40, label: '60 × 40 mm' },
  '80x50': { w: 80, h: 50, label: '80 × 50 mm' },
  '100x50': { w: 100, h: 50, label: '100 × 50 mm' },
  '100x150': { w: 100, h: 150, label: '100 × 150 mm' },
};

/** mm → pontos (72 por polegada), unidade usada pelo expo-print */
export const mmParaPt = (mm: number) => Math.round((mm * 72) / 25.4);

export const fonteBase = (t: TamanhoEtiqueta) => ({ '50x30': 6.5, '60x40': 7.5, '80x50': 8.5, '100x50': 9, '100x150': 12 })[t];

export function modeloPadrao(): ModeloEtiqueta {
  return {
    id: 'padrao',
    nome: 'Padrão',
    tamanho: '60x40',
    corDestaque: '#0891B2',
    corTexto: '#0B1220',
    corFundo: '#FFFFFF',
    logo: null,
    fundo: null,
    opacidadeFundo: 0.15,
    titulo: 'ASSISTÊNCIA TÉCNICA',
    rodape: '',
    mostrar: { cliente: true, telefone: true, datas: true, serie: true, acessorios: false, descricao: true, contato: false },
  };
}

export const novoModelo = (base?: ModeloEtiqueta): ModeloEtiqueta => ({
  ...(base ?? modeloPadrao()),
  id: uid(),
  nome: base ? `${base.nome} (cópia)` : 'Novo modelo',
});

/** Dados mostrados numa etiqueta — usado tanto na prévia quanto no HTML. */
export function conteudoEtiqueta(o: OrdemServico, c: Cliente | undefined) {
  return {
    numero: `OS ${String(o.numero).padStart(4, '0')}`,
    equipamento: `${o.tipoEquipamento} · ${o.marca} ${o.modelo}`.trim(),
    defeitos: o.defeitos ?? [],
    descricao: o.defeito,
    cliente: c?.nome ?? '',
    telefone: c?.telefone ?? '',
    entrada: fmtData(o.dataEntrada),
    previsao: o.previsaoEntrega ? fmtData(o.previsaoEntrega) : '',
    serie: o.numeroSerie,
    acessorios: o.acessorios,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function htmlEtiqueta(
  o: OrdemServico,
  c: Cliente | undefined,
  m: ModeloEtiqueta,
  contato: string,
  copias = 1,
) {
  const { w, h } = TAMANHOS[m.tamanho];
  const f = fonteBase(m.tamanho);
  const d = conteudoEtiqueta(o, c);
  const linha = (rot: string, val: string) =>
    val ? `<div class="l"><b>${rot}:</b> ${esc(val)}</div>` : '';

  const uma = `
  <div class="et">
    ${m.fundo ? `<div class="bg" style="background-image:url('${m.fundo}');opacity:${m.opacidadeFundo}"></div>` : ''}
    <div class="ct">
      <div class="top">
        ${m.logo ? `<img class="logo" src="${m.logo}"/>` : ''}
        <div class="tt">${esc(m.titulo)}</div>
        <div class="num">${d.numero}</div>
      </div>
      <div class="eq">${esc(d.equipamento)}</div>
      ${d.defeitos.length ? `<div class="chips">${d.defeitos.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
      ${m.mostrar.descricao && d.descricao ? `<div class="desc">${esc(d.descricao)}</div>` : ''}
      ${m.mostrar.cliente ? linha('Cliente', d.cliente) : ''}
      ${m.mostrar.telefone ? linha('Tel', d.telefone) : ''}
      ${m.mostrar.datas ? linha('Entrada', d.entrada + (d.previsao ? `  ·  Prev.: ${d.previsao}` : '')) : ''}
      ${m.mostrar.serie ? linha('Série', d.serie) : ''}
      ${m.mostrar.acessorios ? linha('Acess.', d.acessorios) : ''}
      ${m.rodape || (m.mostrar.contato && contato) ? `<div class="rod">${esc([m.rodape, m.mostrar.contato ? contato : ''].filter(Boolean).join('  ·  '))}</div>` : ''}
    </div>
  </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: ${f}pt; color: ${m.corTexto}; }
  .et { width: ${w}mm; height: ${h}mm; position: relative; overflow: hidden; background: ${m.corFundo};
        page-break-after: always; break-after: page; }
  .bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .ct { position: relative; padding: 1.8mm 2.2mm; height: 100%; display: flex; flex-direction: column; gap: 0.6mm; }
  .top { display: flex; align-items: center; gap: 1.5mm; border-bottom: 0.4mm solid ${m.corDestaque}; padding-bottom: 0.8mm; }
  .logo { height: ${f * 2.4}pt; max-width: 30%; object-fit: contain; }
  .tt { flex: 1; font-weight: 700; font-size: ${f * 0.85}pt; letter-spacing: 0.3pt; }
  .num { background: ${m.corDestaque}; color: #fff; font-weight: 800; padding: 0.4mm 1.4mm; border-radius: 1mm; font-size: ${f * 1.15}pt; white-space: nowrap; }
  .eq { font-weight: 800; font-size: ${f * 1.1}pt; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.8mm; }
  .chip { border: 0.3mm solid ${m.corDestaque}; color: ${m.corTexto}; border-radius: 3mm; padding: 0.1mm 1.2mm; font-weight: 700; font-size: ${f * 0.9}pt; }
  .desc { font-style: italic; }
  .l b { color: ${m.corDestaque}; }
  .rod { margin-top: auto; font-size: ${f * 0.8}pt; text-align: center; opacity: 0.85; }
</style></head><body>${Array.from({ length: Math.max(1, copias) }, () => uma).join('')}</body></html>`;
}
