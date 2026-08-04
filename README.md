# AeroPrev

Site institucional da AeroPrev, serviço de pré-análise previdenciária para aeronautas e
aeroviários mantido pelo escritório Sartori & Wöhlke Advocacia.

HTML, CSS e JavaScript puros. Sem framework, sem dependência de runtime.

## Como rodar

```bash
npx serve -l 8753 .
```

Abre em `http://localhost:8753`. O que você edita na raiz é o que aparece.

## Como publicar

```bash
python3 build.py
```

Gera `dist/`, que é o que o Vercel serve (`outputDirectory` no `vercel.json`).
O build faz três coisas: coloca o CSS inline no HTML, minifica o JavaScript e
reescreve os caminhos das fontes.

**Rode o build antes de todo commit que vá para produção.** Editar só a raiz e
esquecer o `dist/` publica a versão antiga.

## Estrutura

```
index.html            página principal, com a geometria da marca em <defs>
privacidade.html      política de privacidade (LGPD)
termos.html           termos de uso
assets/css/site.css   folha única, organizada por seção
assets/js/intro.js    animação de abertura da marca
assets/js/site.js     cabeçalho, menu, revelações, parallax, perguntas
assets/js/formulario.js  formulário de pré-análise em 10 etapas
assets/fonts/         Newsreader e Instrument Sans, subsetadas para pt-BR
build.py              gera dist/
```

## A marca

O SVG original era um traçado automático: quatro caminhos sem estrutura, com um
retângulo branco cobrindo o fundo e as formas em negativo. Ele foi dissecado em
nove peças nomeadas, que vivem uma única vez no `<defs>` do `index.html` e são
referenciadas por `<use>` em todo o resto:

`pc-escudo`, `pc-circulo`, `pc-trilha-d`, `pc-trilha-v1`, `pc-trilha-v2`,
`pc-aviao`, `pc-w-aero`, `pc-w-prev`, `pc-regua`

Os fills usam a paleta oficial, não as cores aproximadas do traçado.

## A abertura

`assets/js/intro.js`. O escudo se forma de cima para baixo, o círculo é traçado no
sentido horário, o avião entra por uma curva Bézier deixando o rastro nascer atrás
dele, o wordmark revela da esquerda para a direita e a régua fecha. Dura 2,84 s.

- Roda uma vez por sessão (`sessionStorage`).
- Clique, Esc, Enter ou espaço pulam para o fim.
- Respeita `prefers-reduced-motion`.
- Para ajustar o ritmo, mexa no objeto `T` e em `DUR`, no topo do arquivo.

## O formulário

`assets/js/formulario.js`. As 10 etapas são descritas como dados, no array `ETAPAS`
no topo do arquivo. Para mudar um campo, mexa ali: o motor renderiza, valida, salva
e monta o payload sozinho.

Tipos de campo disponíveis: `texto`, `email`, `tel`, `data`, `cpf`, `cep`, `select`,
`textarea`, `radio`, `checks`, `vinculos` (repetidor), `upload`, `matriz`
(possuo / não possuo / anexar) e `declaracoes`.

Um campo com `se: { c: 'campo', v: 'valor' }` só aparece quando aquela condição bate.

O rascunho é salvo no `localStorage` a cada alteração, então o usuário pode fechar e
voltar depois, do mesmo aparelho. Os arquivos anexados ficam só em memória, porque
`File` não serializa.

### Ligar no backoffice

O formulário já monta o pacote completo. Falta apenas apontar para onde enviar:

```html
<script>window.AEROPREV_ENDPOINT = 'https://seu-backend/api/pre-analise';</script>
```

Coloque antes de `formulario.js`. O envio vai como `multipart/form-data`:

- campo `dados`: JSON com `{ versao, formulario, protocolo, enviadoEm, respostas, anexos }`
- um campo por grupo de arquivos, no formato `nome_do_grupo[]`

Sem o endpoint definido, o formulário conclui normalmente e imprime o payload no
console, o que serve para testar o fluxo inteiro antes do backend existir.

## Desempenho

Lighthouse mobile, throttling real (`--throttling-method=devtools`):

| | com a abertura | sem a abertura |
|---|---|---|
| Performance | 93 | 97 |
| Acessibilidade | 100 | 100 |
| Boas práticas | 100 | 100 |
| SEO | 100 | 100 |

A diferença está toda no Speed Index: uma tela de abertura de 2,84 s atrasa o
preenchimento visual por definição. Como ela roda uma vez por sessão, o usuário
que volta tem a experiência de 97. LCP 2,6 s, CLS 0,005, TBT 0 ms nos dois casos.

## Pendências do cliente

Procure por `[A PREENCHER]` no repositório. Hoje falta:

- **`index.html`**: e-mail de contato do rodapé e a resposta sobre custo da pré-análise
- **`privacidade.html`**: razão social, CNPJ, endereço e e-mail do encarregado de dados
- **`termos.html`**: comarca do foro

Também vale confirmar com o escritório se a publicidade está adequada ao Provimento
205/2021 da OAB. O texto foi escrito sem promessa de resultado, sem oferta de
serviços e sem menção a honorários, mas a validação final é de quem assina.
