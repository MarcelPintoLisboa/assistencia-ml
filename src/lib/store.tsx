import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gerarExemplo } from './exemplo';
import { fmtHora, STATUS, TIPO_AG, uid } from './format';
import { agendarAviso, cancelarAviso } from './notifications';
import type { Agendamento, AppData, Cliente, OrdemServico, StatusOS } from './types';

const CHAVE = '@assistencia-ml/dados-v1';
const VAZIO: AppData = { clientes: [], ordens: [], agendamentos: [], proximoNumero: 1 };

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
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<AppData>(VAZIO);
  const [carregado, setCarregado] = useState(false);
  const ref = useRef(dados);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((txt) => {
        if (txt) {
          const d = { ...VAZIO, ...JSON.parse(txt) } as AppData;
          ref.current = d;
          setDados(d);
        }
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  const gravar = useCallback((fn: (d: AppData) => AppData) => {
    const novo = fn(ref.current);
    ref.current = novo;
    setDados(novo);
    AsyncStorage.setItem(CHAVE, JSON.stringify(novo)).catch(() => {});
  }, []);

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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, carregado],
  );

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>;
}

export function useDados() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDados deve ser usado dentro de DataProvider');
  return ctx;
}
