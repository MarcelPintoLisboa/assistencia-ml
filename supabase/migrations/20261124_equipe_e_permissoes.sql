-- =====================================================================================
-- Assistência ML — acesso por convite do administrador, usuários por empresa (campo admin)
-- e exclusão lógica de produtos.
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem problema (também por cima da versão anterior).
--
-- Como funciona
--  * Ninguém cria conta sozinho. O ADMINISTRADOR GERAL (mapl11@hotmail.com) cadastra o
--    acesso: e-mail + senha provisória, escolhendo a empresa (ou criando uma nova).
--  * No primeiro acesso a pessoa é obrigada a trocar a senha provisória (trocar_senha).
--  * Cada empresa é identificada pela conta do seu dono (owner_id). O administrador de uma
--    empresa gerencia (adiciona / remove) somente os usuários da própria empresa.
--  * assistencia_usuarios: um registro por pessoa, com o campo admin (true/false).
--  * Quem não tem registro em assistencia_usuarios não acessa nada.
--  * assistencia_dono() devolve a empresa do usuário logado; as regras (RLS) das tabelas
--    assistencia_* comparam owner_id com ela em vez de auth.uid().
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Exclusão lógica de produtos -----------------------------------------------------
alter table public.assistencia_produtos
  add column if not exists excluido boolean not null default false,
  add column if not exists excluido_em timestamptz;

-- 2) Usuários por empresa ---------------------------------------------------------------
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
alter table public.assistencia_usuarios
  add column if not exists trocar_senha boolean not null default false;
create index if not exists assistencia_usuarios_owner_idx on public.assistencia_usuarios (owner_id);
comment on column public.assistencia_usuarios.admin is 'true = administrador da empresa; false = usuário comum';
comment on column public.assistencia_usuarios.trocar_senha is 'true = ainda usa a senha provisória; o app pede a troca ao entrar';

-- Versão bem antiga deste script usava assistencia_membros: copia e remove
do $$
begin
  if to_regclass('public.assistencia_membros') is not null then
    insert into public.assistencia_usuarios (owner_id, user_id, email, nome, admin, ativo, criado_em)
    select owner_id, user_id, email, nome, papel = 'admin', ativo, criado_em from public.assistencia_membros
    on conflict do nothing;
    drop table public.assistencia_membros cascade;
  end if;
end $$;

-- Administrador geral: registro próprio, sempre admin
insert into public.assistencia_usuarios (owner_id, user_id, email, nome, admin)
select u.id, u.id, lower(u.email), 'Marcel Lisboa', true
from auth.users u
where lower(u.email) = 'mapl11@hotmail.com'
on conflict (email) do update set admin = true, ativo = true;

-- Quem já usava o app e tem dados continua com acesso: vira dono e admin da própria empresa
do $$
declare
  t text;
begin
  foreach t in array array['assistencia_clientes', 'assistencia_ordens', 'assistencia_agendamentos',
                           'assistencia_produtos', 'assistencia_vendas', 'assistencia_etiquetas', 'assistencia_loja'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'owner_id') then
      execute format($f$
        insert into public.assistencia_usuarios (owner_id, user_id, email, nome, admin)
        select distinct on (u.id) u.id, u.id, lower(u.email), coalesce(u.raw_user_meta_data ->> 'nome', ''), true
        from public.%I d join auth.users u on u.id = d.owner_id
        where u.email is not null
          and not exists (select 1 from public.assistencia_usuarios x where x.user_id = u.id or x.email = lower(u.email))
        on conflict do nothing$f$, t);
    end if;
  end loop;
end $$;

-- Liga ao login os registros que ainda não tinham user_id (convites da versão anterior)
update public.assistencia_usuarios x set user_id = u.id
from auth.users u
where x.user_id is null and lower(u.email) = x.email
  and not exists (select 1 from public.assistencia_usuarios y where y.user_id = u.id);

-- 3) Funções ---------------------------------------------------------------------------
create or replace function public.assistencia_email()
returns text language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.assistencia_eh_admin_geral()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = 'mapl11@hotmail.com')
$$;

-- Empresa do usuário logado. Sem registro ou desativado => null (sem acesso a nada).
create or replace function public.assistencia_dono()
returns uuid language sql stable security definer set search_path = public as $$
  select u.owner_id from assistencia_usuarios u where u.user_id = auth.uid() and u.ativo limit 1
$$;

create or replace function public.assistencia_eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.assistencia_eh_admin_geral()
    or coalesce((select u.admin and u.ativo from assistencia_usuarios u where u.user_id = auth.uid()), false)
$$;

-- Chamado pelo app ao entrar: devolve a situação da conta
create or replace function public.assistencia_minha_conta()
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  r assistencia_usuarios;
begin
  if auth.uid() is null then
    return null;
  end if;
  -- cadastro feito pelo e-mail antes de a conta existir: liga ao login agora
  update assistencia_usuarios set user_id = auth.uid()
  where email = public.assistencia_email() and user_id is null
    and not exists (select 1 from assistencia_usuarios x where x.user_id = auth.uid());

  select * into r from assistencia_usuarios where user_id = auth.uid();
  return json_build_object(
    'situacao', case when r.id is null then 'sem_acesso' when not r.ativo then 'desativado' else 'ok' end,
    'dono', public.assistencia_dono(),
    'admin', public.assistencia_eh_admin(),
    'admin_geral', public.assistencia_eh_admin_geral(),
    'trocar_senha', coalesce(r.trocar_senha, false),
    'empresa', (select l.nome from assistencia_loja l where l.owner_id = r.owner_id)
  );
end $$;

-- O próprio usuário avisa que já trocou a senha provisória
create or replace function public.assistencia_senha_trocada()
returns void language sql volatile security definer set search_path = public as $$
  update assistencia_usuarios set trocar_senha = false where user_id = auth.uid();
$$;

-- Empresas cadastradas (somente administrador geral)
create or replace function public.assistencia_empresas()
returns table (owner_id uuid, nome text, dono_email text, usuarios bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.assistencia_eh_admin_geral() then
    raise exception 'Somente o administrador geral pode ver as empresas.';
  end if;
  return query
    select u.owner_id,
           coalesce(nullif(l.nome, ''), max(case when u.user_id = u.owner_id then u.nome end), '')::text,
           coalesce(max(case when u.user_id = u.owner_id then u.email end), '')::text,
           count(*)
    from assistencia_usuarios u
    left join assistencia_loja l on l.owner_id = u.owner_id
    group by u.owner_id, l.nome
    order by 2;
end $$;

-- Cadastra um acesso com senha provisória.
--  p_empresa: empresa (owner_id) onde a pessoa entra. null = nova empresa (só admin geral),
--             e a pessoa vira dona e administradora dela.
--  Se o e-mail já tiver login (ex.: outro app da ML Softwares), só libera o acesso; a senha
--  dele não muda.
create or replace function public.assistencia_criar_usuario(
  p_email text, p_senha text, p_nome text, p_admin boolean,
  p_empresa uuid default null, p_nova_empresa text default null
)
returns json language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_geral boolean := public.assistencia_eh_admin_geral();
  v_uid uuid;
  v_novo boolean := false;
  v_dono uuid;
begin
  if not public.assistencia_eh_admin() then
    raise exception 'Somente administradores podem cadastrar usuários.';
  end if;
  if v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Informe um e-mail válido.';
  end if;
  if p_empresa is null then
    if not v_geral then
      raise exception 'Somente o administrador geral pode criar empresas.';
    end if;
    if trim(coalesce(p_nova_empresa, '')) = '' then
      raise exception 'Informe o nome da nova empresa.';
    end if;
  elsif not v_geral and p_empresa is distinct from public.assistencia_dono() then
    raise exception 'Você só pode cadastrar usuários da sua empresa.';
  elsif not exists (select 1 from assistencia_usuarios where owner_id = p_empresa) then
    raise exception 'Empresa não encontrada.';
  end if;
  if exists (select 1 from assistencia_usuarios where email = v_email) then
    raise exception 'Este e-mail já tem acesso a uma empresa.';
  end if;

  select id into v_uid from auth.users where lower(email) = v_email limit 1;
  if v_uid is not null and exists (select 1 from assistencia_usuarios where user_id = v_uid) then
    raise exception 'Este e-mail já tem acesso a uma empresa.';
  end if;

  if v_uid is null then
    if length(coalesce(p_senha, '')) < 6 then
      raise exception 'A senha provisória precisa ter pelo menos 6 caracteres.';
    end if;
    v_uid := gen_random_uuid();
    v_novo := true;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      crypt(p_senha, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('app', 'Assistência ML', 'nome', v_nome),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;

  v_dono := coalesce(p_empresa, v_uid);
  insert into assistencia_usuarios (owner_id, user_id, email, nome, admin, trocar_senha)
  values (v_dono, v_uid, v_email, v_nome, p_empresa is null or coalesce(p_admin, false), v_novo);

  if p_empresa is null then
    begin
      insert into assistencia_loja (owner_id, nome) values (v_uid, trim(p_nova_empresa))
      on conflict (owner_id) do update set nome = excluded.nome;
    exception when others then
      raise notice 'Nome da empresa não gravado em assistencia_loja: %', sqlerrm;
    end;
  end if;

  return json_build_object('ja_tinha_conta', not v_novo, 'empresa', v_dono);
end $$;

-- Gera uma nova senha provisória (somente administrador geral)
create or replace function public.assistencia_redefinir_senha(p_id uuid, p_senha text)
returns void language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid;
begin
  if not public.assistencia_eh_admin_geral() then
    raise exception 'Somente o administrador geral pode redefinir senhas.';
  end if;
  if length(coalesce(p_senha, '')) < 6 then
    raise exception 'A senha provisória precisa ter pelo menos 6 caracteres.';
  end if;
  select user_id into v_uid from assistencia_usuarios where id = p_id;
  if v_uid is null then
    raise exception 'Usuário não encontrado.';
  end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = v_uid;
  update assistencia_usuarios set trocar_senha = true where id = p_id;
end $$;

-- funções das versões anteriores deste script
drop function if exists public.assistencia_papel();
drop function if exists public.assistencia_aceitar_convite();
drop function if exists public.assistencia_recusar_convite();

revoke all on function public.assistencia_minha_conta(), public.assistencia_senha_trocada(),
  public.assistencia_empresas(), public.assistencia_criar_usuario(text, text, text, boolean, uuid, text),
  public.assistencia_redefinir_senha(uuid, text) from public, anon;
grant execute on function public.assistencia_minha_conta(), public.assistencia_senha_trocada(),
  public.assistencia_empresas(), public.assistencia_criar_usuario(text, text, text, boolean, uuid, text),
  public.assistencia_redefinir_senha(uuid, text), public.assistencia_dono(), public.assistencia_eh_admin(),
  public.assistencia_eh_admin_geral(), public.assistencia_email() to authenticated;

-- 4) Regras de acesso de assistencia_usuarios ----------------------------------------
alter table public.assistencia_usuarios enable row level security;

drop policy if exists "usuarios: ver" on public.assistencia_usuarios;
create policy "usuarios: ver" on public.assistencia_usuarios for select to authenticated
  using (owner_id = public.assistencia_dono() or user_id = auth.uid() or public.assistencia_eh_admin_geral());

-- cadastro só pela função assistencia_criar_usuario
drop policy if exists "usuarios: admin cadastra" on public.assistencia_usuarios;

-- admin da empresa altera/remove só a própria empresa; admin geral, qualquer uma.
-- O dono da empresa e o administrador geral não podem ser alterados nem removidos.
drop policy if exists "usuarios: admin altera" on public.assistencia_usuarios;
create policy "usuarios: admin altera" on public.assistencia_usuarios for update to authenticated
  using ((public.assistencia_eh_admin_geral() or (owner_id = public.assistencia_dono() and public.assistencia_eh_admin()))
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com')
  with check (public.assistencia_eh_admin_geral() or (owner_id = public.assistencia_dono() and public.assistencia_eh_admin()));

drop policy if exists "usuarios: admin remove" on public.assistencia_usuarios;
create policy "usuarios: admin remove" on public.assistencia_usuarios for delete to authenticated
  using ((public.assistencia_eh_admin_geral() or (owner_id = public.assistencia_dono() and public.assistencia_eh_admin()))
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com');

revoke insert, update on public.assistencia_usuarios from anon, authenticated;
grant select, delete on public.assistencia_usuarios to authenticated;
grant update (nome, admin, ativo) on public.assistencia_usuarios to authenticated;

-- 5) Tabelas de dados: owner_id passa a ser a empresa do usuário logado --------------
-- Reescreve as regras existentes trocando auth.uid() por assistencia_dono(), preservando
-- qualquer outra condição que já exista.
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

-- Conferência: usuários, empresa e quem é admin
select email, nome, admin, ativo, trocar_senha, (user_id = owner_id) as dono_da_empresa, owner_id
from public.assistencia_usuarios order by owner_id, criado_em;
