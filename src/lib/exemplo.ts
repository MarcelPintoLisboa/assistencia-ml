import { uid } from './format';
import type { Agendamento, AppData, Cliente, OrdemServico, StatusOS } from './types';

const nomes = [
  ['Ana Souza', '(11) 98877-1122'],
  ['Bruno Lima', '(11) 97766-3344'],
  ['Carla Mendes', '(21) 99654-7788'],
  ['Diego Rocha', '(31) 98123-4567'],
  ['Elaine Costa', '(41) 99888-0001'],
  ['Felipe Araújo', '(51) 98444-2299'],
];

const equipamentos: [string, string, string, string][] = [
  ['Celular', 'Samsung', 'Galaxy S23', 'Tela trincada, touch falhando'],
  ['Notebook', 'Dell', 'Inspiron 15', 'Não liga, possível fonte'],
  ['Celular', 'Apple', 'iPhone 13', 'Bateria descarregando rápido'],
  ['Impressora', 'HP', 'LaserJet M1132', 'Atolando papel'],
  ['Tablet', 'Lenovo', 'Tab M10', 'Conector de carga solto'],
  ['Computador', 'Montado', 'Ryzen 5', 'Reiniciando sozinho'],
  ['TV', 'LG', '50UQ8050', 'Sem imagem, com som'],
  ['Videogame', 'Sony', 'PS5', 'Superaquecendo'],
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
      acessorios: i % 2 ? 'Carregador' : '',
      defeito: eq[3],
      diagnostico: status === 'recebido' ? '' : 'Avaliado em bancada.',
      status,
      prioridade: i % 7 === 0 ? 'urgente' : i % 4 === 0 ? 'alta' : 'normal',
      valorOrcamento: valor,
      valorFinal: status === 'entregue' ? valor : 0,
      dataEntrada: dia(entrada, 9),
      previsaoEntrega: dia(entrada + 5, 17),
      dataSaida: saida,
      garantiaDias: 90,
      procedimentos: proc('Testes iniciais', 'Abrir e limpar', 'Substituir componente', 'Teste final'),
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
    ag(0, 15, 'Entrega do iPhone 13', 'entrega', 2),
    ag(1, 9, 'Visita para instalação de impressora', 'visita', 3),
    ag(2, 14, 'Retirada de notebook', 'retirada', 1),
    ag(5, 10, 'Manutenção preventiva — servidor', 'manutencao', 4),
  ];

  return { clientes, ordens, agendamentos, proximoNumero: numero };
}
