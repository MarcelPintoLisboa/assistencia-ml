-- =====================================================================================
-- Assistência ML — ficha técnica de entrada no cadastro de produtos.
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Os campos da ficha em papel (tipo de entrada, ex-proprietário, nº de série, defeito,
-- acessórios, modelo, estado do aparelho...) ficam juntos numa coluna jsonb. Todos são
-- opcionais; produto sem ficha fica com null.
-- =====================================================================================

alter table public.assistencia_produtos
  add column if not exists ficha jsonb;
