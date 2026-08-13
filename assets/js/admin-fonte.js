/* AeroPrev — fonte de dados do painel.
   Lê as submissões reais do Supabase e traduz cada uma para a mesma forma de
   registro que o painel (admin.js) já sabe desenhar. Substitui os dados
   fictícios de admin-dados.js. Os rótulos (situações, estados, objetivos)
   espelham o formulário. */
(function () {
  'use strict';

  /* espelhado de assets/js/formulario.js (perguntas de sim/não) */
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

  /* o painel começa sem registros; admin.js pede AEROPREV_FONTE.carregar() */
  window.AEROPREV_DEMO = { registros: [], situacoes: SITUACOES, estados: ESTADOS, objetivos: OBJETIVOS };

  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(function (x) { return x.length > 2; });
    if (!p.length) return String(nome || '?').slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  function tipoDe(nome, mime) {
    var ext = String(nome || '').split('.').pop().toUpperCase();
    if (ext && ext.length >= 2 && ext.length <= 4 && ext !== nome.toUpperCase()) return ext;
    if (/pdf/i.test(mime)) return 'PDF';
    if (/image/i.test(mime)) return 'IMG';
    if (/word|document/i.test(mime)) return 'DOC';
    return 'ARQ';
  }

  /* traduz uma linha do banco para a forma que admin.js espera */
  function mapa(row) {
    var d = row.dados || {};
    var r = d.respostas || {};
    var vincs = Array.isArray(r.vinculos) ? r.vinculos : [];
    var arqs = Array.isArray(row.arquivos) ? row.arquivos : [];
    return {
      _id: row.id,
      proto: row.protocolo || d.protocolo || String(row.id).slice(0, 8),
      status: (row.status && row.status !== 'novo') ? row.status : 'nova',
      nome: row.nome || r.nome || 'Sem nome',
      iniciais: iniciais(row.nome || r.nome),
      cpf: r.cpf || '',
      nascimento: r.nascimento || '',
      estadoCivil: r.estado_civil || '',
      profissao: r.profissao || '',
      email: row.email || r.email || '',
      telefone: row.telefone || r.telefone || '',
      cidade: r.cidade || '',
      estado: r.estado || '',
      objetivo: r.objetivo || '',
      objetivoDetalhe: r.objetivo_detalhe || '',
      atividades: Array.isArray(r.atividades) ? r.atividades : [],
      vinculos: vincs.map(function (v) {
        return {
          empresa: v.empresa || '(empresa não informada)',
          funcao: v.cargo || '',
          inicio: v.admissao || '',
          fim: v.atual ? 'Atual' : (v.saida || '')
        };
      }),
      militar: r.militar === 'Sim'
        ? { serviu: true, inicio: r.militar_inicio || '', fim: r.militar_fim || '' }
        : { serviu: false },
      outras: (Array.isArray(r.outras_atividades) ? r.outras_atividades : [])
        .filter(function (x) { return x && x !== 'Outro'; }),
      beneficios: (Array.isArray(r.beneficios) ? r.beneficios : [])
        .filter(function (x) { return x && x !== 'Nunca recebi'; }),
      procInss: r.proc_inss === 'Sim'
        ? { tem: true, num: r.proc_inss_num || 'sem número', sit: r.proc_inss_sit || '' }
        : { tem: false },
      procTrab: r.proc_trab === 'Sim'
        ? { tem: true, num: r.proc_trab_num || 'sem número', sit: r.proc_trab_sit || '' }
        : { tem: false },
      situacoes: (r.situacoes && typeof r.situacoes === 'object') ? r.situacoes : {},
      docs: arqs.map(function (a) {
        return { nome: a.nome || 'arquivo', tipo: tipoDe(a.nome, a.tipo), peso: a.tamanho || 0, caminho: a.caminho };
      }),
      observacoes: r.observacoes || '',
      recebido: d.enviadoEm || row.criado_em || new Date().toISOString(),
      atualizado: row.criado_em || d.enviadoEm || new Date().toISOString()
    };
  }

  window.AEROPREV_FONTE = {
    carregar: function () {
      if (!window.AeroPrevSB) return Promise.reject(new Error('cliente Supabase ausente'));
      return AeroPrevSB.api('/rest/v1/submissoes?select=*&order=criado_em.desc').then(function (r) {
        if (r.status === 401 || r.status === 403) {
          var e = new Error('sem acesso'); e.auth = true; throw e;
        }
        if (!r.ok) throw new Error('falha ao ler submissões (HTTP ' + r.status + ')');
        return r.json();
      }).then(function (linhas) {
        return (Array.isArray(linhas) ? linhas : []).map(mapa);
      });
    }
  };
})();
