# Painel do escritório — o que existe e o que falta

## O que está pronto

`/admin` é a **interface** do painel, com o menu que o escritório pediu:

- **Dashboard** — métricas, roscas por situação e por objetivo, últimos cadastros.
- **Gestão de casos**
  - **Casos** — todos os cadastros, filtro por situação, busca; abre a ficha
    completa das 11 etapas.
  - **Análise previdenciária** — escolhe um cadastro e anexa a análise do CNIS
    e documentos de apoio.
  - **Cálculos** — mesma mecânica, para a planilha ou o PDF de cálculos.
  - **Relatórios** — gera, por cadastro, um relatório **simplificado** ou
    **completo**, que abre pronto para imprimir ou salvar em PDF.
- **Inteligência previdenciária** (Acervo jurisprudencial, Base jurídica, Análise
  inteligente) — no menu, marcadas **em breve**, para a segunda fase.
- **Escritório** — Equipe e Ajustes.

Os dados de cadastro na tela são **fictícios** e vêm de `assets/js/admin-dados.js`.
A faixa escura no topo diz isso, e ela só sai quando houver dados de verdade.

### Anexos ficam no navegador (IndexedDB)

Os arquivos que o escritório anexa em Análise e Cálculos são gravados no próprio
navegador, via `assets/js/admin-arquivos.js`. Continuam lá depois de fechar a aba
e podem ser reabertos ou baixados. **Não é servidor:** os arquivos ficam na
máquina de quem anexou e não são vistos por outra pessoa do escritório, nem
entram no relatório de quem abrir o painel em outro computador. É o passo
possível hoje, num site estático; a versão compartilhada é o item 3 abaixo.

**Armadilha resolvida:** o Safari/WebKit (o navegador do iPhone) **aborta** a
gravação de um objeto `File` no IndexedDB. Por isso guardamos os **bytes**
(`ArrayBuffer`) mais os metadados e remontamos o arquivo na leitura. Testado e
funcionando em WebKit e Chromium; não voltar a gravar `File` direto.

## O que falta para receber de verdade

O site é estático. Não existe servidor, banco de dados nem login. Hoje, quando
alguém conclui o formulário, os dados **não saem do navegador da pessoa**:
o rascunho fica em `localStorage` e os arquivos ficam só em memória.

São quatro peças, nesta ordem de dependência:

### 1. Login (bloqueante, não é opcional)

Existe uma tela em `/login`, e o `/admin` redireciona para ela quando não há
sessão. **Isso é fluxo, não segurança.** A conferência roda no navegador de
quem acessa: basta abrir o console e gravar a chave de sessão à mão para
entrar. O código está num repositório público, então nem o hash da senha
esconde alguma coisa.

Serve enquanto o painel só tem dados fictícios, e mostra ao cliente como o
acesso vai funcionar. Não pode receber dado real assim.

Credencial de demonstração: **usuário `sartori`, senha `aeroprev2026`**.
Fica anotada aqui de propósito, porque não é segurança de verdade.

Para trocar, gere o novo hash e substitua a constante `ESPERADO` em
`assets/js/entrada.js`:

```bash
python3 -c "import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" 'usuario:senha'
```

O usuário é comparado em minúsculas, sem espaços nas pontas.

A autenticação de verdade precisa acontecer antes de o arquivo sair do
servidor. Hoje qualquer pessoa que digite `/admin` já baixou o HTML inteiro
antes de a tela de login aparecer. O `noindex` tira do Google, mas não
protege: quem souber o endereço entra.

O formulário coleta **dado pessoal sensível** na acepção do art. 5º, II da LGPD:
as perguntas sobre doença que dificulta trabalhar, pessoa com deficiência e os
laudos médicos anexados são dados de saúde. Vazamento aqui é incidente
reportável à ANPD, num escritório de advocacia.

### 2. Banco de dados

Guarda as respostas das 11 etapas. Cada pré-análise é um registro; o contrato
já está definido pelo payload que o formulário monta hoje
(`montaPayload()` em `assets/js/formulario.js`).

### 3. Armazenamento de arquivos

Os PDFs. O formulário aceita **até 15 MB por arquivo** em 4 campos de upload,
sem limite de quantidade. Uma pré-análise com caderneta de voo digitalizada e
processo administrativo chega fácil a 40 MB.

**Armadilha:** uma função serverless da Vercel aceita no máximo 4,5 MB no corpo
da requisição. Mandar o arquivo "através" do servidor **não funciona** nesse
tamanho. O upload precisa ir do navegador direto para o armazenamento, com URL
assinada. Isso muda o desenho, então é melhor decidir agora do que descobrir
depois.

### 4. O endpoint que liga as duas pontas

O formulário já tem o gancho pronto: se `window.AEROPREV_ENDPOINT` estiver
definido, ele envia tudo em `multipart/form-data`. Sem isso, apenas imprime o
payload no console.

## Caminhos possíveis

### A. Supabase + Vercel  — recomendado

Banco (Postgres), armazenamento de arquivos e login numa assinatura só, com
região em São Paulo, o que ajuda no argumento de LGPD. Upload direto do
navegador com URL assinada, que é o que o tamanho dos arquivos exige.

- Custo: gratuito até 500 MB de banco e 1 GB de arquivos; **US$ 25/mês** no
  plano Pro (8 GB de banco, 100 GB de arquivos). Com 40 MB por pré-análise, o
  plano gratuito segura cerca de 25 casos, o Pro passa de 2.000.
- Esforço: 2 a 3 dias de trabalho.

### B. Tudo na Vercel (Blob + Postgres)

Menos peças para administrar, mas o login teria de ser montado à mão e o
Postgres hoje é revendido via parceiro. Custo semelhante, menos vantagem.

### C. Só e-mail, sem painel

O formulário dispara um e-mail com os anexos para o escritório. Barato e rápido
de fazer, mas **não recomendo**: anexo de e-mail costuma parar em 25 MB, então
os casos maiores falham justamente por serem os mais completos. E não há busca,
histórico nem controle de quem já foi analisado, que é o motivo de existir o
painel.

### D. Google Drive do escritório

Se já existe Google Workspace, os arquivos vão para uma pasta e uma planilha
recebe as respostas. Custo praticamente zero. Serve como etapa intermediária,
mas o controle de acesso é o do Drive, e a ficha organizada por etapa se perde.

## Recomendação

Caminho A. E, enquanto o login não existir, o `/admin` fica **só com os dados de
demonstração** — que é exatamente o estado atual.

## Decisões que dependem do cliente

- Quem tem acesso ao painel, e com qual permissão.
- Por quanto tempo os documentos ficam guardados depois de concluída a análise.
  A LGPD pede prazo definido, não "para sempre".
- Quem é o encarregado de dados (DPO). Já está pendente na política de
  privacidade do site, e vira obrigatório no momento em que houver banco.
