import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  pronto: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  /** true se a conta já entrou direto; false se precisa confirmar o e-mail */
  criarConta: (email: string, senha: string) => Promise<boolean>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

// Guarda a sessão do usuário logado (Supabase Auth) e expõe entrar / criar conta / sair.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPronto(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      pronto,
      entrar: async (email, senha) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      },
      criarConta: async (email, senha) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { app: 'Assistência ML' } }, // aparece em usuarios.app_cadastro
        });
        if (error) throw error;
        return Boolean(data.session);
      },
      sair: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, pronto],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
