import { createClient } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';
import type { Membro } from './types';

/** Administrador principal: sempre admin, com acesso a tudo. */
export const ADMIN_PRINCIPAL = 'mapl11@hotmail.com';

export interface Convite {
  id: string;
  admin: boolean;
  loja: string;
}

interface ContaCtx {
  pronta: boolean;
  erro: string;
  /** Conta dona da loja (owner_id dos dados). null = acesso desativado pelo admin. */
  dono: string | null;
  /** campo admin do usuário em assistencia_usuarios */
  ehAdmin: boolean;
  email: string;
  convite: Convite | null;
  /** false enquanto o script de equipe (supabase/migrations) não foi aplicado na base */
  equipeDisponivel: boolean;
  recarregarConta: () => Promise<void>;
  aceitarConvite: () => Promise<void>;
  recusarConvite: () => Promise<void>;
}

const Ctx = createContext<ContaCtx | null>(null);

const funcaoInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? ''));

const tabelaInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist/i.test(e.message ?? ''));

export function ContaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const email = (user?.email ?? '').toLowerCase();
  const [estado, setEstado] = useState<Omit<ContaCtx, 'recarregarConta' | 'aceitarConvite' | 'recusarConvite' | 'ehAdmin' | 'email'> & { admin: boolean }>({
    admin: false,
    pronta: false, erro: '', dono: null, convite: null, equipeDisponivel: false,
  });

  const recarregarConta = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('assistencia_minha_conta');
    if (funcaoInexistente(error)) {
      // Base ainda sem o script de equipe: cada conta é dona e admin dos próprios dados
      setEstado({ pronta: true, erro: '', dono: user.id, convite: null, equipeDisponivel: false, admin: true });
      return;
    }
    if (error) {
      setEstado((s) => ({ ...s, pronta: true, erro: error.message }));
      return;
    }
    const d = data as { dono: string | null; admin: boolean; convite: Convite | null };
    setEstado({ pronta: true, erro: '', dono: d.dono, convite: d.convite, equipeDisponivel: true, admin: !!d.admin });
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(recarregarConta);
  }, [recarregarConta]);

  const value = useMemo<ContaCtx>(() => {
    const { admin, ...resto } = estado;
    return {
      ...resto,
      email,
      ehAdmin: email === ADMIN_PRINCIPAL || admin,
      recarregarConta,
      aceitarConvite: async () => {
        const { error } = await supabase.rpc('assistencia_aceitar_convite');
        if (error) throw error;
        await recarregarConta();
      },
      recusarConvite: async () => {
        const { error } = await supabase.rpc('assistencia_recusar_convite');
        if (error) throw error;
        await recarregarConta();
      },
    };
  }, [estado, email, recarregarConta]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConta() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConta deve ser usado dentro de ContaProvider');
  return c;
}

// ---------------- Equipe (somente admin) ----------------

const AVISO_SCRIPT =
  'A tabela assistencia_usuarios ainda não existe na base de dados. Rode o script supabase/migrations/20261124_equipe_e_permissoes.sql no Supabase (SQL Editor).';

const membroApp = (r: Record<string, unknown>): Membro => ({
  id: r.id as string,
  email: r.email as string,
  nome: (r.nome as string) ?? '',
  admin: !!r.admin,
  ativo: r.ativo as boolean,
  dono: !!r.user_id && r.user_id === r.owner_id,
  aceito: !!r.user_id,
  criadoEm: r.criado_em as string,
});

export async function listarMembros(dono: string): Promise<Membro[]> {
  const { data, error } = await supabase.from('assistencia_usuarios').select('*').eq('owner_id', dono).order('criado_em');
  if (tabelaInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(membroApp);
}

/**
 * Cria a conta de login da pessoa (sem trocar o login de quem está usando o app) e a cadastra
 * como membro da loja. Se o e-mail já tiver conta, só cadastra o convite.
 * Devolve se a pessoa precisa confirmar o e-mail antes de entrar.
 */
export async function cadastrarMembro(dono: string, m: { nome: string; email: string; senha: string; admin: boolean }) {
  const email = m.email.trim().toLowerCase();
  // cliente separado, sem guardar sessão: o signUp não desloga o admin
  const avulso = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'assistencia-cadastro-equipe' },
  });
  let jaTinhaConta = false;
  let precisaConfirmar = false;
  const { data, error } = await avulso.auth.signUp({
    email,
    password: m.senha,
    options: { data: { app: 'Assistência ML', nome: m.nome.trim() } },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) jaTinhaConta = true;
    else throw error;
  } else {
    // e-mail já cadastrado: o Supabase devolve um usuário "falso" sem identidades
    jaTinhaConta = (data.user?.identities?.length ?? 0) === 0;
    precisaConfirmar = !jaTinhaConta && !data.session;
    if (data.session) await avulso.auth.signOut().catch(() => {});
  }
  const { error: e2 } = await supabase
    .from('assistencia_usuarios')
    .insert({ owner_id: dono, email, nome: m.nome.trim(), admin: m.admin, ativo: true });
  if (tabelaInexistente(e2)) throw new Error(AVISO_SCRIPT);
  if (e2?.code === '23505') throw new Error('Este e-mail já está cadastrado em uma loja.');
  if (e2) throw e2;
  return { jaTinhaConta, precisaConfirmar };
}

export async function alterarMembro(id: string, campos: Partial<Pick<Membro, 'nome' | 'admin' | 'ativo'>>) {
  const { error } = await supabase.from('assistencia_usuarios').update(campos).eq('id', id);
  if (error) throw error;
}

export async function removerMembro(id: string) {
  const { error } = await supabase.from('assistencia_usuarios').delete().eq('id', id);
  if (error) throw error;
}
