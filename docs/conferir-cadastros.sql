-- ============================================================
-- AeroPrev — conferir o que está na base
-- ============================================================
-- Onde rodar:
--   painel do Supabase do projeto  >  SQL Editor  >  New query
--   colar  >  Run
--
-- Por que aqui e não pelo /admin: o SQL Editor roda como dono do
-- banco e ignora as políticas de segurança. Fora dele, uma consulta
-- sem permissão devolve lista VAZIA em vez de erro, e vazio por
-- falta de permissão é idêntico a vazio por não ter dado. Foi essa
-- ambiguidade que fez o painel parecer apagado em 10/09/2026.
--
-- Só lê. Nenhuma consulta deste arquivo altera nada.
-- ============================================================


-- 1. QUANTOS CADASTROS EXISTEM, E DE QUANDO -------------------
--    Se vier 0 aqui, aí sim a base está vazia de verdade.

select count(*) as total,
       min(criado_em) as mais_antigo,
       max(criado_em) as mais_recente
from public.submissoes;


-- 2. OS ÚLTIMOS 20, PARA BATER O OLHO ------------------------

select protocolo,
       nome,
       email,
       criado_em,
       coalesce(jsonb_array_length(arquivos), 0) as anexos
from public.submissoes
order by criado_em desc
limit 20;


-- 3. UM CADASTRO ESPECÍFICO ----------------------------------
--    Troque o nome. O ilike não diferencia maiúscula de minúscula
--    e o % nas pontas acha o nome no meio do nome completo.

select id,
       protocolo,
       nome,
       email,
       telefone,
       criado_em,
       arquivos
from public.submissoes
where nome ilike '%viviane%'
   or email ilike '%viviane%'
order by criado_em desc;


-- 4. OS ARQUIVOS DESSA PESSOA, NO STORAGE --------------------
--    A consulta 3 devolve os caminhos em `arquivos`. Esta aqui
--    confirma que cada caminho tem mesmo um arquivo por trás:
--    o registro pode existir sem o PDF, e o contrário também.

select o.name                                   as caminho,
       round((o.metadata->>'size')::bigint / 1024.0) as kb,
       o.created_at
from storage.objects o
join public.submissoes s on o.name like s.id::text || '/%'
where s.nome ilike '%viviane%'
order by o.created_at;


-- 5. O BUCKET INTEIRO, SE PRECISAR DE UMA VISÃO GERAL --------

select count(*) as arquivos,
       pg_size_pretty(sum((metadata->>'size')::bigint)) as peso_total
from storage.objects
where bucket_id = 'documentos';


-- 6. REGISTRO SEM ARQUIVO, OU ARQUIVO SEM REGISTRO -----------
--    Os dois casos são possíveis: o formulário sobe os anexos
--    primeiro e grava a linha depois, então uma falha no meio
--    deixa arquivo órfão. Linha sem arquivo é o caso mais grave.

select s.protocolo,
       s.nome,
       s.criado_em,
       coalesce(jsonb_array_length(s.arquivos), 0) as anexos_no_registro,
       (select count(*) from storage.objects o
         where o.bucket_id = 'documentos'
           and o.name like s.id::text || '/%')     as anexos_no_bucket
from public.submissoes s
order by s.criado_em desc
limit 30;
