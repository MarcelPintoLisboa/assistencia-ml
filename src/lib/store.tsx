import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth';
import { gerarExemplo } from './exemplo';
import {
  carregarDaNuvem, enviarDiferencas, enviarTudo, removerModeloDaNuvem, salvarLojaNaNuvem, salvarModeloNaNuvem,
} from './nuvem';
import { mensagemErro } from './supabase';
import { fmtHora, STATUS, TIPO_AG, uid } from './format';
import { agendarAviso, cancelarAviso } from './notifications';
import { LOJA_PADRAO } from './documentos';
import { modeloPadrao } from './etiqueta';
import type { Agendamento, AppData, Cliente, DadosLoja, ModeloEtiqueta, OrdemServico, Produto, StatusOS, Venda } from './types';

// Os dados ficam na base de dados (Supabase), separados por usuário.
// Estas chaves guardavam os dados só no aparelho (versão sem login): são oferecidos para envio à conta.
const CHAVE = '@assistencia-ml/dados-v1';
const CHAVE_MODELOS = '@assistencia-ml/etiquetas-v1';
const CHAVE_LOJA = '@assistencia-ml/loja-v1';
// Continuam no aparelho: o PIN do administrador e os ids dos avisos agendados neste aparelho.
const CHAVE_PIN = '@assistencia-ml/admin-pin';
const CHAVE_AVISOS = '@assistencia-ml/avisos-v1';
const VAZIO: AppData = {
  clientes: [], ordens: [], agendamentos: [], produtos: [], vendas: [], proximoNumero: 1, proximaVenda: 1,
};

const STATUS_FECHADOS: StatusOS[] = ['pronto', 'entregue', 'cancelado'];

async function avisoDaOrdem(o: OrdemServico, nomeCliente: string) {
  await cancelarAviso(o.notificationId);
  if (!o.previsaoEntrega || STATUS_FECHADOS.includes(o.status)) return null;
  const prev = new Date(o.previsaoEntrega);
  let quando = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 8, 0);
  if (quando.getTime() < Date.now() || quando > prev) quando = new Date(prev.getTime() - 60 * 60000);
  return agendarAviso(
    `OS #${o.numero} vence hoje`,
    `${o.tipoEquipamento} ${o.marca} ${o.modelo} de ${nomeCliente} — previsão às ${fmtHora(o.previsaoEntrega)}.`,
    quando,
    { ordemId: o.id },
  );
}

async function avisoDoAgendamento(a: Agendamento) {
  await cancelarAviso(a.notificationId);
  if (a.concluido) return null;
  const quando = new Date(new Date(a.data).getTime() - a.lembreteMin * 60000);
  return agendarAviso(
    `${TIPO_AG[a.tipo].label}: ${a.titulo}`,
    `Agendado para ${fmtHora(a.data)}.${a.notas ? ' ' + a.notas : ''}`,
    quando,
    { agendamentoId: a.id },
  );
}

type NovaOrdem = Omit<OrdemServico, 'id' | 'numero' | 'historico' | 'notificationId'> & { id?: string };
type NovoAgendamento = Omit<Agendamento, 'id' | 'notificationId'> & { id?: string };

interface Ctx extends AppData {
  carregado: boolean;
  erroCarga: string;
  recarregar: () => Promise<void>;
  salvarCliente: (c: Omit<Cliente, 'id' | 'criadoEm'> & { id?: string }) => Promise<Cliente>;
  removerCliente: (id: string) => Promise<void>;
  salvarOrdem: (o: NovaOrdem) => Promise<OrdemServico>;
  alterarStatus: (id: string, status: StatusOS, nota?: string) => Promise<void>;
  alternarProcedimento: (ordemId: string, procId: string) => Promise<void>;
  removerOrdem: (id: string) => Promise<void>;
  salvarAgendamento: (a: NovoAgendamento) => Promise<Agendamento>;
  alternarAgendamento: (id: string) => Promise<void>;
  removerAgendamento: (id: string) => Promise<void>;
  carregarExemplo: () => Promise<void>;
  apagarTudo: () => Promise<void>;
  cliente: (id: string | null | undefined) => Cliente | undefined;
  // Vendas / estoque
  salvarProduto: (p: Omit<Produto, 'id' | 'criadoEm'> & { id?: string }) => Promise<Produto>;
  removerProduto: (id: string) => Promise<void>;
  registrarVenda: (v: Omit<Venda, 'id' | 'numero' | 'status'>) => Promise<Venda>;
  cancelarVenda: (id: string) => Promise<void>;
  // Etiquetas
  modelos: ModeloEtiqueta[];
  salvarModelo: (m: ModeloEtiqueta) => Promise<void>;
  removerModelo: (id: string) => Promise<void>;
  // Loja (cabeçalho das fichas)
  loja: DadosLoja;
  salvarLoja: (l: DadosLoja) => Promise<void>;
  // Administrador
  temPin: boolean;
  adminLiberado: boolean;
  definirPin: (pin: string) => Promise<void>;
  liberarAdmin: (pin: string) => boolean;
  bloquearAdmin: () => void;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<AppData>(VAZIO);
  const [carregado, setCarregado] = useState(false);
  const ref = useRef(dados);
  const [modelos, setModelos] = useState<ModeloEtiqueta[]>([modeloPadrao()]);
  const modelosRef = useRef(modelos);
  const [pin, setPin] = useState<string | null>(null);
  const [adminLiberado, setAdminLiberado] = useState(false);
  const [loja, setLoja] = useState<DadosLoja>(LOJA_PADRAO);
  const [erroCarga, setErroCarga] = useState('');
  const { user } = useAuth();
  // fila: as gravações na base acontecem uma de cada vez, na ordem em que foram feitas
  const fila = useRef<Promise<void>>(Promise.resolve());

  // ids dos avisos (notificações) agendados neste aparelho, por OS / agendamento
  const salvarAvisos = (d: AppData) => {
    const mapa: Record<string, string> = {};
    for (const o of d.ordens) if (o.notificationId) mapa[o.id] = o.notificationId;
    for (const a of d.agendamentos) if (a.notificationId) mapa[a.id] = a.notificationId;
    AsyncStorage.setItem(CHAVE_AVISOS, JSON.stringify(mapa)).catch(() => {});
  };

  const recarregar = useCallback(async () => {
    try {
      const [nuvem, txtAvisos, txtPin] = await Promise.all([
        carregarDaNuvem(), AsyncStorage.getItem(CHAVE_AVISOS), AsyncStorage.getItem(CHAVE_PIN),
      ]);
      const avisos: Record<string, string> = txtAvisos ? JSON.parse(txtAvisos) : {};
      const d = nuvem.dados;
      d.ordens = d.ordens.map((o) => (avisos[o.id] ? { ...o, notificationId: avisos[o.id] } : o));
      d.agendamentos = d.agendamentos.map((a) => (avisos[a.id] ? { ...a, notificationId: avisos[a.id] } : a));
      ref.current = d;
      setDados(d);
      const m = nuvem.modelos.length ? nuvem.modelos : [modeloPadrao()];
      modelosRef.current = m;
      setModelos(m);
      setLoja({ ...LOJA_PADRAO, ...(nuvem.loja ?? {}) });
      setPin(txtPin);
      setErroCarga('');
    } catch (e) {
      setErroCarga(mensagemErro(e));
    } finally {
      setCarregado(true);
    }
  }, []);

  // Oferece enviar para a conta os dados que estavam salvos só neste aparelho (versão sem login)
  const oferecerDadosLocais = useCallback(async () => {
    try {
      const [txt, txtModelos, txtLoja] = await Promise.all([
        AsyncStorage.getItem(CHAVE), AsyncStorage.getItem(CHAVE_MODELOS), AsyncStorage.getItem(CHAVE_LOJA),
      ]);
      const local = txt ? ({ ...VAZIO, ...JSON.parse(txt) } as AppData) : null;
      const modelosLocais: ModeloEtiqueta[] = txtModelos ? JSON.parse(txtModelos) : [];
      const lojaLocal: DadosLoja | null = txtLoja ? { ...LOJA_PADRAO, ...JSON.parse(txtLoja) } : null;
      const qtd = local
        ? local.clientes.length + local.ordens.length + local.agendamentos.length + local.produtos.length + local.vendas.length
        : 0;
      if (!qtd && !modelosLocais.length && !lojaLocal) return;
      const limpar = () => AsyncStorage.multiRemove([CHAVE, CHAVE_MODELOS, CHAVE_LOJA]).catch(() => {});
      Alert.alert(
        'Dados neste aparelho',
        `Encontramos dados salvos só neste aparelho (${local?.clientes.length ?? 0} clientes, ${local?.ordens.length ?? 0} ordens, ` +
          `${local?.vendas.length ?? 0} vendas). Deseja enviá-los para a sua conta?`,
        [
          { text: 'Depois', style: 'cancel' },
          { text: 'Apagar do aparelho', style: 'destructive', onPress: limpar },
          {
            text: 'Enviar',
            onPress: async () => {
              try {
                if (local) await enviarTudo(local, modelosLocais);
                else if (modelosLocais.length) await enviarTudo(VAZIO, modelosLocais);
                if (lojaLocal && user) await salvarLojaNaNuvem(lojaLocal, user.id);
                await limpar();
                await recarregar();
                Alert.alert('Pronto', 'Os dados deste aparelho foram enviados para a sua conta.');
              } catch (e) {
                Alert.alert('Não foi possível enviar', mensagemErro(e));
              }
            },
          },
        ],
      );
    } catch {
      // dados locais ilegíveis: ignora
    }
  }, [recarregar, user]);

  // carrega os dados do usuário logado
  // (o DataProvider só é montado com alguém logado e começa com carregado = false)
  useEffect(() => {
    if (!user) return;
    // o estado só muda depois da resposta da base (dentro do .then), não durante o effect
    Promise.resolve().then(recarregar).then(oferecerDadosLocais);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const falhaAoSalvar = (e: unknown) => {
    Alert.alert('Não foi possível salvar', mensagemErro(e));
    recarregar(); // volta a mostrar o que está de fato na base
  };

  const gravarModelos = (lista: ModeloEtiqueta[]) => {
    modelosRef.current = lista;
    setModelos(lista);
  };

  const salvarModelo = async (m: ModeloEtiqueta) => {
    const l = modelosRef.current;
    gravarModelos(l.some((x) => x.id === m.id) ? l.map((x) => (x.id === m.id ? m : x)) : [...l, m]);
    fila.current = fila.current.then(() => salvarModeloNaNuvem(m)).catch(falhaAoSalvar);
  };

  const removerModelo = async (id: string) => {
    const l = modelosRef.current.filter((x) => x.id !== id);
    gravarModelos(l.length ? l : [modeloPadrao()]);
    fila.current = fila.current.then(() => removerModeloDaNuvem(id)).catch(falhaAoSalvar);
  };

  const salvarLoja = async (l: DadosLoja) => {
    setLoja(l);
    if (!user) return;
    try {
      await salvarLojaNaNuvem(l, user.id);
    } catch (e) {
      falhaAoSalvar(e);
    }
  };

  const definirPin = async (novo: string) => {
    setPin(novo);
    setAdminLiberado(true);
    await AsyncStorage.setItem(CHAVE_PIN, novo).catch(() => {});
  };

  const liberarAdmin = (tentativa: string) => {
    const ok = !!pin && tentativa === pin;
    if (ok) setAdminLiberado(true);
    return ok;
  };

  // Aplica a alteração na tela na hora e envia para a base só o que mudou.
  const gravar = useCallback((fn: (d: AppData) => AppData) => {
    const antes = ref.current;
    const novo = fn(antes);
    ref.current = novo;
    setDados(novo);
    salvarAvisos(novo);
    fila.current = fila.current.then(() => enviarDiferencas(antes, novo)).catch(falhaAoSalvar);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nomeCliente = (id: string) => ref.current.clientes.find((c) => c.id === id)?.nome ?? 'cliente';

  const salvarCliente: Ctx['salvarCliente'] = async (c) => {
    const existente = c.id ? ref.current.clientes.find((x) => x.id === c.id) : undefined;
    const final: Cliente = existente
      ? { ...existente, ...c, id: existente.id }
      : { ...c, id: uid(), criadoEm: new Date().toISOString() };
    gravar((d) => ({
      ...d,
      clientes: existente ? d.clientes.map((x) => (x.id === final.id ? final : x)) : [final, ...d.clientes],
    }));
    return final;
  };

  const removerCliente = async (id: string) => {
    gravar((d) => ({ ...d, clientes: d.clientes.filter((c) => c.id !== id) }));
  };

  const salvarOrdem: Ctx['salvarOrdem'] = async (o) => {
    const existente = o.id ? ref.current.ordens.find((x) => x.id === o.id) : undefined;
    let final: OrdemServico;
    if (existente) {
      final = { ...existente, ...o, id: existente.id };
      if (existente.status !== o.status) {
        final.historico = [...existente.historico, { data: new Date().toISOString(), status: o.status }];
        if (o.status === 'entregue' && !final.dataSaida) final.dataSaida = new Date().toISOString();
      }
    } else {
      final = {
        ...o,
        id: uid(),
        numero: ref.current.proximoNumero,
        historico: [{ data: o.dataEntrada, status: o.status, nota: 'Equipamento recebido' }],
      };
    }
    final.notificationId = await avisoDaOrdem(final, nomeCliente(final.clienteId));
    gravar((d) => ({
      ...d,
      proximoNumero: existente ? d.proximoNumero : d.proximoNumero + 1,
      ordens: existente ? d.ordens.map((x) => (x.id === final.id ? final : x)) : [final, ...d.ordens],
    }));
    return final;
  };

  const alterarStatus: Ctx['alterarStatus'] = async (id, status, nota) => {
    const o = ref.current.ordens.find((x) => x.id === id);
    if (!o || o.status === status) return;
    const agora = new Date().toISOString();
    const final: OrdemServico = {
      ...o,
      status,
      dataSaida: status === 'entregue' ? agora : status === 'cancelado' ? o.dataSaida : null,
      historico: [...o.historico, { data: agora, status, nota: nota ?? STATUS[status].label }],
    };
    final.notificationId = await avisoDaOrdem(final, nomeCliente(final.clienteId));
    gravar((d) => ({ ...d, ordens: d.ordens.map((x) => (x.id === id ? final : x)) }));
  };

  const alternarProcedimento: Ctx['alternarProcedimento'] = async (ordemId, procId) => {
    gravar((d) => ({
      ...d,
      ordens: d.ordens.map((o) =>
        o.id !== ordemId
          ? o
          : { ...o, procedimentos: o.procedimentos.map((p) => (p.id === procId ? { ...p, feito: !p.feito } : p)) },
      ),
    }));
  };

  const removerOrdem = async (id: string) => {
    const o = ref.current.ordens.find((x) => x.id === id);
    await cancelarAviso(o?.notificationId);
    gravar((d) => ({
      ...d,
      ordens: d.ordens.filter((x) => x.id !== id),
      agendamentos: d.agendamentos.map((a) => (a.ordemId === id ? { ...a, ordemId: null } : a)),
    }));
  };

  const salvarAgendamento: Ctx['salvarAgendamento'] = async (a) => {
    const existente = a.id ? ref.current.agendamentos.find((x) => x.id === a.id) : undefined;
    const final: Agendamento = existente ? { ...existente, ...a, id: existente.id } : { ...a, id: uid() };
    final.notificationId = await avisoDoAgendamento(final);
    gravar((d) => ({
      ...d,
      agendamentos: existente
        ? d.agendamentos.map((x) => (x.id === final.id ? final : x))
        : [...d.agendamentos, final],
    }));
    return final;
  };

  const alternarAgendamento = async (id: string) => {
    const a = ref.current.agendamentos.find((x) => x.id === id);
    if (!a) return;
    const final = { ...a, concluido: !a.concluido };
    final.notificationId = await avisoDoAgendamento(final);
    gravar((d) => ({ ...d, agendamentos: d.agendamentos.map((x) => (x.id === id ? final : x)) }));
  };

  const removerAgendamento = async (id: string) => {
    const a = ref.current.agendamentos.find((x) => x.id === id);
    await cancelarAviso(a?.notificationId);
    gravar((d) => ({ ...d, agendamentos: d.agendamentos.filter((x) => x.id !== id) }));
  };

  const salvarProduto: Ctx['salvarProduto'] = async (p) => {
    const existente = p.id ? ref.current.produtos.find((x) => x.id === p.id) : undefined;
    const final: Produto = existente
      ? { ...existente, ...p, id: existente.id }
      : { ...p, id: uid(), criadoEm: new Date().toISOString() };
    gravar((d) => ({
      ...d,
      produtos: existente ? d.produtos.map((x) => (x.id === final.id ? final : x)) : [final, ...d.produtos],
    }));
    return final;
  };

  const removerProduto = async (id: string) => {
    gravar((d) => ({ ...d, produtos: d.produtos.filter((p) => p.id !== id) }));
  };

  const registrarVenda: Ctx['registrarVenda'] = async (v) => {
    const venda: Venda = { ...v, id: uid(), numero: ref.current.proximaVenda, status: 'concluida' };
    gravar((d) => ({
      ...d,
      proximaVenda: d.proximaVenda + 1,
      vendas: [venda, ...d.vendas],
      // baixa no estoque
      produtos: d.produtos.map((p) => {
        const q = venda.itens.filter((i) => i.produtoId === p.id).reduce((t, i) => t + i.qtd, 0);
        return q ? { ...p, estoque: p.estoque - q } : p;
      }),
    }));
    return venda;
  };

  const cancelarVenda = async (id: string) => {
    const v = ref.current.vendas.find((x) => x.id === id);
    if (!v || v.status === 'cancelada') return;
    gravar((d) => ({
      ...d,
      vendas: d.vendas.map((x) => (x.id === id ? { ...x, status: 'cancelada' } : x)),
      // devolve ao estoque
      produtos: d.produtos.map((p) => {
        const q = v.itens.filter((i) => i.produtoId === p.id).reduce((t, i) => t + i.qtd, 0);
        return q ? { ...p, estoque: p.estoque + q } : p;
      }),
    }));
  };

  const carregarExemplo = async () => {
    const ex = gerarExemplo();
    for (const a of ex.agendamentos) a.notificationId = await avisoDoAgendamento(a);
    gravar(() => ex);
  };

  const apagarTudo = async () => {
    for (const o of ref.current.ordens) await cancelarAviso(o.notificationId);
    for (const a of ref.current.agendamentos) await cancelarAviso(a.notificationId);
    gravar(() => VAZIO);
  };

  const valor = useMemo<Ctx>(
    () => ({
      ...dados,
      carregado,
      erroCarga,
      recarregar,
      salvarCliente,
      removerCliente,
      salvarOrdem,
      alterarStatus,
      alternarProcedimento,
      removerOrdem,
      salvarAgendamento,
      alternarAgendamento,
      removerAgendamento,
      carregarExemplo,
      apagarTudo,
      cliente: (id) => (id ? dados.clientes.find((c) => c.id === id) : undefined),
      salvarProduto,
      removerProduto,
      registrarVenda,
      cancelarVenda,
      modelos,
      salvarModelo,
      removerModelo,
      loja,
      salvarLoja,
      temPin: !!pin,
      adminLiberado,
      definirPin,
      liberarAdmin,
      bloquearAdmin: () => setAdminLiberado(false),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, carregado, erroCarga, modelos, pin, adminLiberado, loja],
  );

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>;
}

export function useDados() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDados deve ser usado dentro de DataProvider');
  return ctx;
}
