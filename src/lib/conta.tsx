import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';
import type { Empresa, Membro } from './types';

/** Administrador geral: libera os acessos de todas as empresas. */
export const ADMIN_PRINCIPAL = 'mapl11@hotmail.com';

export type Situacao = 'ok' | 'sem_acesso' | 'desativado';

interface ContaCtx {
  pronta: boolean;
  erro: string;
  situacao: Situacao;
  /** Empresa do usuário (owner_id dos dados). null = sem acesso. */
  dono: string | null;
  /** administrador da empresa (campo admin de assistencia_usuarios) */
  ehAdmin: boolean;
  /** administrador geral: cadastra acessos e empresas */
  ehAdminGeral: boolean;
  /** ainda usa a senha provisória */
  trocarSenha: boolean;
  empresa: string;
  email: string;
  /** false enquanto o script (supabase/migrations) não foi aplicado na base */
  equipeDisponivel: boolean;
  recarregarConta: () => Promise<void>;
  /** troca a senha do login e marca que a provisória já foi trocada */
  definirSenha: (nova: string) => Promise<void>;
}

type Estado = Pick<ContaCtx, 'pronta' | 'erro' | 'situacao' | 'dono' | 'trocarSenha' | 'empresa' | 'equipeDisponivel'> & {
  admin: boolean;
  adminGeral: boolean;
};

const Ctx = createContext<ContaCtx | null>(null);

const funcaoInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? ''));

const tabelaInexistente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist/i.test(e.message ?? ''));

const AVISO_SCRIPT =
  'Esta função precisa do script supabase/migrations/20261124_equipe_e_permissoes.sql rodado no Supabase (SQL Editor).';

export function ContaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const email = (user?.email ?? '').toLowerCase();
  const [estado, setEstado] = useState<Estado>({
    pronta: false, erro: '', situacao: 'ok', dono: null, trocarSenha: false, empresa: '',
    equipeDisponivel: false, admin: false, adminGeral: false,
  });

  const recarregarConta = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('assistencia_minha_conta');
    if (funcaoInexistente(error)) {
      // Base ainda sem o script: cada conta usa os próprios dados, como antes
      setEstado({
        pronta: true, erro: '', situacao: 'ok', dono: user.id, trocarSenha: false, empresa: '',
        equipeDisponivel: false, admin: true, adminGeral: email === ADMIN_PRINCIPAL,
      });
      return;
    }
    if (error) {
      setEstado((s) => ({ ...s, pronta: true, erro: error.message }));
      return;
    }
    const d = data as {
      situacao: Situacao; dono: string | null; admin: boolean; admin_geral: boolean; trocar_senha: boolean; empresa: string | null;
    };
    setEstado({
      pronta: true, erro: '', situacao: d.situacao, dono: d.dono, trocarSenha: !!d.trocar_senha, empresa: d.empresa ?? '',
      equipeDisponivel: true, admin: !!d.admin, adminGeral: !!d.admin_geral,
    });
  }, [user, email]);

  useEffect(() => {
    Promise.resolve().then(recarregarConta);
  }, [recarregarConta]);

  const value = useMemo<ContaCtx>(() => {
    const { admin, adminGeral, ...resto } = estado;
    return {
      ...resto,
      email,
      ehAdminGeral: email === ADMIN_PRINCIPAL || adminGeral,
      ehAdmin: email === ADMIN_PRINCIPAL || admin,
      recarregarConta,
      definirSenha: async (nova) => {
        const { error } = await supabase.auth.updateUser({ password: nova });
        if (error) {
          if (/different from the old/i.test(error.message)) throw new Error('A nova senha precisa ser diferente da senha atual.');
          throw error;
        }
        if (resto.equipeDisponivel) {
          const { error: e2 } = await supabase.rpc('assistencia_senha_trocada');
          if (e2) throw e2;
        }
        setEstado((s) => ({ ...s, trocarSenha: false }));
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

// ---------------- Acessos (somente administradores) ----------------

const membroApp = (r: Record<string, unknown>): Membro => ({
  id: r.id as string,
  email: r.email as string,
  nome: (r.nome as string) ?? '',
  admin: !!r.admin,
  ativo: r.ativo as boolean,
  dono: !!r.user_id && r.user_id === r.owner_id,
  trocarSenha: !!r.trocar_senha,
  criadoEm: r.criado_em as string,
});

/** Usuários de uma empresa. O admin da empresa só enxerga a própria; o admin geral, qualquer uma. */
export async function listarMembros(empresa: string): Promise<Membro[]> {
  const { data, error } = await supabase.from('assistencia_usuarios').select('*').eq('owner_id', empresa).order('criado_em');
  if (tabelaInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(membroApp);
}

/** Empresas cadastradas (somente administrador geral). */
export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.rpc('assistencia_empresas');
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.owner_id as string,
    nome: (r.nome as string) || '',
    donoEmail: (r.dono_email as string) || '',
    usuarios: Number(r.usuarios) || 0,
  }));
}

/**
 * Cadastra um acesso com senha provisória. empresa = owner_id da empresa; sem empresa
 * (somente admin geral) cria uma nova empresa com o nome informado, e a pessoa vira dona e admin.
 * Se o e-mail já tinha login, só libera o acesso (a senha dele não muda).
 */
export async function cadastrarUsuario(m: {
  nome: string; email: string; senha: string; admin: boolean; empresa: string | null; novaEmpresa?: string;
}) {
  const { data, error } = await supabase.rpc('assistencia_criar_usuario', {
    p_email: m.email.trim().toLowerCase(),
    p_senha: m.senha,
    p_nome: m.nome.trim(),
    p_admin: m.admin,
    p_empresa: m.empresa,
    p_nova_empresa: m.novaEmpresa?.trim() || null,
  });
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
  const d = data as { ja_tinha_conta: boolean; empresa: string };
  return { jaTinhaConta: !!d.ja_tinha_conta, empresa: d.empresa };
}

export async function alterarMembro(id: string, campos: Partial<Pick<Membro, 'nome' | 'admin' | 'ativo'>>) {
  const { error } = await supabase.from('assistencia_usuarios').update(campos).eq('id', id);
  if (error) throw error;
}

export async function removerMembro(id: string) {
  const { error } = await supabase.from('assistencia_usuarios').delete().eq('id', id);
  if (error) throw error;
}

/** Nova senha provisória (somente administrador geral). */
export async function redefinirSenha(id: string, senha: string) {
  const { error } = await supabase.rpc('assistencia_redefinir_senha', { p_id: id, p_senha: senha });
  if (funcaoInexistente(error)) throw new Error(AVISO_SCRIPT);
  if (error) throw error;
}

/** Senha provisória simples de ditar: 3 letras + 4 números. */
export function gerarSenhaProvisoria() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 3; i++) s += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10);
  return s;
}
