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
  /** CPF / CNPJ / RG */
  documento?: string;
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
  cor?: string;
  tecnico?: string;
  itensOrcamento?: ItemOrcamento[];
  acessorios: string;
  defeito: string;
  /** Defeitos marcados rapidamente (aparecem na etiqueta). */
  defeitos?: string[];
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
  /** Ficha de envio para assistência (preenchida ao abrir a OS; sai na etiqueta). undefined = OS antiga */
  fichaEnvio?: FichaEnvio | null;
}

export type ModeloConsole = 'xbox360' | 'xboxone' | 'xboxs' | 'ps2' | 'ps3' | 'ps4' | 'ps5';

/** Campos da "Ficha envio assistência" em papel que não existem como campo próprio da OS. */
export interface FichaEnvio {
  tipo?: 'manutencao' | 'retorno';
  origem?: 'cliente' | 'loja';
  vendedor?: string;
  /** Quantidade de controles deixados (1 ou 2) */
  controles?: number;
  cabos?: boolean;
  jogos?: boolean;
  /** Como o aparelho chegou */
  situacao?: 'liga' | 'nao_liga' | 'plin' | 'sem_imagem';
  ap?: boolean;
  /** Console com defeito? */
  defeito?: boolean;
  modelo?: ModeloConsole;
  versao?: 'fat' | 'slim';
  /** Problemas do controle */
  controle?: ('drift' | 'botoes' | 'setas' | 'analogicos' | 'placa')[];
  /** Itens do checklist de serviço (rótulos de SERVICOS_CONSOLE) */
  servicos?: string[];
  /** Serviço (texto livre) */
  servico?: string;
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


export type CategoriaProduto = 'drone' | 'videogame' | 'controle' | 'jogo' | 'acessorio' | 'peca';

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  marca: string;
  sku: string;
  custo: number;
  preco: number;
  estoque: number;
  estoqueMinimo: number;
  /** Item usado/seminovo */
  usado: boolean;
  ativo: boolean;
  criadoEm: string;
  /** Exclusão lógica: some das listas e das vendas, mas o histórico continua apontando para ele */
  excluido?: boolean;
  excluidoEm?: string | null;
  /** Ficha técnica de entrada (tudo opcional). null = sem ficha; undefined = coluna ainda não existe na nuvem */
  ficha?: FichaEntrada | null;
  /** Modelo (ex.: PS5 Slim, Mini 4 Pro) — opcional, aparece no story */
  modelo?: string;
  /** Foto do produto (data URI) — opcional */
  foto?: string | null;
}

/** Campos da "Ficha técnica de entrada" em papel. Nenhum é obrigatório. */
export interface FichaEntrada {
  tipo?: 'manutencao' | 'venda' | 'compra' | 'troca';
  /** Data de entrada (ISO) */
  data?: string;
  os?: string;
  tecnico?: string;
  exProprietario?: string;
  endereco?: string;
  documento?: string;
  telefone?: string;
  numeroSerie?: string;
  defeito?: boolean;
  origem?: 'facebook' | 'olx' | 'outros';
  cor?: 'branco' | 'preto' | 'especial';
  acompanha?: ('controle' | 'cabos' | 'jogos')[];
  liga?: boolean;
  modelo?: ModeloConsole;
  versao?: 'fat' | 'slim';
  estado?: string;
  servico?: string;
  final?: string;
  observacoes?: string;
}

/** Usuário da loja (tabela assistencia_usuarios) */
export interface Membro {
  id: string;
  email: string;
  nome: string;
  /** true = administrador; false = usuário comum */
  admin: boolean;
  ativo: boolean;
  /** Dono da loja (não pode ser alterado nem removido) */
  dono: boolean;
  /** Ainda não trocou a senha provisória */
  trocarSenha: boolean;
  criadoEm: string;
}

/** Empresa cadastrada pelo administrador geral (identificada pela conta do dono) */
export interface Empresa {
  id: string;
  nome: string;
  donoEmail: string;
  usuarios: number;
}

export interface ItemVenda {
  produtoId: string;
  nome: string;
  categoria: CategoriaProduto;
  qtd: number;
  precoUnit: number;
  custoUnit: number;
}

export type FormaPagamento = 'pix' | 'dinheiro' | 'debito' | 'credito' | 'parcelado';

export interface Venda {
  id: string;
  numero: number;
  data: string;
  clienteId: string | null;
  itens: ItemVenda[];
  desconto: number;
  total: number;
  pagamento: FormaPagamento;
  parcelas: number;
  garantiaDias: number;
  observacoes: string;
  status: 'concluida' | 'cancelada';
}

export type TamanhoEtiqueta = '50x30' | '60x40' | '80x50' | '100x50' | '100x150';

export interface ModeloEtiqueta {
  id: string;
  nome: string;
  tamanho: TamanhoEtiqueta;
  corDestaque: string;
  corTexto: string;
  corFundo: string;
  /** data URI (base64) */
  logo: string | null;
  fundo: string | null;
  opacidadeFundo: number;
  titulo: string;
  rodape: string;
  mostrar: {
    cliente: boolean;
    telefone: boolean;
    datas: boolean;
    serie: boolean;
    acessorios: boolean;
    descricao: boolean;
    contato: boolean;
    /** Ficha de envio (estado, acessórios, controle, serviços). Ausente em modelos antigos = mostrar. */
    ficha?: boolean;
  };
}

export interface AppData {
  clientes: Cliente[];
  ordens: OrdemServico[];
  agendamentos: Agendamento[];
  produtos: Produto[];
  vendas: Venda[];
  proximoNumero: number;
  proximaVenda: number;
}

export interface ItemOrcamento {
  id: string;
  descricao: string;
  qtd: number;
  valor: number;
}

export interface DadosLoja {
  nome: string;
  slogan: string;
  endereco: string;
  telefone: string;
  email: string;
  instagram: string;
  documento: string;
  logo: string | null;
  /** Logo em marca d'água no fundo das fichas */
  marcaDagua: boolean;
  obsOrcamento: string;
  termoVenda: string;
}
