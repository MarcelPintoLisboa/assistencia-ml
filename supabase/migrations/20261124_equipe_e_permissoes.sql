-- =====================================================================================
-- Assistência ML — usuários da loja (campo admin) e exclusão lógica de produtos
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Como funciona
--  * assistencia_usuarios: um registro por pessoa que usa o app, com o campo
--    admin (true = administrador, false = usuário comum).
--  * Cada loja é a conta do dono (owner_id). Quem cria conta pelo app vira dono e admin
--    da própria loja; o registro dele é criado no primeiro acesso.
--  * O admin cadastra a equipe (e-mail + admin sim/não). No primeiro login a pessoa
--    aceita o convite e passa a ver/gravar os dados da loja.
--  * assistencia_dono() devolve a loja do usuário logado; as regras (RLS) das tabelas
--    assistencia_* passam a comparar owner_id com ela em vez de auth.uid().
--  * mapl11@hotmail.com é sempre administrador.
-- =====================================================================================

-- 1) Exclusão lógica de produtos -----------------------------------------------------
alter table public.assistencia_produtos
  add column if not exists excluido boolean not null default false,
  add column if not exists excluido_em timestamptz;

-- 2) Usuários da loja ----------------------------------------------------------------
create table if not exists public.assistencia_usuarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique check (email = lower(email)),
  nome text not null default '',
  admin boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists assistencia_usuarios_owner_idx on public.assistencia_usuarios (owner_id);
comment on column public.assistencia_usuarios.admin is 'true = administrador (faz tudo no app); false = usuário comum';

-- Versão anterior deste script usava assistencia_membros: copia e remove
do $$
begin
  if to_regclass('public.assistencia_membros') is not null then
    insert into public.assistencia_usuarios (owner_id, user_id, email, nome, admin, ativo, criado_em)
    select owner_id, user_id, email, nome, papel = 'admin', ativo, criado_em from public.assistencia_membros
    on conflict do nothing;
    drop table public.assistencia_membros cascade;
  end if;
end $$;

-- Administrador principal: registro próprio, sempre admin
insert into public.assistencia_usuarios (owner_id, user_id, email, nome, admin)
select u.id, u.id, lower(u.email), 'Marcel Lisboa', true
from auth.users u
where lower(u.email) = 'mapl11@hotmail.com'
on conflict (email) do update set admin = true, ativo = true;

-- 3) Funções ---------------------------------------------------------------------------
create or replace function public.assistencia_email()
returns text language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Loja do usuário logado. Usuário desativado => null (sem acesso a nada).
create or replace function public.assistencia_dono()
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from assistencia_usuarios u where u.user_id = auth.uid())
      then (select u.owner_id from assistencia_usuarios u where u.user_id = auth.uid() and u.ativo limit 1)
    else auth.uid()
  end
$$;

create or replace function public.assistencia_eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.assistencia_email() = 'mapl11@hotmail.com'
    or coalesce((select u.admin and u.ativo from assistencia_usuarios u where u.user_id = auth.uid()),
                -- ainda sem registro e sem convite: é o dono da própria loja
                not exists (select 1 from assistencia_usuarios u where u.email = public.assistencia_email()))
$$;

-- Chamado pelo app ao entrar: registra o dono no primeiro acesso e devolve a situação da conta
create or replace function public.assistencia_minha_conta()
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_email text := public.assistencia_email();
begin
  if auth.uid() is null then
    return null;
  end if;
  -- primeiro acesso de quem não foi convidado: vira dono e admin da própria loja
  if not exists (select 1 from assistencia_usuarios u where u.user_id = auth.uid() or u.email = v_email) then
    insert into assistencia_usuarios (owner_id, user_id, email, nome, admin)
    values (auth.uid(), auth.uid(), v_email, coalesce(auth.jwt() -> 'user_metadata' ->> 'nome', ''), true)
    on conflict do nothing;
  end if;
  return json_build_object(
    'dono', public.assistencia_dono(),
    'admin', public.assistencia_eh_admin(),
    'convite', (
      select json_build_object('id', u.id, 'admin', u.admin, 'loja', coalesce(l.nome, ''))
      from assistencia_usuarios u
      left join assistencia_loja l on l.owner_id = u.owner_id
      where u.email = v_email and u.user_id is null and u.ativo
      limit 1
    )
  );
end $$;

-- O próprio usuário aceita / recusa o convite feito para o seu e-mail
create or replace function public.assistencia_aceitar_convite()
returns void language sql volatile security definer set search_path = public as $$
  update assistencia_usuarios set user_id = auth.uid()
  where email = public.assistencia_email() and user_id is null and ativo
    and not exists (select 1 from assistencia_usuarios x where x.user_id = auth.uid());
$$;

create or replace function public.assistencia_recusar_convite()
returns void language sql volatile security definer set search_path = public as $$
  delete from assistencia_usuarios where email = public.assistencia_email() and user_id is null;
$$;

-- funções da versão anterior deste script
drop function if exists public.assistencia_papel();

revoke all on function public.assistencia_minha_conta(), public.assistencia_aceitar_convite(),
  public.assistencia_recusar_convite() from public, anon;
grant execute on function public.assistencia_minha_conta(), public.assistencia_aceitar_convite(),
  public.assistencia_recusar_convite(), public.assistencia_dono(), public.assistencia_eh_admin(),
  public.assistencia_email() to authenticated;

-- 4) Regras de acesso de assistencia_usuarios ----------------------------------------
alter table public.assistencia_usuarios enable row level security;

drop policy if exists "usuarios: ver" on public.assistencia_usuarios;
create policy "usuarios: ver" on public.assistencia_usuarios for select to authenticated
  using (owner_id = public.assistencia_dono() or user_id = auth.uid());

drop policy if exists "usuarios: admin cadastra" on public.assistencia_usuarios;
create policy "usuarios: admin cadastra" on public.assistencia_usuarios for insert to authenticated
  with check (owner_id = public.assistencia_dono() and public.assistencia_eh_admin());

-- o dono da loja e o administrador principal não podem ser alterados nem removidos
drop policy if exists "usuarios: admin altera" on public.assistencia_usuarios;
create policy "usuarios: admin altera" on public.assistencia_usuarios for update to authenticated
  using (owner_id = public.assistencia_dono() and public.assistencia_eh_admin()
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com')
  with check (owner_id = public.assistencia_dono() and public.assistencia_eh_admin());

drop policy if exists "usuarios: admin remove" on public.assistencia_usuarios;
create policy "usuarios: admin remove" on public.assistencia_usuarios for delete to authenticated
  using (owner_id = public.assistencia_dono() and public.assistencia_eh_admin()
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com');

-- O app nunca grava user_id (só as funções acima): impede "puxar" a conta de outra pessoa
revoke insert, update on public.assistencia_usuarios from anon, authenticated;
grant select, delete on public.assistencia_usuarios to authenticated;
grant insert (owner_id, email, nome, admin, ativo) on public.assistencia_usuarios to authenticated;
grant update (nome, admin, ativo) on public.assistencia_usuarios to authenticated;

-- 5) Tabelas de dados: owner_id passa a ser a loja do usuário logado -----------------
-- Reescreve as regras existentes trocando auth.uid() por assistencia_dono(), preservando
-- qualquer outra condição que já exista (ex.: conta ativa). Para o dono nada muda,
-- porque assistencia_dono() = auth.uid() para ele.
do $$
declare
  tabs text[] := array['assistencia_clientes', 'assistencia_ordens', 'assistencia_agendamentos',
                       'assistencia_produtos', 'assistencia_vendas', 'assistencia_etiquetas', 'assistencia_loja'];
  t text;
  r record;
begin
  foreach t in array tabs loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'owner_id') then
      execute format('alter table public.%I alter column owner_id set default public.assistencia_dono()', t);
    else
      raise notice 'Tabela % sem coluna owner_id: verifique manualmente.', t;
    end if;
  end loop;

  for r in
    select policyname, tablename, qual, with_check from pg_policies
    where schemaname = 'public' and tablename = any (tabs)
  loop
    if r.qual is not null and position('auth.uid()' in r.qual) > 0 then
      execute format('alter policy %I on public.%I using (%s)', r.policyname, r.tablename,
                     replace(r.qual, 'auth.uid()', 'public.assistencia_dono()'));
    end if;
    if r.with_check is not null and position('auth.uid()' in r.with_check) > 0 then
      execute format('alter policy %I on public.%I with check (%s)', r.policyname, r.tablename,
                     replace(r.with_check, 'auth.uid()', 'public.assistencia_dono()'));
    end if;
  end loop;
end $$;

-- Conferência 1: usuários e quem é admin
select email, nome, admin, ativo, (user_id = owner_id) as dono_da_loja from public.assistencia_usuarios order by criado_em;

-- Conferência 2: as regras devem mostrar assistencia_dono() no lugar de auth.uid()
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename like 'assistencia_%' order by tablename, policyname;
