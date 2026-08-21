-- ============================================================
-- AeroPrev — liberar o botão "excluir cadastro" do painel /admin
-- ============================================================
-- Rodar UMA vez, no painel do Supabase do projeto:
--   SQL Editor  >  New query  >  colar tudo  >  Run
--
-- É seguro rodar de novo se já tiver rodado: cada policy é
-- apagada e recriada, então não duplica nada.
--
-- O que isso faz: dá ao escritório LOGADO o direito de apagar
-- um cadastro e os anexos dele. O formulário público (anon)
-- continua só podendo enviar, nunca apagar.
-- ============================================================

-- 1. apagar o cadastro na tabela
grant delete on public.submissoes to authenticated;

drop policy if exists "escritorio_apaga" on public.submissoes;
create policy "escritorio_apaga" on public.submissoes
  for delete to authenticated using (true);

-- 2. apagar os documentos anexados junto
--    sem esta parte, excluir o cadastro deixaria os PDFs
--    órfãos ocupando o bucket para sempre.
drop policy if exists "doc_apaga" on storage.objects;
create policy "doc_apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');

-- ============================================================
-- Depois de rodar, recarregar o /admin e testar em um cadastro
-- de teste. A exclusão é definitiva, não tem lixeira.
-- ============================================================
