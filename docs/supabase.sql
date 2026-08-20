-- ============================================================
-- AeroPrev · recepção do formulário no Supabase
-- ------------------------------------------------------------
-- Cole TUDO isto no SQL Editor do Supabase e clique RUN.
-- Pode rodar mais de uma vez sem quebrar (é idempotente).
--
-- O que ele cria:
--   1. a tabela que guarda as pré-análises;
--   2. as travas de segurança (RLS): o site só INSERE, quem LÊ é o
--      escritório logado;
--   3. o bucket privado onde os PDFs ficam guardados;
--   4. as travas do bucket: o site só ENVIA arquivo, quem BAIXA é o
--      escritório logado.
-- ============================================================

-- 1. TABELA das submissões -----------------------------------
create table if not exists public.submissoes (
  id          uuid primary key default gen_random_uuid(),
  protocolo   text,
  nome        text,
  email       text,
  telefone    text,
  dados       jsonb not null,
  arquivos    jsonb not null default '[]'::jsonb,
  status      text  not null default 'novo',
  criado_em   timestamptz not null default now()
);

-- 2. PERMISSÕES de tabela + TRAVAS de segurança (RLS) --------
alter table public.submissoes enable row level security;

-- o público usa a chave publishable, que o banco trata como papel "anon".
-- ele recebe só o direito de INSERIR; o escritório logado ("authenticated")
-- lê e atualiza. Ninguém apaga pela API.
grant insert on public.submissoes to anon;
grant select, update on public.submissoes to authenticated;

drop policy if exists "form_insere" on public.submissoes;
create policy "form_insere" on public.submissoes
  for insert to anon with check (true);

drop policy if exists "escritorio_le" on public.submissoes;
create policy "escritorio_le" on public.submissoes
  for select to authenticated using (true);

drop policy if exists "escritorio_atualiza" on public.submissoes;
create policy "escritorio_atualiza" on public.submissoes
  for update to authenticated using (true) with check (true);

-- o escritório logado também APAGA um cadastro (usado para tirar os testes).
-- só quem está autenticado: o site público (anon) continua sem esse direito.
grant delete on public.submissoes to authenticated;
drop policy if exists "escritorio_apaga" on public.submissoes;
create policy "escritorio_apaga" on public.submissoes
  for delete to authenticated using (true);

-- 3. STORAGE: bucket privado dos documentos ------------------
-- privado (public = false) e com teto de 20 MB por arquivo.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 20971520)
on conflict (id) do update
  set public = false, file_size_limit = 20971520;

-- 4. TRAVAS do bucket ----------------------------------------
-- público (anon): só ENVIA arquivo para o bucket "documentos".
drop policy if exists "doc_upload" on storage.objects;
create policy "doc_upload" on storage.objects
  for insert to anon with check (bucket_id = 'documentos');

-- escritório logado: LÊ / baixa os arquivos do bucket.
drop policy if exists "doc_le" on storage.objects;
create policy "doc_le" on storage.objects
  for select to authenticated using (bucket_id = 'documentos');

-- escritório logado: APAGA os anexos junto com o cadastro. Sem isso, excluir
-- um caso deixaria os PDFs órfãos ocupando o bucket para sempre.
drop policy if exists "doc_apaga" on storage.objects;
create policy "doc_apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');

-- ============================================================
-- Pronto. A partir daqui o formulário do site já grava aqui.
-- Falta só criar os logins do escritório em Authentication > Users
-- para o painel /admin ler os dados.
-- ============================================================
