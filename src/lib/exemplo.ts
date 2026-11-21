import { uid } from './format';
import type { Agendamento, AppData, CategoriaProduto, Cliente, FormaPagamento, OrdemServico, Produto, StatusOS, Venda } from './types';

const nomes = [
  ['Ana Souza', '(11) 98877-1122'],
  ['Bruno Lima', '(11) 97766-3344'],
  ['Carla Mendes', '(21) 99654-7788'],
  ['Diego Rocha', '(31) 98123-4567'],
  ['Elaine Costa', '(41) 99888-0001'],
  ['Felipe Araújo', '(51) 98444-2299'],
];

const equipamentos: [string, string, string, string][] = [
  ['Drone', 'DJI', 'Mini 4 Pro', 'Queda na água, não liga'],
  ['Videogame', 'Sony', 'PS5', 'Superaquecendo e desligando'],
  ['Drone', 'DJI', 'Air 3', 'Gimbal tremendo, erro de calibração'],
  ['Controle / joystick', 'Sony', 'DualSense', 'Analógico com drift'],
  ['Videogame', 'Microsoft', 'Xbox Series X', 'Sem sinal no HDMI'],
  ['Rádio controle', 'DJI', 'RC-N2', 'Perde conexão com o drone'],
  ['Console portátil', 'Nintendo', 'Switch OLED', 'Não carrega'],
  ['Drone', 'DJI', 'Mavic 3', 'Motor travado após queda'],
];

const DEFEITOS: string[][] = [
  ['Contato com água', 'Não liga'],
  ['Superaquecendo', 'Ventoinha barulhenta'],
  ['Gimbal com erro', 'Erro de IMU / bússola'],
  ['Drift no analógico'],
  ['Sem imagem / HDMI'],
  ['Perda de sinal'],
  ['Não carrega'],
  ['Motor travado', 'Queda / impacto', 'Hélice quebrada'],
];

const CATALOGO: [string, CategoriaProduto, string, number, number, number, boolean][] = [
  ['DJI Mini 4 Pro Fly More', 'drone', 'DJI', 5200, 6899, 3, false],
  ['DJI Air 3', 'drone', 'DJI', 7400, 9499, 2, false],
  ['DJI Mini 2 SE (seminovo)', 'drone', 'DJI', 1500, 2299, 1, true],
  ['PlayStation 5 Slim', 'videogame', 'Sony', 3100, 3899, 4, false],
  ['Xbox Series S', 'videogame', 'Microsoft', 1900, 2499, 3, false],
  ['PS4 Pro (seminovo)', 'videogame', 'Sony', 1100, 1699, 2, true],
  ['Nintendo Switch OLED', 'videogame', 'Nintendo', 1900, 2499, 2, false],
  ['Controle DualSense', 'controle', 'Sony', 280, 449, 8, false],
  ['Controle Xbox Wireless', 'controle', 'Microsoft', 260, 429, 6, false],
  ['EA FC 26 (PS5)', 'jogo', 'EA', 180, 299, 10, false],
  ['Bateria Mini 4 Pro', 'acessorio', 'DJI', 520, 799, 5, false],
  ['Hélices Mini 4 Pro (par)', 'peca', 'DJI', 25, 79, 30, false],
];

const proc = (...d: string[]) => d.map((descricao, i) => ({ id: uid(), descricao, feito: i === 0 }));

export function gerarExemplo(): AppData {
  const agora = new Date();
  const dia = (offset: number, h = 10) => {
    const d = new Date(agora);
    d.setDate(d.getDate() + offset);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };

  const clientes: Cliente[] = nomes.map(([nome, telefone], i) => ({
    id: uid() + i,
    nome,
    telefone,
    email: nome.split(' ')[0].toLowerCase() + '@email.com',
    endereco: '',
    notas: '',
    criadoEm: dia(-90),
  }));

  const ordens: OrdemServico[] = [];
  let numero = 1;
  // Distribui entradas pelos últimos ~150 dias
  for (let i = 0; i < 34; i++) {
    const entrada = -Math.floor(150 * Math.pow(i / 34, 1.4)) - (i % 3);
    const eq = equipamentos[i % equipamentos.length];
    const idade = -entrada;
    let status: StatusOS;
    if (idade > 12) status = i % 11 === 0 ? 'cancelado' : 'entregue';
    else if (idade > 8) status = 'pronto';
    else status = (['recebido', 'diagnostico', 'aguardando_aprovacao', 'aguardando_peca', 'em_reparo'] as StatusOS[])[i % 5];
    const saida = status === 'entregue' ? dia(Math.min(entrada + 3 + (i % 6), 0), 16) : null;
    const valor = 120 + ((i * 73) % 600);
    ordens.push({
      id: uid() + i,
      numero: numero++,
      clienteId: clientes[i % clientes.length].id,
      tipoEquipamento: eq[0],
      marca: eq[1],
      modelo: eq[2],
      numeroSerie: 'SN' + (100000 + i * 137),
      acessorios: i % 2 ? (eq[0] === 'Drone' ? '2 baterias, controle' : 'Cabo HDMI, fonte') : '',
      defeito: eq[3],
      defeitos: DEFEITOS[i % DEFEITOS.length],
      cor: i % 2 ? 'Preto' : 'Branco',
      tecnico: 'Marcel',
      diagnostico: status === 'recebido' ? '' : 'Avaliado em bancada.',
      status,
      prioridade: i % 7 === 0 ? 'urgente' : i % 4 === 0 ? 'alta' : 'normal',
      valorOrcamento: valor,
      valorFinal: status === 'entregue' ? valor : 0,
      dataEntrada: dia(entrada, 9),
      previsaoEntrega: dia(entrada + 5, 17),
      dataSaida: saida,
      garantiaDias: 90,
      procedimentos:
        eq[0] === 'Drone'
          ? proc('Inspeção visual', 'Teste de motores', 'Calibrar IMU e bússola', 'Teste de voo')
          : proc('Testes iniciais', 'Limpeza interna', 'Troca de pasta térmica', 'Teste final'),
      historico: [{ data: dia(entrada, 9), status: 'recebido', nota: 'Equipamento recebido' }],
    });
  }

  const ag = (offsetDias: number, h: number, titulo: string, tipo: Agendamento['tipo'], c: number): Agendamento => ({
    id: uid() + titulo.length,
    titulo,
    tipo,
    data: dia(offsetDias, h),
    lembreteMin: 60,
    clienteId: clientes[c].id,
    ordemId: null,
    notas: '',
    concluido: false,
  });

  const agendamentos = [
    ag(0, 15, 'Entrega do DJI Air 3', 'entrega', 2),
    ag(1, 9, 'Teste de voo com cliente — Mavic 3', 'visita', 3),
    ag(2, 14, 'Retirada do PS5', 'retirada', 1),
    ag(5, 10, 'Revisão preventiva — frota de drones', 'manutencao', 4),
  ];

  const produtos: Produto[] = CATALOGO.map(([nome, categoria, marca, custo, preco, estoque, usado], i) => ({
    id: 'p' + i + uid(), nome, categoria, marca, sku: 'SKU' + (1000 + i), custo, preco,
    estoque, estoqueMinimo: categoria === 'peca' ? 10 : 2, usado, ativo: true, criadoEm: dia(-120),
  }));

  const pagamentos: FormaPagamento[] = ['pix', 'credito', 'parcelado', 'debito', 'dinheiro'];
  const vendas: Venda[] = [];
  for (let i = 0; i < 46; i++) {
    const offset = -Math.floor(170 * Math.pow(i / 46, 1.3));
    const p = produtos[(i * 7) % produtos.length];
    const extra = i % 3 === 0 ? produtos[7 + (i % 3)] : null;
    const itens = [p, ...(extra && extra.id !== p.id ? [extra] : [])].map((x) => ({
      produtoId: x.id, nome: x.nome, categoria: x.categoria, qtd: 1, precoUnit: x.preco, custoUnit: x.custo,
    }));
    const bruto = itens.reduce((t, x) => t + x.precoUnit * x.qtd, 0);
    const desconto = i % 5 === 0 ? Math.round(bruto * 0.05) : 0;
    const pg = pagamentos[i % pagamentos.length];
    vendas.push({
      id: 'v' + i + uid(), numero: 46 - i, data: dia(offset, 10 + (i % 8)), clienteId: i % 2 ? clientes[i % clientes.length].id : null,
      itens, desconto, total: bruto - desconto, pagamento: pg, parcelas: pg === 'parcelado' ? 10 : 1,
      garantiaDias: p.usado ? 90 : 365, observacoes: '', status: i === 9 ? 'cancelada' : 'concluida',
    });
  }

  return { clientes, ordens, agendamentos, produtos, vendas, proximoNumero: numero, proximaVenda: 47 };
}
