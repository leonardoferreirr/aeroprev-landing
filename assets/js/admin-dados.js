/* AeroPrev — dados de DEMONSTRACAO do painel.
   Nada aqui e real: os registros sao montados por uma funcao deterministica,
   os CPFs sao mascarados de proposito e os arquivos nao existem. Este arquivo
   sai do projeto no dia em que o painel passar a ler de um banco. */
window.AEROPREV_DEMO = (function () {
  'use strict';

  /* rotulos espelhados do formulario (assets/js/formulario.js) */
  var SITUACOES = [
    ['rural', 'Nasceu em zona rural e trabalhou em regime de economia familiar?'],
    ['jovem_aprendiz', 'Foi jovem aprendiz?'],
    ['escola_tecnica', 'Fez escola técnica?'],
    ['contrato_experiencia', 'Teve contrato de experiência?'],
    ['autonomo', 'Foi autônomo ou contribuinte individual?'],
    ['gps', 'Já recolheu contribuição em GPS (carnê)?'],
    ['servico_publico', 'Exerceu serviço público concursado?'],
    ['ctc', 'Tem certidão de tempo de contribuição?'],
    ['exterior', 'Trabalhou fora do Brasil?'],
    ['risco_saude', 'Teve risco à saúde ou à integridade física no trabalho?'],
    ['pcd', 'Trabalhou como pessoa com deficiência?'],
    ['doenca', 'Sofre ou sofreu doença que dificulta trabalhar?'],
    ['copia_processo_adm', 'Tem cópia do processo administrativo do INSS?'],
    ['colega_especial', 'Algum colega de trabalho conseguiu reconhecer atividade especial?']
  ];

  var ESTADOS = [
    { id: 'nova', rot: 'Nova' },
    { id: 'analise', rot: 'Em análise' },
    { id: 'documentos', rot: 'Aguardando documentos' },
    { id: 'concluida', rot: 'Concluída' },
    { id: 'arquivada', rot: 'Arquivada' }
  ];

  var OBJETIVOS = [
    'Pré-análise de aposentadoria especial do aeronauta',
    'Revisão de aposentadoria',
    'Planejamento previdenciário',
    'Reconhecimento de atividade especial',
    'Averbação de tempo de contribuição',
    'Conversão de tempo especial em comum',
    'Análise de viabilidade para ação judicial'
  ];

  var FUNCOES = ['Comissário', 'Piloto', 'Mecânico', 'Despachante Operacional', 'Manutenção'];

  /* nomes de fantasia: nao correspondem a pessoas nem a empresas reais */
  var NOMES = [
    'Helena Marcondes Prado', 'Rubens Tavares Aleixo', 'Cláudia Bettencourt Lima',
    'Otávio Serrano Mendes', 'Bianca Estrela Nogueira', 'Wagner Pontes Vilela',
    'Marina Quintela Rosa', 'Sérgio Amarante Dutra', 'Letícia Vasconcelos Braga',
    'Fábio Andrade Peixoto', 'Renata Ourique Castilho', 'Adriano Vilar Fontes',
    'Patrícia Marinho Sobral', 'Gustavo Rangel Teixeira'
  ];
  var EMPRESAS = ['Aeromares Linhas Aéreas', 'Cruzeiro do Vale Táxi Aéreo', 'Pontal Cargas Aéreas',
    'Bandeirante Manutenção Aeronáutica', 'Litoral Norte Aviação'];
  var CIDADES = [['São José dos Campos', 'SP'], ['Guarulhos', 'SP'], ['Rio de Janeiro', 'RJ'],
    ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'], ['Porto Alegre', 'RS'], ['Recife', 'PE']];

  var ARQUIVOS = [
    ['CNIS-atualizado.pdf', 'PDF', 1840000],
    ['CTPS-digitalizada.pdf', 'PDF', 4210000],
    ['PPP-assinado.pdf', 'PDF', 920000],
    ['LTCAT-2019.pdf', 'PDF', 2650000],
    ['Cadernetas-de-voo.pdf', 'PDF', 7380000],
    ['Escalas-2016-2021.pdf', 'PDF', 3120000],
    ['Licenca-ANAC.jpg', 'JPG', 640000],
    ['Comprovante-residencia.pdf', 'PDF', 380000],
    ['RG-e-CPF.pdf', 'PDF', 510000],
    ['Contracheques-2020.pdf', 'PDF', 2040000],
    ['Laudo-medico.pdf', 'PDF', 1120000],
    ['Processo-administrativo.pdf', 'PDF', 11900000]
  ];

  /* gerador deterministico: mesma entrada, mesmo resultado em qualquer maquina */
  function semente(i) { return (i * 2654435761) % 4294967296; }
  function pega(lista, i, deslocamento) {
    return lista[(semente(i + (deslocamento || 0)) >>> 8) % lista.length];
  }
  function dado(i, deslocamento, teto) {
    return (semente(i + (deslocamento || 0) * 97) >>> 11) % teto;
  }

  var BASE = new Date('2026-08-06T18:00:00');
  function quando(horasAtras) {
    return new Date(BASE.getTime() - horasAtras * 3600000).toISOString();
  }

  var registros = NOMES.map(function (nome, i) {
    var st = ESTADOS[i < 3 ? 0 : i < 7 ? 1 : i < 10 ? 2 : i < 13 ? 3 : 4];
    var cidade = pega(CIDADES, i, 3);
    var iniciais = nome.split(' ').filter(function (p) { return p.length > 2; });
    var qtdFuncoes = 1 + dado(i, 4, 2);
    var funcoes = FUNCOES.slice(dado(i, 5, 3)).slice(0, qtdFuncoes);
    var qtdVinculos = 1 + dado(i, 6, 3);
    var qtdDocs = st.id === 'documentos' ? 1 + dado(i, 7, 3) : 3 + dado(i, 7, 7);

    var situacoes = {};
    SITUACOES.forEach(function (s, j) {
      situacoes[s[0]] = dado(i, 10 + j, 100) < 26;   // ~1 em 4 marcado
    });

    var anoNasc = 1962 + dado(i, 13, 26);
    var temInss = dado(i, 8, 100) < 34;
    var temTrab = dado(i, 9, 100) < 22;

    return {
      proto: 'AP-2026-' + String(148 - i).padStart(4, '0'),
      status: st.id,
      nome: nome,
      iniciais: (iniciais[0][0] + iniciais[iniciais.length - 1][0]).toUpperCase(),
      cpf: String(100 + dado(i, 11, 800)) + '.***.***-' + String(10 + dado(i, 12, 89)),
      nascimento: anoNasc + '-' + String(1 + dado(i, 14, 12)).padStart(2, '0') + '-' + String(1 + dado(i, 15, 27)).padStart(2, '0'),
      estadoCivil: pega(['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'], i, 16),
      profissao: funcoes[0],
      email: nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '.demo@exemplo.com',
      telefone: '(' + pega([11, 12, 13, 19, 21, 24, 31, 41, 47, 51, 61, 81], i, 17) + ') 9' +
        String(1000 + dado(i, 18, 8999)) + '-' + String(1000 + dado(i, 19, 8999)),
      cidade: cidade[0], estado: cidade[1],
      objetivo: pega(OBJETIVOS, i, 20),
      objetivoDetalhe: i % 3 === 0
        ? 'Trabalhei em voo por mais de vinte anos e quero saber se já posso pedir a aposentadoria especial ou se falta tempo.'
        : '',
      atividades: funcoes,
      /* encadeados no tempo e sem repetir empresa: periodo sobreposto e
         justamente o que o escritorio procura, nao pode aparecer por engano */
      vinculos: (function () {
        var ano = anoNasc + 19 + dado(i, 30, 7);
        var mes = 1 + dado(i, 31, 12);
        var usadas = [];
        return Array.from({ length: qtdVinculos }, function (_, v) {
          var opcoes = EMPRESAS.filter(function (e) { return usadas.indexOf(e) < 0; });
          var empresa = opcoes[(semente(i + 32 + v) >>> 8) % opcoes.length];
          usadas.push(empresa);
          var dur = 3 + dado(i, 33 + v, 9);
          var iniAno = ano, iniMes = mes;
          ano += dur; mes = 1 + dado(i, 34 + v, 12);
          return {
            empresa: empresa,
            funcao: funcoes[v % funcoes.length],
            inicio: iniAno + '-' + String(iniMes).padStart(2, '0'),
            fim: ano + '-' + String(mes).padStart(2, '0')
          };
        });
      })(),
      militar: dado(i, 21, 100) < 40
        ? { serviu: true, inicio: (anoNasc + 18) + '-03', fim: (anoNasc + 19) + '-02' }
        : { serviu: false },
      outras: dado(i, 22, 100) < 45
        ? [pega(['Indústria', 'Transporte', 'Energia', 'Construção Civil', 'Metalurgia'], i, 23)] : [],
      beneficios: dado(i, 24, 100) < 30
        ? [pega(['Auxílio-doença', 'Auxílio-acidente', 'Aposentadoria'], i, 25)] : ['Nunca recebi'],
      procInss: temInss
        ? { tem: true, num: '500' + String(1000 + dado(i, 26, 8999)) + '-22.2024.4.03.6100', sit: pega(['Em análise administrativa', 'Aguardando perícia', 'Em fase judicial', 'Recurso'], i, 27) }
        : { tem: false },
      procTrab: temTrab
        ? { tem: true, num: '001' + String(1000 + dado(i, 28, 8999)) + '-45.2023.5.02.0011', sit: pega(['Em andamento', 'Em recurso', 'Em execução'], i, 29) }
        : { tem: false },
      situacoes: situacoes,
      docs: Array.from({ length: qtdDocs }, function (_, d) {
        var a = ARQUIVOS[(d + dado(i, 40, 6)) % ARQUIVOS.length];
        return { nome: a[0], tipo: a[1], peso: a[2] };
      }),
      observacoes: i % 4 === 1
        ? 'Perdi a carteira de trabalho antiga num incêndio. Tenho só as cópias que a empresa mandou por e-mail.'
        : '',
      recebido: quando(6 + i * 17 + dado(i, 41, 9)),
      atualizado: quando(2 + i * 11 + dado(i, 42, 5))
    };
  });

  return { registros: registros, situacoes: SITUACOES, estados: ESTADOS, objetivos: OBJETIVOS };
})();
