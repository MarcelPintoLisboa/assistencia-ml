export type StatusOS =
  | 'recebido'
  | 'diagnostico'
  | 'aguardando_aprovacao'
  | 'aguardando_peca'
  | 'em_reparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  notas: string;
  criadoEm: string;
}

export interface Procedimento {
  id: string;
  descricao: string;
  feito: boolean;
}

export interface HistoricoOS {
  data: string;
  status: StatusOS;
  nota?: string;
}

export interface OrdemServico {
  id: string;
  numero: number;
  clienteId: string;
  tipoEquipamento: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  acessorios: string;
  defeito: string;
  diagnostico: string;
  status: StatusOS;
  prioridade: Prioridade;
  valorOrcamento: number;
  valorFinal: number;
  dataEntrada: string;
  previsaoEntrega: string | null;
  dataSaida: string | null;
  garantiaDias: number;
  procedimentos: Procedimento[];
  historico: HistoricoOS[];
  notificationId?: string | null;
}

export type TipoAgendamento = 'visita' | 'entrega' | 'retirada' | 'manutencao' | 'retorno' | 'outro';

export interface Agendamento {
  id: string;
  titulo: string;
  tipo: TipoAgendamento;
  data: string;
  lembreteMin: number;
  clienteId: string | null;
  ordemId: string | null;
  notas: string;
  concluido: boolean;
  notificationId?: string | null;
}

export interface AppData {
  clientes: Cliente[];
  ordens: OrdemServico[];
  agendamentos: Agendamento[];
  proximoNumero: number;
}
