// Gera as fichas em HTML (A4) a partir dos dados do app, no estilo das fichas da loja:
// Orçamento, Ficha técnica de entrada, Ficha técnica de saída / Ordem de venda e Ficha de envio p/ assistência.
import { ehDrone, fmtData, fmtMoeda, PAGAMENTO, defeitosSugeridos } from './format';
import type { Cliente, DadosLoja, FichaEnvio, OrdemServico, Venda } from './types';

export const LOJA_PADRAO: DadosLoja = {
  nome: 'Flygames Assistência Técnica',
  slogan: 'ELECTRONICS STORE & GAMES',
  endereco: 'Rua Larga do Feitosa, 262 - Apto. 104 - Encruzilhada',
  telefone: '(81) 98199-6969',
  email: 'flygamesbrasil@gmail.com',
  instagram: '@flygamesbrasil',
  documento: '',
  logo: null,
  marcaDagua: true,
  obsOrcamento: [
    'Este orçamento é válido por 30 dias a partir da data de emissão.',
    'O prazo de entrega será combinado após aprovação do orçamento.',
    'Em caso de desistência após início do serviço, será cobrado o valor proporcional.',
  ].join('\n'),
  termoVenda: [
    'GARANTIA E CONDIÇÕES',
    '01 - Produtos usados/seminovos podem apresentar sinais naturais de uso;',
    '02 - O comprador declara ter testado e conferido o funcionamento do produto no ato da compra;',
    'Produtos novos possuem garantia conforme o fabricante e legislação vigente;',
    'Produtos usados/seminovos possuem garantia de 90 dias, limitada a defeitos técnicos de funcionamento;',
    'Não estão cobertos pela garantia: Mau uso; Quedas; Oxidação; Uso de acessórios inadequados; Violação do lacre; Danos elétricos; Atualizações indevidas ou desbloqueios realizados por terceiros.',
    '03 - TROCAS E DEVOLUÇÕES',
    'Trocas somente mediante apresentação deste termo/comprovante;',
    'Não serão aceitas devoluções por mau uso ou danos causados após a entrega;',
    'Em caso de defeito dentro do prazo de garantia, o produto passará por análise técnica.',
    '04 - DECLARAÇÃO DO COMPRADOR',
    'O comprador declara estar ciente das condições do produto adquirido, bem como das regras de garantia, troca e devolução descritas neste documento.',
  ].join('\n'),
};

const esc = (s: string | undefined | null) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cb = (rotulo: string, marcado: boolean) =>
  `<span class="cb">(<b>${marcado ? 'X' : '&nbsp;&nbsp;'}</b>) ${rotulo}</span>`;

const numOS = (n: number) => String(n).padStart(4, '0');

// ---------- Detecção automática para as caixinhas ----------
function consoles(o: { marca: string; modelo: string }) {
  const t = `${o.marca} ${o.modelo}`.toUpperCase();
  const tem = (re: RegExp) => re.test(t);
  return {
    'XBOX 360': tem(/360/),
    FAT: tem(/\bFAT\b/),
    'XBOX ONE': tem(/XBOX\s*ONE|\bONE\b/),
    'XBOX S': tem(/SERIES\s*S\b|XBOX\s*S\b/),
    PS2: tem(/PS\s*2|PLAYSTATION\s*2/),
    PS3: tem(/PS\s*3|PLAYSTATION\s*3/),
    PS4: tem(/PS\s*4|PLAYSTATION\s*4/),
    PS5: tem(/PS\s*5|PLAYSTATION\s*5/),
    F: tem(/\bFAT\b|\bF\b/),
    S: tem(/SLIM|\bS\b/),
  };
}

const acessoriosMarcados = (txt: string) => {
  const t = (txt ?? '').toLowerCase();
  return { controle: /controle|joystick|dualsense|rádio|radio/.test(t), cabos: /cabo|fonte|carregador/.test(t), jogos: /jogo|disco|cartucho/.test(t) };
};

const naoLiga = (o: OrdemServico) => (o.defeitos ?? []).includes('Não liga');

// ---------- Estrutura comum ----------
function pagina(loja: DadosLoja, corTitulo: string, titulo: string, subtitulo: string, corpo: string) {
  const logo = loja.logo
    ? `<img class="logo" src="${loja.logo}"/>`
    : `<div class="logoTxt">${esc(loja.nome.split(' ')[0]).toUpperCase()}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #111; margin: 0; position: relative; }
  .wm { position: fixed; top: 32%; left: 10%; width: 80%; opacity: 0.08; z-index: -1; }
  .head { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .logo { height: 70px; max-width: 200px; object-fit: contain; }
  .logoTxt { font-size: 28pt; font-weight: 900; font-style: italic; border: 3px solid #111; border-radius: 10px; padding: 2px 12px; }
  .slogan { font-size: 7pt; letter-spacing: 0.5px; margin-top: 2px; text-align: center; }
  .tit { flex: 1; text-align: right; }
  .tit h1 { margin: 0; font-size: 20pt; color: ${corTitulo}; font-weight: 900; }
  .tit .sub { font-size: 9pt; }
  .contato { font-size: 8.5pt; line-height: 1.4; margin-top: 4px; }
  .box { border: 1.6px solid #111; border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
  .row { display: flex; border-bottom: 1px solid #111; min-height: 22px; align-items: center; }
  .row:last-child { border-bottom: none; }
  .cell { padding: 4px 8px; flex: 1; }
  .cell + .cell { border-left: 1px solid #111; }
  .lbl { font-weight: 700; }
  .cb { margin-right: 10px; white-space: nowrap; display: inline-block; line-height: 1.7; }
  .tri { display: flex; gap: 8px; margin-bottom: 8px; }
  .tri .box { margin: 0; padding: 8px 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #111; padding: 5px 7px; }
  th { background: #f1f3f6; }
  td.n { text-align: right; white-space: nowrap; }
  .obs { background: #f1f3f6; border-radius: 8px; padding: 8px 12px; font-size: 9pt; margin: 8px 0; }
  .termo { font-size: 8pt; line-height: 1.35; white-space: pre-line; padding: 8px 12px; }
  .ass { display: flex; gap: 40px; margin-top: 34px; }
  .ass div { flex: 1; border-top: 1.5px solid #111; text-align: center; padding-top: 4px; font-size: 9pt; }
  .linhas div { border-bottom: 1px solid #111; min-height: 22px; padding: 3px 8px; }
  .tot { display: flex; justify-content: flex-end; gap: 10px; margin: 4px 0; font-weight: 700; }
  .tot span:last-child { min-width: 120px; border: 1px solid #111; border-radius: 6px; padding: 3px 8px; text-align: right; }
</style></head><body>
${loja.logo && loja.marcaDagua ? `<img class="wm" src="${loja.logo}"/>` : ''}
<div class="head">
  <div>${logo}<div class="slogan">${esc(loja.slogan)}</div></div>
  <div class="tit">
    <h1>${titulo}</h1><div class="sub">${subtitulo}</div>
    <div class="contato">${esc(loja.telefone)} · ${esc(loja.instagram)}<br/>${esc(loja.endereco)}${loja.email ? `<br/>${esc(loja.email)}` : ''}${loja.documento ? `<br/>CNPJ: ${esc(loja.documento)}` : ''}</div>
  </div>
</div>
${corpo}
</body></html>`;
}

const campo = (rot: string, val: string | undefined | null) =>
  `<div class="cell"><span class="lbl">${rot}:</span> ${esc(val)}</div>`;

function blocoCliente(c: Cliente | undefined, extra = '') {
  return `<div class="box">
    <div class="row">${campo('Nome', c?.nome)}</div>
    <div class="row">${campo('Endereço', c?.endereco)}</div>
    <div class="row">${campo('RG ou CPF', c?.documento)}${campo('Tel', c?.telefone)}</div>
    ${extra}
  </div>`;
}

function gradeConsoles(o: { marca: string; modelo: string }, f?: FichaEnvio | null) {
  // com o modelo marcado na ficha, usa ele; senão tenta reconhecer pelo texto de marca/modelo
  const k = f?.modelo
    ? {
        'XBOX 360': f.modelo === 'xbox360',
        FAT: f.modelo === 'xbox360' && f.versao === 'fat',
        'XBOX ONE': f.modelo === 'xboxone',
        'XBOX S': f.modelo === 'xboxs',
        PS2: f.modelo === 'ps2',
        PS3: f.modelo === 'ps3',
        PS4: f.modelo === 'ps4',
        PS5: f.modelo === 'ps5',
        F: f.modelo.startsWith('ps') && f.versao === 'fat',
        S: f.modelo.startsWith('ps') && f.versao === 'slim',
      }
    : consoles(o);
  return `${cb('XBOX 360', k['XBOX 360'])}${cb('FAT', k.FAT)}${cb('XBOX ONE', k['XBOX ONE'])}${cb('XBOX S', k['XBOX S'])}<br/>
    ${cb('PS2', k.PS2)}${cb('PS3', k.PS3)}${cb('PS4', k.PS4)}${cb('PS5', k.PS5)} / ${cb('F', k.F)}${cb('S', k.S)}`;
}

// ---------- 1. Orçamento ----------
export function htmlOrcamento(o: OrdemServico, c: Cliente | undefined, loja: DadosLoja) {
  const itens = o.itensOrcamento?.length
    ? o.itensOrcamento
    : [{ id: '1', descricao: o.diagnostico || o.defeito, qtd: 1, valor: o.valorOrcamento }];
  const subtotal = itens.reduce((t, i) => t + i.qtd * i.valor, 0);
  const desconto = Math.max(0, subtotal - (o.valorFinal || subtotal));
  const linhasVazias = Math.max(0, 5 - itens.length);
  const def = new Set(o.defeitos ?? []);
  const corpo = `
  <div class="box">
    <div class="row">${campo('OS', numOS(o.numero))}${campo('Data', fmtData(new Date().toISOString()))}</div>
    <div class="row">${campo('Cliente', c?.nome)}</div>
    <div class="row">${campo('CNPJ / CPF', c?.documento)}</div>
    <div class="row">${campo('Endereço', c?.endereco)}</div>
    <div class="row">${campo('Telefone', c?.telefone)}</div>
    <div class="row">${campo('Aparelho', `${o.tipoEquipamento} ${o.marca} ${o.modelo}`)}${campo('Nº série', o.numeroSerie)}</div>
  </div>
  <table>
    <tr><th style="text-align:left">DESCRIÇÃO DO SERVIÇO</th><th>QUANT.</th><th>UNITÁRIO (R$)</th><th>TOTAL (R$)</th></tr>
    ${itens.map((i) => `<tr><td>${esc(i.descricao)}</td><td class="n" style="text-align:center">${i.qtd}</td><td class="n">${fmtMoeda(i.valor)}</td><td class="n">${fmtMoeda(i.qtd * i.valor)}</td></tr>`).join('')}
    ${'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(linhasVazias)}
  </table>
  <div style="display:flex;gap:16px;margin-top:8px">
    <div style="flex:1">
      ${cb('DEFEITO SIM', def.size > 0)} ${cb('NÃO', def.size === 0)}<br/>
      ${ehDrone(o.tipoEquipamento) ? `<b>Defeitos:</b> ${esc([...def].join(', ') || '—')}` : gradeConsoles(o)}<br/>
      ${cb('Aparelho liga?', !naoLiga(o))} ${cb('Aparelho não liga?', naoLiga(o))}
    </div>
    <div style="width:230px">
      <div class="tot"><span>Subtotal:</span><span>${fmtMoeda(subtotal)}</span></div>
      <div class="tot"><span>Desconto:</span><span>${fmtMoeda(desconto)}</span></div>
      <div class="tot"><span>Total Geral:</span><span>${fmtMoeda(subtotal - desconto)}</span></div>
    </div>
  </div>
  <div class="obs"><b>Observações</b><ol style="margin:4px 0 0 18px;padding:0">${loja.obsOrcamento.split('\n').filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>
  <div class="ass"><div>Assinatura do Cliente</div><div>Assinatura do Técnico</div></div>`;
  return pagina(loja, '#111', 'ORÇAMENTO CLIENTE', `Assistência Técnica · OS ${numOS(o.numero)}`, corpo);
}

// ---------- 2. Ficha técnica de entrada ----------
export function htmlFichaEntrada(o: OrdemServico, c: Cliente | undefined, loja: DadosLoja) {
  const ac = acessoriosMarcados(o.acessorios);
  const def = o.defeitos ?? [];
  const corpo = `
  <div class="tri">
    <div class="box" style="flex:1.4">${cb('Manutenção', true)}${cb('Compra', false)}<br/>${cb('Venda', false)}${cb('Troca', false)}</div>
    <div class="box" style="flex:1"><b>OS:</b> ${numOS(o.numero)}<br/><b>TEC:</b> ${esc(o.tecnico)}</div>
    <div class="box" style="flex:1">1º Via - ARQ<br/>2º Via - LOJA</div>
  </div>
  ${blocoCliente(
    c,
    `<div class="row">${campo('Entrada', fmtData(o.dataEntrada))}${campo('Valor orçado', o.valorOrcamento ? fmtMoeda(o.valorOrcamento) : '')}${campo('Previsão', fmtData(o.previsaoEntrega))}</div>
     <div class="row">${campo('Aparelho', `${o.tipoEquipamento} ${o.marca} ${o.modelo}`)}${campo('Cor', o.cor)}</div>
     <div class="row">${campo('NS', o.numeroSerie)}<div class="cell">${cb('DEFEITO SIM', def.length > 0)}${cb('NÃO', def.length === 0)}</div></div>
     <div class="row"><div class="cell">${cb('CONTROLE', ac.controle)}${cb('CABOS', ac.cabos)}${cb('JOGOS', ac.jogos)} &nbsp; ${cb('Aparelho liga?', !naoLiga(o))}${cb('Aparelho não liga?', naoLiga(o))}</div></div>
     ${ehDrone(o.tipoEquipamento) ? '' : `<div class="row"><div class="cell">${gradeConsoles(o)}</div></div>`}
     <div class="row">${campo('Acessórios', o.acessorios)}</div>`,
  )}
  <div class="box linhas">
    <div><b>Defeitos relatados:</b> ${esc(def.join(', '))}</div>
    <div><b>Estado do aparelho / relato:</b> ${esc(o.defeito)}</div>
    <div>${esc(o.diagnostico)}</div>
    <div>&nbsp;</div>
    <div><b>SERVIÇO:</b> ${esc(o.procedimentos.map((p) => p.descricao).join(', '))}</div>
    <div style="display:flex"><span style="flex:1"><b>FINAL:</b></span><span style="flex:1"><b>VENDA:</b></span></div>
  </div>
  <div class="ass"><div>Cliente ciente</div><div>Técnico / Vendedor</div></div>`;
  return pagina(loja, '#111', 'FICHA TÉCNICA ENTRADA', 'Ficha Interna', corpo);
}

// ---------- 3. Ficha técnica de saída (OS entregue) e Ordem de venda ----------
function fichaSaida(
  loja: DadosLoja,
  p: {
    tipo: 'manutencao' | 'venda';
    numero: string;
    vendedor?: string;
    entrada: string;
    saida: string;
    garantia: string;
    c: Cliente | undefined;
    serie: string;
    marca: string;
    cor: string;
    modelo: string;
    acessorios: string;
    usado: boolean | null;
    obs: string;
    itensHtml?: string;
  },
) {
  const ac = acessoriosMarcados(p.acessorios);
  const corpo = `
  <div class="tri">
    <div class="box" style="flex:1.4">${cb('Manutenção', p.tipo === 'manutencao')}<br/>${cb('Venda', p.tipo === 'venda')}${cb('Troca', false)}<br/>${cb('Garantia', false)}${cb('Compra', false)}</div>
    <div class="box" style="flex:1"><b>${p.tipo === 'venda' ? 'ORDEM DE VENDA' : 'ORDEM DE SERVIÇO'}</b><br/><b>Nº:</b> ${p.numero}<br/><b>VEN:</b> ${esc(p.vendedor)}</div>
    <div class="box" style="flex:1">1º Via - Loja<br/>2º Via - Cliente</div>
  </div>
  ${blocoCliente(
    p.c,
    `<div class="row">${campo('Entrada', p.entrada)}${campo('Garantia', p.garantia)}${campo('Saída', p.saida)}</div>
     <div class="row">${campo('Nº de série', p.serie)}</div>
     <div class="row">${campo('Marca', p.marca)}${campo('Cor', p.cor)}${campo('Mod', p.modelo)}</div>
     <div class="row"><div class="cell">${cb('CONTROLE', ac.controle)}${cb('CABOS', ac.cabos)}${cb('JOGOS', ac.jogos)}
       ${p.usado === null ? '' : `&nbsp; ${cb('Aparelho novo?', !p.usado)}${cb('Aparelho usado?', p.usado)}`}</div></div>
     <div class="row"><div class="cell">${gradeConsoles({ marca: p.marca, modelo: p.modelo })}</div><div class="cell"><b>OBSERVAÇÕES:</b> ${esc(p.obs)}</div></div>`,
  )}
  ${p.itensHtml ?? ''}
  <div class="box"><div style="text-align:center;font-weight:700;padding-top:6px">TERMO DE VENDA / SERVIÇO</div><div class="termo">${esc(loja.termoVenda)}</div></div>
  <div class="ass"><div>Cliente ciente</div><div>Vendedor</div></div>`;
  return pagina(loja, '#16a34a', 'FICHA TÉCNICA SAÍDA', p.tipo === 'venda' ? 'Ordem de venda' : 'Entrega de serviço', corpo);
}

export function htmlFichaSaidaOS(o: OrdemServico, c: Cliente | undefined, loja: DadosLoja) {
  const fimGarantia = o.garantiaDias
    ? fmtData(new Date((o.dataSaida ? new Date(o.dataSaida) : new Date()).getTime() + o.garantiaDias * 86400000).toISOString())
    : '';
  return fichaSaida(loja, {
    tipo: 'manutencao',
    numero: numOS(o.numero),
    vendedor: o.tecnico,
    entrada: fmtData(o.dataEntrada),
    saida: fmtData(o.dataSaida ?? new Date().toISOString()),
    garantia: o.garantiaDias ? `${o.garantiaDias} dias (até ${fimGarantia})` : 'Sem garantia',
    c,
    serie: o.numeroSerie,
    marca: o.marca,
    cor: o.cor ?? '',
    modelo: o.modelo,
    acessorios: o.acessorios,
    usado: null,
    obs: `${o.procedimentos.filter((p) => p.feito).map((p) => p.descricao).join(', ')}${o.valorFinal ? ` · Valor: ${fmtMoeda(o.valorFinal)}` : ''}`,
  });
}

export function htmlOrdemVenda(v: Venda, c: Cliente | undefined, loja: DadosLoja, usado: boolean) {
  const itensHtml = `<table style="margin-bottom:8px">
    <tr><th style="text-align:left">PRODUTO</th><th>QTD</th><th>UNITÁRIO</th><th>TOTAL</th></tr>
    ${v.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td class="n" style="text-align:center">${i.qtd}</td><td class="n">${fmtMoeda(i.precoUnit)}</td><td class="n">${fmtMoeda(i.qtd * i.precoUnit)}</td></tr>`).join('')}
    ${v.desconto ? `<tr><td colspan="3" class="n">Desconto</td><td class="n">- ${fmtMoeda(v.desconto)}</td></tr>` : ''}
    <tr><td colspan="3" class="n"><b>TOTAL</b> (${PAGAMENTO[v.pagamento]}${v.pagamento === 'parcelado' ? ` ${v.parcelas}x` : ''})</td><td class="n"><b>${fmtMoeda(v.total)}</b></td></tr>
  </table>`;
  const principal = v.itens[0];
  return fichaSaida(loja, {
    tipo: 'venda',
    numero: String(v.numero).padStart(4, '0'),
    entrada: fmtData(v.data),
    saida: fmtData(v.data),
    garantia: v.garantiaDias ? `${v.garantiaDias} dias` : 'Conforme fabricante',
    c,
    serie: '',
    marca: '',
    cor: '',
    modelo: principal?.nome ?? '',
    acessorios: v.itens.map((i) => i.nome).join(' '),
    usado,
    obs: v.observacoes,
    itensHtml,
  });
}

// ---------- 4. Ficha de envio para assistência ----------
const CHECK_GAME: { rotulo: string; defeitos: string[] }[] = [
  { rotulo: 'PLIN', defeitos: [] },
  { rotulo: 'MANUTENÇÃO (LIMPEZA)', defeitos: ['Superaquecendo'] },
  { rotulo: 'HDMI', defeitos: ['Sem imagem / HDMI'] },
  { rotulo: 'PLACA REPARO', defeitos: ['Luz azul / tela preta'] },
  { rotulo: 'FONTE', defeitos: ['Não liga'] },
  { rotulo: 'HD', defeitos: ['HD / SSD com falha'] },
  { rotulo: 'SISTEMA', defeitos: ['Erro de sistema'] },
  { rotulo: 'CARCAÇA', defeitos: ['Carcaça danificada'] },
  { rotulo: 'COOLER', defeitos: ['Ventoinha barulhenta', 'Superaquecendo'] },
  { rotulo: 'PROCESSADOR', defeitos: [] },
  { rotulo: 'BLUETOOTH', defeitos: ['Wi-Fi / Bluetooth falhando'] },
  { rotulo: 'NAND', defeitos: [] },
  { rotulo: 'OUTROS', defeitos: [] },
];

export function htmlEnvioAssistencia(o: OrdemServico, c: Cliente | undefined, loja: DadosLoja) {
  const def = new Set(o.defeitos ?? []);
  // OS novas trazem a ficha preenchida; nas antigas as caixinhas são deduzidas dos defeitos/acessórios
  const f = o.fichaEnvio ?? null;
  const acTxt = acessoriosMarcados(o.acessorios);
  const ac = f
    ? { c1: f.controles === 1, c2: f.controles === 2, cabos: !!f.cabos, jogos: !!f.jogos }
    : { c1: acTxt.controle, c2: false, cabos: acTxt.cabos, jogos: acTxt.jogos };
  const sit = f?.situacao ?? (naoLiga(o) ? 'nao_liga' : def.has('Sem imagem / HDMI') ? 'sem_imagem' : 'liga');
  const comDefeito = f?.defeito ?? def.size > 0;
  const ctl = new Set<string>(f?.controle ?? [...(def.has('Drift no analógico') ? ['drift', 'analogicos'] : []), ...(def.has('Botão falhando') ? ['botoes'] : [])]);
  const servicos = new Set((f?.servicos ?? []).map((s) => s.toUpperCase()));
  const cor = (o.cor ?? '').toLowerCase();
  const drone = ehDrone(o.tipoEquipamento);
  const grade = drone
    ? defeitosSugeridos(o.tipoEquipamento).map((d) => cb(d.toUpperCase(), def.has(d))).join('')
    : CHECK_GAME.map((i) => cb(i.rotulo, f ? servicos.has(i.rotulo) : i.defeitos.some((d) => def.has(d)))).join('');
  const servicoTxt = [f?.servico, o.procedimentos.map((p) => p.descricao).join(', ')].filter(Boolean).join(' · ');
  const corpo = `
  <div class="tri">
    <div class="box" style="flex:1.4">${cb('Manutenção', f ? f.tipo === 'manutencao' : true)}${cb('Loja', f?.origem === 'loja')}<br/>${cb('Cliente', f ? f.origem === 'cliente' : true)}${cb('Retorno', f?.tipo === 'retorno')}</div>
    <div class="box" style="flex:1"><b>OS:</b> ${numOS(o.numero)}<br/><b>TEC:</b> ${esc(o.tecnico)}<br/><b>VEN:</b> ${esc(f?.vendedor)}</div>
    <div class="box" style="flex:1">1º Via - Loja<br/>2º Via - Assist.</div>
  </div>
  ${blocoCliente(
    c,
    `<div class="row">${campo('Entrada', fmtData(o.dataEntrada))}${campo('Garantia', o.garantiaDias ? `${o.garantiaDias} dias` : '')}${campo('Saída', o.dataSaida ? fmtData(o.dataSaida) : '')}</div>
     <div class="row">${campo('Nº de série', o.numeroSerie)}</div>
     <div class="row">${campo('Marca', o.marca)}${campo('Cor', o.cor)}${campo('Mod', o.modelo)}</div>
     <div class="row"><div class="cell">${cb('CONTROLE 1', ac.c1)}${cb('2', ac.c2)}${cb('CABOS', ac.cabos)}${cb('JOGOS', ac.jogos)}
       &nbsp; ${cb(drone ? 'LIGA' : 'CONSOLE LIGA', sit === 'liga')}${cb('NÃO LIGA', sit === 'nao_liga')}${drone ? '' : cb('PLIN', sit === 'plin') + cb('LIGA SEM IMAGEM', sit === 'sem_imagem')}${cb('AP', !!f?.ap)}</div></div>`,
  )}
  <div class="box">
    <div class="row"><div class="cell"><b>${drone ? 'DRONE' : 'CONSOLE'}:</b> ${cb('DEFEITO SIM', comDefeito)}${cb('NÃO', !comDefeito)}</div></div>
    ${drone ? '' : `<div class="row"><div class="cell">${gradeConsoles(o, f)}</div></div>
    <div class="row"><div class="cell">${cb('Branco', cor.includes('branc'))}${cb('Preto', cor.includes('pret'))}${cb('Serie ESP.', cor.includes('especial'))}</div></div>
    <div class="row"><div class="cell"><b>CONTROLE:</b> ${cb('DRIFT', ctl.has('drift'))}${cb('BOTÕES', ctl.has('botoes'))}${cb('SETAS', ctl.has('setas'))}${cb('ANALÓGICOS', ctl.has('analogicos'))}${cb('PLACA', ctl.has('placa'))}</div></div>`}
    <div class="row"><div class="cell">${grade}</div></div>
    <div class="row">${campo('SERVIÇO', servicoTxt)}</div>
  </div>
  <div class="box linhas">
    <div><b>DESCRITIVO / DEFEITO:</b> ${esc(o.defeito)}</div>
    <div>${esc(o.diagnostico)}</div>
    <div>&nbsp;</div><div>&nbsp;</div>
  </div>`;
  return pagina(loja, '#dc2626', 'FICHA ENVIO ASSISTÊNCIA', `OS ${numOS(o.numero)}`, corpo);
}
