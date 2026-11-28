// Opções e resumos das fichas em papel (ficha de entrada do produto e ficha de envio p/ assistência).
import type { FichaEnvio, ModeloConsole } from './types';

export const MODELOS_CONSOLE: { value: ModeloConsole; label: string }[] = [
  { value: 'xbox360', label: 'Xbox 360' },
  { value: 'xboxone', label: 'Xbox One' },
  { value: 'xboxs', label: 'Xbox Series S' },
  { value: 'ps2', label: 'PS2' },
  { value: 'ps3', label: 'PS3' },
  { value: 'ps4', label: 'PS4' },
  { value: 'ps5', label: 'PS5' },
];
export const VERSOES_CONSOLE: { value: 'fat' | 'slim'; label: string }[] = [
  { value: 'fat', label: 'Fat' },
  { value: 'slim', label: 'Slim' },
];
/** Cores da ficha — gravadas no campo "Cor" da OS */
export const CORES_CONSOLE = ['Branco', 'Preto', 'Série especial'];

export const TIPO_ENVIO: Record<NonNullable<FichaEnvio['tipo']>, string> = { manutencao: 'Manutenção', retorno: 'Retorno' };
export const ORIGEM_ENVIO: Record<NonNullable<FichaEnvio['origem']>, string> = { cliente: 'Cliente', loja: 'Loja' };
export const SITUACAO: Record<NonNullable<FichaEnvio['situacao']>, string> = {
  liga: 'Liga',
  nao_liga: 'Não liga',
  plin: 'Plin',
  sem_imagem: 'Liga sem imagem',
};
export const PROBLEMAS_CONTROLE: Record<NonNullable<FichaEnvio['controle']>[number], string> = {
  drift: 'Drift',
  botoes: 'Botões',
  setas: 'Setas',
  analogicos: 'Analógicos',
  placa: 'Placa',
};
export const SERVICOS_CONSOLE = [
  'Plin', 'Manutenção (limpeza)', 'HDMI', 'Placa reparo', 'Fonte', 'HD', 'Sistema',
  'Carcaça', 'Cooler', 'Processador', 'Bluetooth', 'NAND', 'Outros',
];

const rotuloModelo = (m?: ModeloConsole) => MODELOS_CONSOLE.find((x) => x.value === m)?.label ?? '';

/** Campos obrigatórios da ficha ao abrir uma OS nova. Devolve a mensagem do que falta, ou ''. */
export function faltaNaFicha(f: FichaEnvio): string {
  const falta = [!f.tipo && 'Manutenção ou Retorno', !f.origem && 'Cliente ou Loja', !f.situacao && 'se o aparelho liga'].filter(Boolean);
  return falta.length ? `Ficha de envio: marque ${falta.join(', ')}.` : '';
}

/** Linhas curtas da ficha (para a etiqueta e a tela da OS). Só devolve o que foi preenchido. */
export function resumoFichaEnvio(f: FichaEnvio | null | undefined): { rot: string; val: string }[] {
  if (!f) return [];
  const acomp = [
    f.controles ? `${f.controles} controle${f.controles > 1 ? 's' : ''}` : '',
    f.cabos ? 'cabos' : '',
    f.jogos ? 'jogos' : '',
  ].filter(Boolean);
  const estado = [
    f.situacao ? SITUACAO[f.situacao] : '',
    f.defeito === true ? 'com defeito' : f.defeito === false ? 'sem defeito' : '',
    f.ap ? 'AP' : '',
  ].filter(Boolean);
  const console = [rotuloModelo(f.modelo), f.versao === 'fat' ? 'Fat' : f.versao === 'slim' ? 'Slim' : ''].filter(Boolean);
  const servico = [...(f.servicos ?? []), f.servico?.trim() ?? ''].filter(Boolean);
  return [
    { rot: 'Tipo', val: [f.tipo ? TIPO_ENVIO[f.tipo] : '', f.origem ? ORIGEM_ENVIO[f.origem] : ''].filter(Boolean).join(' · ') },
    { rot: 'Estado', val: estado.join(' · ') },
    { rot: 'Console', val: console.join(' ') },
    { rot: 'Acomp.', val: acomp.join(', ') },
    { rot: 'Controle', val: (f.controle ?? []).map((c) => PROBLEMAS_CONTROLE[c]).join(', ') },
    { rot: 'Serviço', val: servico.join(', ') },
    { rot: 'Vendedor', val: f.vendedor?.trim() ?? '' },
  ].filter((l) => l.val);
}

/** Remove campos vazios; null se nada foi preenchido. */
export function limparObjeto<T extends object>(f: T): T | null {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return Object.keys(out).length ? (out as T) : null;
}
