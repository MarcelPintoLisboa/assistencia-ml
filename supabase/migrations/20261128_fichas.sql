-- =====================================================================================
-- Assistência ML — fichas em papel dentro do app, foto e modelo do produto.
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem problema (também se já rodou uma versão anterior deste script).
--
--  * assistencia_produtos.ficha  — "Ficha técnica de entrada" do produto (tudo opcional).
--  * assistencia_produtos.modelo — modelo do produto (opcional, aparece no story do Instagram).
--  * assistencia_produtos.foto   — foto do produto (data URI, opcional).
--  * assistencia_ordens.ficha    — "Ficha envio assistência" da OS (tipo, situação do aparelho,
--    acessórios, controle, serviços...). Sai na etiqueta e na ficha impressa.
-- As fichas ficam numa coluna jsonb; sem ficha = null.
-- =====================================================================================

alter table public.assistencia_produtos
  add column if not exists ficha jsonb,
  add column if not exists modelo text,
  add column if not exists foto text;

alter table public.assistencia_ordens
  add column if not exists ficha jsonb;
