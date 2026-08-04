/* AeroPrev — formulario de pre-analise previdenciaria em 10 etapas.
   As etapas sao descritas como dados; o motor renderiza, valida, salva e monta o
   payload. O backoffice consome esse mesmo contrato. */
(function () {
  'use strict';

  /* =======================================================
     1. ESTRUTURA DAS ETAPAS
     ======================================================= */

  var DOCS_ESPECIAIS = [
    ['ppp', 'PPP (Perfil Profissiográfico Previdenciário)'],
    ['ltcat', 'LTCAT (Laudo Técnico das Condições Ambientais)'],
    ['pcmso', 'PCMSO'], ['pgr', 'PGR'], ['ppra', 'PPRA'], ['aso', 'ASO'],
    ['escalas', 'Escalas de voo'],
    ['horas', 'Relatórios de horas de voo'],
    ['civ', 'CIV (Caderneta Individual de Voo)'],
    ['anac', 'Licenças da ANAC'],
    ['fichas', 'Fichas funcionais'],
    ['contratos', 'Contratos de trabalho'],
    ['contracheques', 'Contracheques'],
    ['trct', 'TRCT (Termo de Rescisão)'],
    ['laudos_tec', 'Laudos técnicos'],
    ['declaracoes_emp', 'Declarações da empresa']
  ];

  var DOCS_MEDICOS = [
    ['laudos', 'Laudos'], ['exames', 'Exames'],
    ['cat', 'CAT (Comunicação de Acidente de Trabalho)'],
    ['atestados', 'Atestados'], ['prontuarios', 'Prontuários']
  ];

  var ETAPAS = [
    {
      id: 'identificacao', nome: 'Identificação',
      titulo: 'Seus dados',
      texto: 'Preencha exatamente como consta nos seus documentos. Esses dados identificam o seu caso e são usados para o contato da equipe.',
      blocos: [{
        campos: [
          { t: 'texto', n: 'nome', r: 'Nome completo', req: 1, ac: 'name', ph: 'Como consta no seu documento' },
          { t: 'cpf', n: 'cpf', r: 'CPF', req: 1, ph: '000.000.000-00', larg: 'meio' },
          { t: 'texto', n: 'rg', r: 'RG', req: 1, ph: 'Número e órgão emissor', larg: 'meio' },
          { t: 'data', n: 'nascimento', r: 'Data de nascimento', req: 1, larg: 'meio' },
          {
            t: 'select', n: 'estado_civil', r: 'Estado civil', req: 1, larg: 'meio',
            ops: ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)']
          },
          { t: 'texto', n: 'nacionalidade', r: 'Nacionalidade', req: 1, val: 'Brasileira', larg: 'meio' },
          { t: 'texto', n: 'profissao', r: 'Profissão atual', req: 1, ph: 'Função que exerce hoje', larg: 'meio' }
        ]
      }, {
        titulo: 'Contato',
        campos: [
          { t: 'email', n: 'email', r: 'E-mail', req: 1, ac: 'email', ph: 'voce@email.com', larg: 'meio' },
          { t: 'tel', n: 'telefone', r: 'Celular com WhatsApp', req: 1, ac: 'tel', ph: '(00) 00000-0000', larg: 'meio' },
          { t: 'tel', n: 'telefone_alt', r: 'Telefone alternativo', ph: '(00) 0000-0000', larg: 'meio' }
        ]
      }, {
        titulo: 'Endereço',
        campos: [
          { t: 'texto', n: 'endereco', r: 'Endereço completo', req: 1, ac: 'street-address', ph: 'Rua, número e complemento' },
          { t: 'cep', n: 'cep', r: 'CEP', req: 1, ph: '00000-000', larg: 'terco' },
          { t: 'texto', n: 'cidade', r: 'Cidade', req: 1, ac: 'address-level2', larg: 'terco' },
          {
            t: 'select', n: 'estado', r: 'Estado', req: 1, larg: 'terco',
            ops: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
          }
        ]
      }]
    },

    {
      id: 'caso', nome: 'Objetivo',
      titulo: 'O que você procura',
      texto: 'Escolha o objetivo principal do atendimento. Se houver mais de um, selecione o mais urgente e explique o restante no campo aberto.',
      blocos: [{
        campos: [{
          t: 'radio', n: 'objetivo', r: 'Objetivo do atendimento', req: 1,
          ops: [
            'Pré-análise de aposentadoria especial do aeronauta',
            'Revisão de aposentadoria',
            'Planejamento previdenciário',
            'Reconhecimento de atividade especial',
            'Averbação de tempo de contribuição',
            'Conversão de tempo especial em comum',
            'Análise de viabilidade para ação judicial',
            'Outro'
          ]
        }, {
          t: 'textarea', n: 'objetivo_detalhe', r: 'Conte um pouco mais sobre o seu caso',
          ph: 'Se preferir, escreva aqui o que motivou a busca pela análise.'
        }]
      }]
    },

    {
      id: 'historico', nome: 'Histórico',
      titulo: 'Sua trajetória na aviação',
      texto: 'Liste cada empresa em que trabalhou. Se não lembrar as datas exatas, informe o mês e o ano aproximados, a equipe confere depois com o CNIS.',
      blocos: [{
        campos: [
          { t: 'radio', n: 'trabalhou_aviacao', r: 'Você já trabalhou ou trabalha na aviação?', req: 1, ops: ['Sim', 'Não'], linha: 1 },
          { t: 'vinculos', n: 'vinculos', r: 'Vínculos empregatícios' }
        ]
      }]
    },

    {
      id: 'atividades', nome: 'Atividades',
      titulo: 'Funções que você exerceu',
      texto: 'Marque todas as funções que exerceu ao longo da carreira, mesmo que por períodos curtos ou em empresas diferentes.',
      blocos: [{
        campos: [{
          t: 'checks', n: 'atividades', r: 'Atividades exercidas', req: 1, duas: 1,
          ops: ['Comissário', 'Piloto', 'Mecânico', 'Despachante Operacional', 'Manutenção']
        }]
      }]
    },

    {
      id: 'militar', nome: 'Tempo militar',
      titulo: 'Serviço militar',
      texto: 'O tempo nas Forças Armadas pode ser aproveitado na contagem, por isso ele entra na análise.',
      blocos: [{
        campos: [
          { t: 'radio', n: 'militar', r: 'Serviu nas Forças Armadas?', req: 1, ops: ['Sim', 'Não'], linha: 1 },
          { t: 'data', n: 'militar_inicio', r: 'Data de início', larg: 'meio', se: { c: 'militar', v: 'Sim' } },
          { t: 'data', n: 'militar_fim', r: 'Data de término', larg: 'meio', se: { c: 'militar', v: 'Sim' } }
        ]
      }]
    },

    {
      id: 'outras', nome: 'Outras atividades',
      titulo: 'Atividades especiais fora da aviação',
      texto: 'Trabalho com exposição a agentes nocivos em outros setores também pode contar como tempo especial. Marque o que se aplica.',
      blocos: [{
        campos: [{
          t: 'checks', n: 'outras_atividades', r: 'Setores em que trabalhou', duas: 1,
          ops: ['Educação', 'Hospital', 'Indústria', 'Construção Civil', 'Metalurgia', 'Mineração', 'Transporte', 'Energia', 'Petroquímica', 'Outro']
        }, {
          t: 'textarea', n: 'outras_detalhe', r: 'Detalhes desses períodos',
          ph: 'Empresa, função e período aproximado, se lembrar.'
        }]
      }]
    },

    {
      id: 'beneficios', nome: 'Benefícios',
      titulo: 'Benefícios previdenciários',
      texto: 'Informe se você já recebeu ou recebe algum benefício do INSS. Isso muda a estratégia da análise.',
      blocos: [{
        campos: [{
          t: 'checks', n: 'beneficios', r: 'Benefícios já recebidos', req: 1, duas: 1,
          ops: ['Auxílio-doença', 'Auxílio-acidente', 'Aposentadoria', 'BPC', 'Pensão', 'Nunca recebi']
        }, {
          t: 'texto', n: 'beneficio_numero', r: 'Número do benefício, se souber', ph: 'Apenas números'
        }]
      }]
    },

    {
      id: 'processos', nome: 'Processos',
      titulo: 'Processos em andamento',
      texto: 'Se já existe processo, a equipe precisa saber antes de qualquer análise, para não haver conflito com o trabalho já em curso.',
      blocos: [{
        titulo: 'Contra o INSS',
        campos: [
          { t: 'radio', n: 'proc_inss', r: 'Existe processo contra o INSS?', req: 1, ops: ['Sim', 'Não'], linha: 1 },
          { t: 'texto', n: 'proc_inss_num', r: 'Número do processo', ph: '0000000-00.0000.0.00.0000', se: { c: 'proc_inss', v: 'Sim' } },
          { t: 'texto', n: 'proc_inss_adv', r: 'Advogado responsável', larg: 'meio', se: { c: 'proc_inss', v: 'Sim' } },
          {
            t: 'select', n: 'proc_inss_sit', r: 'Situação', larg: 'meio', se: { c: 'proc_inss', v: 'Sim' },
            ops: ['Em análise administrativa', 'Aguardando perícia', 'Em fase judicial', 'Recurso', 'Indeferido', 'Encerrado', 'Não sei informar']
          }
        ]
      }, {
        titulo: 'Trabalhista',
        campos: [
          { t: 'radio', n: 'proc_trab', r: 'Existe processo trabalhista?', req: 1, ops: ['Sim', 'Não'], linha: 1 },
          { t: 'texto', n: 'proc_trab_num', r: 'Número do processo trabalhista', larg: 'meio', se: { c: 'proc_trab', v: 'Sim' } },
          {
            t: 'select', n: 'proc_trab_sit', r: 'Situação', larg: 'meio', se: { c: 'proc_trab', v: 'Sim' },
            ops: ['Em andamento', 'Sentença proferida', 'Em recurso', 'Em execução', 'Encerrado', 'Não sei informar']
          }
        ]
      }]
    },

    {
      id: 'documentos', nome: 'Documentos',
      titulo: 'Seus documentos',
      texto: 'Envie o que tiver em mãos. O que faltar pode ser marcado como não possuo e obtido depois, junto à empresa ou ao INSS. Aceitamos PDF, imagem e arquivos do Word, até 15 MB por arquivo.',
      blocos: [
        { titulo: 'Documentos pessoais', sub: 'CPF, RG, CNH e comprovante de residência.', campos: [{ t: 'upload', n: 'doc_pessoais' }] },
        { titulo: 'Documentos previdenciários', sub: 'CNIS atualizado, carteiras de trabalho e extrato do FGTS.', campos: [{ t: 'upload', n: 'doc_previdenciarios' }] },
        { titulo: 'Documentos da atividade especial', sub: 'Marque o que você tem e envie os arquivos que já estiverem digitalizados.', campos: [{ t: 'matriz', n: 'doc_especiais', itens: DOCS_ESPECIAIS }] },
        { titulo: 'Documentos médicos', sub: 'Somente se houver afastamento, acidente ou doença ligada ao trabalho.', campos: [{ t: 'matriz', n: 'doc_medicos', itens: DOCS_MEDICOS }] }
      ]
    },

    {
      id: 'declaracoes', nome: 'Declarações',
      titulo: 'Para finalizar',
      texto: 'Leia e confirme cada item antes de enviar. Sem essas confirmações a equipe não pode iniciar a análise.',
      blocos: [{
        campos: [{
          t: 'declaracoes', n: 'declaracoes', req: 1,
          itens: [
            'Declaro que as informações prestadas são verdadeiras.',
            'Autorizo o tratamento dos meus dados pessoais, nos termos da Lei Geral de Proteção de Dados.',
            'Autorizo a realização da pré-análise previdenciária.',
            'Estou ciente de que esta etapa não constitui parecer jurídico definitivo.'
          ]
        }, {
          t: 'textarea', n: 'observacoes', r: 'Quer acrescentar alguma coisa?',
          ph: 'Dúvidas, detalhes do seu caso ou qualquer informação que ache importante.'
        }]
      }]
    }
  ];

  /* =======================================================
     2. ESTADO
     ======================================================= */

  var CHAVE = 'aeroprev-preanalise';
  var dados = {};
  var arquivos = {};          // { campo: [File] } — nao serializa, vive na sessao
  var etapaAtual = 0;
  var enviado = false;

  var wizard = document.getElementById('wizard');
  var corpo, peVoltar, peSeguir, peSalvo, trilhos, conta, contaCel;
  var montado = false;

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        var o = JSON.parse(bruto);
        dados = o.dados || {};
        etapaAtual = Math.min(o.etapa || 0, ETAPAS.length - 1);
      }
    } catch (e) { dados = {}; }
  }

  var salvarTimer;
  function salvar() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(function () {
      try {
        localStorage.setItem(CHAVE, JSON.stringify({ dados: dados, etapa: etapaAtual, em: Date.now() }));
        if (peSalvo) {
          peSalvo.classList.add('mostra');
          setTimeout(function () { peSalvo.classList.remove('mostra'); }, 1900);
        }
      } catch (e) {}
    }, 420);
  }

  /* =======================================================
     3. UTILIDADES
     ======================================================= */

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'txt') n.textContent = attrs[k];
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  function svgIcone(d, largura) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', largura || '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }

  var ICO = {
    fechar: 'M6 6l12 12M18 6L6 18',
    seta: 'M4 12h15m-6-6 6 6-6 6',
    setaEsq: 'M20 12H5m6-6-6 6 6 6',
    mais: 'M12 5v14M5 12h14',
    lixo: 'M4 7h16M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m-9 0 .8 12.1a1.5 1.5 0 001.5 1.4h5.4a1.5 1.5 0 001.5-1.4L17 7',
    nuvem: 'M7.5 18.5a4.5 4.5 0 01-.5-8.97A6 6 0 0118.8 10.6 3.95 3.95 0 0118 18.5M12 12.5v7m0-7 2.6 2.6M12 12.5 9.4 15.1',
    arquivo: 'M14 3.2H6.6A1.6 1.6 0 005 4.8v14.4a1.6 1.6 0 001.6 1.6h10.8a1.6 1.6 0 001.6-1.6V8.2L14 3.2zM13.8 3.4v4.7h4.9',
    visto: 'M4.5 12.5l5 5 10-11'
  };

  function fmtPeso(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function validaCPF(v) {
    var c = (v || '').replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    var s = 0, r, i;
    for (i = 0; i < 9; i++) s += parseInt(c[i], 10) * (10 - i);
    r = (s * 10) % 11; if (r === 10) r = 0;
    if (r !== parseInt(c[9], 10)) return false;
    s = 0;
    for (i = 0; i < 10; i++) s += parseInt(c[i], 10) * (11 - i);
    r = (s * 10) % 11; if (r === 10) r = 0;
    return r === parseInt(c[10], 10);
  }

  function mascara(campo, tipo) {
    campo.addEventListener('input', function () {
      var d = campo.value.replace(/\D/g, ''), v;
      if (tipo === 'cpf') {
        d = d.slice(0, 11);
        campo.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                       .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
      } else if (tipo === 'cep') {
        d = d.slice(0, 8);
        campo.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
      } else if (tipo === 'tel') {
        d = d.slice(0, 11);
        v = d;
        if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length > 6) {
          var corte = d.length > 10 ? 7 : 6;
          v = '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte);
        }
        campo.value = v;
      }
    });
  }

  /* =======================================================
     4. RENDERIZACAO DE CAMPOS
     ======================================================= */

  function renderCampo(c, prefixo, valores) {
    prefixo = prefixo || '';
    valores = valores || dados;
    var id = 'f-' + prefixo + c.n;
    // valor padrao entra no estado, senao a validacao barra um campo que o
    // usuario ve preenchido na tela
    if (valores[c.n] === undefined && c.val) valores[c.n] = c.val;
    var val = valores[c.n] !== undefined ? valores[c.n] : '';
    var caixa = el('div', { class: 'campo', 'data-campo': prefixo + c.n });

    if (c.se) {
      caixa.setAttribute('data-se', c.se.c + '=' + c.se.v);
      if (valores[c.se.c] !== c.se.v) caixa.hidden = true;
    }

    var rotuloTexto = c.r ? c.r + (c.req ? '' : ' (opcional)') : '';
    var entrada;

    if (c.t === 'radio' || c.t === 'checks') {
      caixa.appendChild(el('span', { class: 'grupo-rot', txt: rotuloTexto }));
      var grupo = el('div', {
        class: 'opcoes' + (c.duas || c.linha ? ' duas' : ''),
        role: c.t === 'radio' ? 'radiogroup' : 'group',
        'aria-label': c.r
      });
      var marcados = c.t === 'checks' ? (Array.isArray(val) ? val : []) : null;
      c.ops.forEach(function (o, i) {
        var oid = id + '-' + i;
        var inp = el('input', {
          type: c.t === 'radio' ? 'radio' : 'checkbox',
          id: oid, name: prefixo + c.n, value: o
        });
        if (c.t === 'radio' ? val === o : marcados.indexOf(o) > -1) inp.checked = true;
        inp.addEventListener('change', function () {
          if (c.t === 'radio') valores[c.n] = o;
          else {
            valores[c.n] = c.ops.filter(function (x, j) {
              var e = document.getElementById(id + '-' + j);
              return e && e.checked;
            });
          }
          caixa.classList.remove('erro');
          if (valores === dados) { atualizaCondicionais(); salvar(); }
        });
        grupo.appendChild(el('label', { class: 'opcao' }, [inp, el('span', { txt: o })]));
      });
      caixa.appendChild(grupo);
      caixa.appendChild(el('span', { class: 'aviso', txt: c.t === 'radio' ? 'Escolha uma opção' : 'Marque ao menos uma opção' }));
      return caixa;
    }

    if (c.t === 'vinculos') return renderVinculos(c);
    if (c.t === 'upload') return renderUpload(c);
    if (c.t === 'matriz') return renderMatriz(c);
    if (c.t === 'declaracoes') return renderDeclaracoes(c);

    if (rotuloTexto) caixa.appendChild(el('label', { for: id, txt: rotuloTexto }));

    if (c.t === 'select') {
      entrada = el('select', { id: id, name: c.n });
      entrada.appendChild(el('option', { value: '', txt: 'Selecione' }));
      c.ops.forEach(function (o) {
        var op = el('option', { value: o, txt: o });
        if (o === val) op.selected = true;
        entrada.appendChild(op);
      });
    } else if (c.t === 'textarea') {
      entrada = el('textarea', { id: id, name: c.n, placeholder: c.ph || '', rows: 3 });
      entrada.value = val;
    } else {
      var tipoHTML = c.t === 'email' ? 'email' : c.t === 'tel' ? 'tel' : c.t === 'data' ? 'date' : 'text';
      entrada = el('input', {
        type: tipoHTML, id: id, name: c.n, placeholder: c.ph || '',
        autocomplete: c.ac || 'off',
        inputmode: (c.t === 'cpf' || c.t === 'cep' || c.t === 'tel') ? 'numeric' : null
      });
      entrada.value = val;
      if (c.t === 'cpf') mascara(entrada, 'cpf');
      if (c.t === 'cep') mascara(entrada, 'cep');
      if (c.t === 'tel') mascara(entrada, 'tel');
    }

    entrada.addEventListener('input', function () {
      valores[c.n] = entrada.value;
      caixa.classList.remove('erro');
      if (valores === dados) salvar();
    });
    entrada.addEventListener('change', function () {
      valores[c.n] = entrada.value;
      if (valores === dados) { atualizaCondicionais(); salvar(); }
    });

    caixa.appendChild(entrada);
    if (c.dica) caixa.appendChild(el('span', { class: 'dica', txt: c.dica }));
    caixa.appendChild(el('span', { class: 'aviso', txt: 'Preencha este campo' }));
    return caixa;
  }

  /* ---------- repetidor de vinculos ---------- */
  function renderVinculos(c) {
    var caixa = el('div', { class: 'campo', 'data-campo': c.n });
    var lista = el('div', { class: 'campos', style: 'gap:.85rem' });
    if (!Array.isArray(dados[c.n])) dados[c.n] = [];

    function desenha() {
      lista.innerHTML = '';
      dados[c.n].forEach(function (v, i) {
        var bloco = el('div', { class: 'vinculo' });
        var cab = el('div', { class: 'vinculo-topo' }, [el('h4', { txt: 'Vínculo ' + (i + 1) })]);
        if (dados[c.n].length > 1) {
          var rm = el('button', { type: 'button', class: 'vinculo-remove' },
            [svgIcone(ICO.lixo, '1.6'), el('span', { txt: 'Remover' })]);
          rm.addEventListener('click', function () { dados[c.n].splice(i, 1); desenha(); salvar(); });
          cab.appendChild(rm);
        }
        bloco.appendChild(cab);

        var grade = el('div', { class: 'campos' });
        grade.appendChild(renderCampo({ t: 'texto', n: 'empresa', r: 'Empresa', req: 1, ph: 'Nome da empresa' }, 'v' + i + '-', v));
        grade.appendChild(renderCampo({ t: 'texto', n: 'cargo', r: 'Cargo ou função', req: 1, ph: 'Função exercida' }, 'v' + i + '-', v));

        var datas = el('div', { class: 'campos duas' });
        datas.appendChild(renderCampo({ t: 'data', n: 'admissao', r: 'Admissão', req: 1 }, 'v' + i + '-', v));
        var saida = renderCampo({ t: 'data', n: 'saida', r: 'Desligamento' }, 'v' + i + '-', v);
        datas.appendChild(saida);
        grade.appendChild(datas);

        var atual = el('label', { class: 'opcao' });
        var chk = el('input', { type: 'checkbox' });
        chk.checked = !!v.atual;
        saida.hidden = !!v.atual;
        chk.addEventListener('change', function () {
          v.atual = chk.checked;
          saida.hidden = chk.checked;
          if (chk.checked) v.saida = '';
          salvar();
        });
        atual.appendChild(chk);
        atual.appendChild(el('span', { txt: 'Ainda trabalho nesta empresa' }));
        grade.appendChild(atual);

        bloco.appendChild(grade);
        lista.appendChild(bloco);
      });

      var add = el('button', { type: 'button', class: 'bt-add' },
        [svgIcone(ICO.mais, '2'), el('span', { txt: 'Adicionar novo vínculo' })]);
      add.addEventListener('click', function () { dados[c.n].push({}); desenha(); salvar(); });
      lista.appendChild(add);
    }

    if (!dados[c.n].length) dados[c.n].push({});
    caixa.appendChild(el('span', { class: 'grupo-rot', txt: c.r }));
    caixa.appendChild(lista);
    desenha();
    return caixa;
  }

  /* ---------- arquivos ---------- */
  var TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  var PESO_MAX = 15 * 1024 * 1024;

  function listaArquivos(chave) {
    var box = el('div', { class: 'arquivos' });
    box.desenha = function () {
      box.innerHTML = '';
      (arquivos[chave] || []).forEach(function (f, i) {
        var linha = el('div', { class: 'arquivo' }, [
          svgIcone(ICO.arquivo, '1.6'),
          el('span', { class: 'nome', txt: f.name }),
          el('span', { class: 'peso', txt: fmtPeso(f.size) })
        ]);
        var x = el('button', { type: 'button', class: 'tira', 'aria-label': 'Remover ' + f.name }, [svgIcone(ICO.fechar)]);
        x.addEventListener('click', function () { arquivos[chave].splice(i, 1); box.desenha(); });
        linha.appendChild(x);
        box.appendChild(linha);
      });
    };
    box.desenha();
    return box;
  }

  function aceita(chave, fileList, aviso) {
    if (!arquivos[chave]) arquivos[chave] = [];
    var recusados = [];
    [].forEach.call(fileList, function (f) {
      var extOk = /\.(pdf|jpe?g|png|heic|webp|docx?)$/i.test(f.name);
      if (TIPOS_OK.indexOf(f.type) < 0 && !extOk) { recusados.push(f.name + ' (formato não aceito)'); return; }
      if (f.size > PESO_MAX) { recusados.push(f.name + ' (acima de 15 MB)'); return; }
      var repetido = arquivos[chave].some(function (x) { return x.name === f.name && x.size === f.size; });
      if (!repetido) arquivos[chave].push(f);
    });
    if (aviso) {
      aviso.textContent = recusados.length ? 'Não foi possível anexar: ' + recusados.join(', ') : '';
      aviso.style.display = recusados.length ? 'flex' : 'none';
    }
  }

  function renderUpload(c) {
    var caixa = el('div', { class: 'campo', 'data-campo': c.n });
    var entrada = el('input', {
      type: 'file', multiple: 'multiple', id: 'up-' + c.n,
      accept: '.pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx'
    });
    var zona = el('label', { class: 'solta', for: 'up-' + c.n }, [
      svgIcone(ICO.nuvem, '1.6'),
      el('strong', { txt: 'Escolher arquivos' }),
      el('span', { txt: 'PDF, imagem ou Word. Até 15 MB por arquivo. Também dá para arrastar até aqui.' }),
      entrada
    ]);
    var aviso = el('span', { class: 'aviso' });
    var lista = listaArquivos(c.n);

    entrada.addEventListener('change', function () {
      aceita(c.n, entrada.files, aviso);
      lista.desenha();
      entrada.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('sobre'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('sobre'); });
    });
    zona.addEventListener('drop', function (e) {
      aceita(c.n, e.dataTransfer.files, aviso);
      lista.desenha();
    });

    caixa.appendChild(zona);
    caixa.appendChild(aviso);
    caixa.appendChild(lista);
    return caixa;
  }

  /* ---------- matriz possuo / nao possuo / anexar ---------- */
  function renderMatriz(c) {
    var caixa = el('div', { class: 'matriz', 'data-campo': c.n });
    if (!dados[c.n]) dados[c.n] = {};

    c.itens.forEach(function (par) {
      var chave = par[0], nome = par[1];
      var linha = el('div', { class: 'linha-doc' });
      var ops = el('div', { class: 'doc-opcoes' });
      var campoArq = 'doc-' + c.n + '-' + chave;
      var lista = listaArquivos(campoArq);
      var idEntrada = 'm-' + c.n + '-' + chave;
      var entrada = el('input', {
        type: 'file', multiple: 'multiple', id: idEntrada,
        accept: '.pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx'
      });
      entrada.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0';

      [['possui', 'Possuo'], ['nao', 'Não possuo']].forEach(function (o) {
        var inp = el('input', { type: 'radio', name: 'r-' + c.n + '-' + chave, value: o[0] });
        if (dados[c.n][chave] === o[0]) inp.checked = true;
        inp.addEventListener('change', function () {
          dados[c.n][chave] = o[0];
          linha.classList.add('marcado');
          salvar();
        });
        ops.appendChild(el('label', { class: 'doc-op' }, [inp, el('span', { txt: o[1] })]));
      });

      var envio = el('label', { class: 'doc-op envio', for: idEntrada }, [
        svgIcone(ICO.nuvem, '1.7'), el('span', { txt: 'Anexar' }), entrada
      ]);
      entrada.addEventListener('change', function () {
        aceita(campoArq, entrada.files, null);
        lista.desenha();
        entrada.value = '';
        dados[c.n][chave] = 'possui';
        var r = ops.querySelector('input[value="possui"]');
        if (r) r.checked = true;
        linha.classList.add('marcado');
        salvar();
      });
      ops.appendChild(envio);

      if (dados[c.n][chave]) linha.classList.add('marcado');
      linha.appendChild(el('span', { class: 'rot', txt: nome }));
      linha.appendChild(ops);
      linha.appendChild(lista);
      caixa.appendChild(linha);
    });
    return caixa;
  }

  /* ---------- declaracoes ---------- */
  function renderDeclaracoes(c) {
    var caixa = el('div', { class: 'campo', 'data-campo': c.n });
    var grupo = el('div', { class: 'declaracoes' });
    if (!Array.isArray(dados[c.n])) dados[c.n] = [];
    c.itens.forEach(function (texto, i) {
      var inp = el('input', { type: 'checkbox', value: String(i) });
      if (dados[c.n].indexOf(i) > -1) inp.checked = true;
      inp.addEventListener('change', function () {
        var pos = dados[c.n].indexOf(i);
        if (inp.checked && pos < 0) dados[c.n].push(i);
        if (!inp.checked && pos > -1) dados[c.n].splice(pos, 1);
        caixa.classList.remove('erro');
        salvar();
      });
      grupo.appendChild(el('label', { class: 'opcao' }, [inp, el('span', { txt: texto })]));
    });
    caixa.appendChild(grupo);
    caixa.appendChild(el('span', { class: 'aviso', txt: 'É necessário confirmar todos os itens' }));
    return caixa;
  }

  function atualizaCondicionais() {
    if (!corpo) return;
    [].forEach.call(corpo.querySelectorAll('[data-se]'), function (n) {
      var par = n.getAttribute('data-se').split('=');
      n.hidden = dados[par[0]] !== par[1];
    });
  }

  /* =======================================================
     5. VALIDACAO
     ======================================================= */

  function marcaFalhas(falhas) {
    [].forEach.call(corpo.querySelectorAll('.campo.erro'), function (n) { n.classList.remove('erro'); });
    falhas.forEach(function (f) {
      var n = corpo.querySelector('[data-campo="' + f[0] + '"]');
      if (!n) return;
      n.classList.add('erro');
      var av = n.querySelector('.aviso');
      if (av) av.textContent = f[1];
    });
    if (falhas.length) {
      var primeiro = corpo.querySelector('.campo.erro');
      if (primeiro) {
        primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var foco = primeiro.querySelector('input,select,textarea');
        if (foco) setTimeout(function () { foco.focus({ preventScroll: true }); }, 340);
      }
    }
  }

  function validaEtapa(i) {
    var etapa = ETAPAS[i];
    var falhas = [];

    etapa.blocos.forEach(function (bloco) {
      bloco.campos.forEach(function (c) {
        if (!c.req) return;
        if (c.se && dados[c.se.c] !== c.se.v) return;

        var v = dados[c.n];
        var vazio = v === undefined || v === '' || v === null || (Array.isArray(v) && !v.length);

        if (c.t === 'declaracoes') {
          if (!Array.isArray(v) || v.length < c.itens.length) falhas.push([c.n, 'É necessário confirmar todos os itens']);
          return;
        }
        if (c.t === 'vinculos') return;
        if (vazio) { falhas.push([c.n, 'Preencha este campo']); return; }
        if (c.t === 'cpf' && !validaCPF(v)) falhas.push([c.n, 'CPF inválido, confira os números']);
        if (c.t === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) falhas.push([c.n, 'E-mail inválido']);
        if (c.t === 'tel' && v.replace(/\D/g, '').length < 10) falhas.push([c.n, 'Telefone incompleto']);
        if (c.t === 'cep' && v.replace(/\D/g, '').length !== 8) falhas.push([c.n, 'CEP incompleto']);
        if (c.t === 'data' && v && (isNaN(new Date(v)) || new Date(v) > new Date())) falhas.push([c.n, 'Data inválida']);
      });
    });

    if (etapa.id === 'historico' && dados.trabalhou_aviacao === 'Sim') {
      var algum = false;
      (dados.vinculos || []).forEach(function (v, j) {
        if (v.empresa || v.cargo || v.admissao) algum = true;
        ['empresa', 'cargo', 'admissao'].forEach(function (k) {
          if ((v.empresa || v.cargo || v.admissao) && !v[k]) {
            falhas.push(['v' + j + '-' + k, 'Preencha este campo']);
          }
        });
      });
      if (!algum) falhas.push(['v0-empresa', 'Informe ao menos um vínculo']);
    }

    marcaFalhas(falhas);
    return !falhas.length;
  }

  /* =======================================================
     6. MONTAGEM E NAVEGACAO
     ======================================================= */

  function svgMarca(classe) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '150 70 970 680');
    s.setAttribute('class', classe);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', 'AeroPrev');
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#pc-lockup');
    s.appendChild(u);
    return s;
  }

  function montaEsqueleto() {
    var topo = el('div', { class: 'wz-topo' });
    var topoInt = el('div', { class: 'wz-topo-int' });
    topoInt.appendChild(svgMarca('lockup'));

    var prog = el('div', { class: 'wz-progresso' });
    trilhos = el('div', { class: 'wz-trilhos' });
    ETAPAS.forEach(function (e, i) {
      trilhos.appendChild(el('span', { class: 'wz-trilho', title: (i + 1) + '. ' + e.nome }));
    });
    conta = el('span', { class: 'wz-conta' });
    prog.appendChild(trilhos);
    prog.appendChild(conta);
    topoInt.appendChild(prog);

    contaCel = el('span', { class: 'wz-conta-cel' });
    topoInt.appendChild(contaCel);

    var fechar = el('button', { type: 'button', class: 'wz-fechar', 'aria-label': 'Fechar formulário' }, [svgIcone(ICO.fechar)]);
    fechar.addEventListener('click', fecha);
    topoInt.appendChild(fechar);
    topo.appendChild(topoInt);

    corpo = el('div', { class: 'wz-corpo' });

    var pe = el('div', { class: 'wz-pe' });
    var peInt = el('div', { class: 'wz-pe-int' });
    peVoltar = el('button', { type: 'button', class: 'wz-voltar' }, [svgIcone(ICO.setaEsq, '2'), el('span', { txt: 'Voltar' })]);
    peVoltar.addEventListener('click', function () { vai(etapaAtual - 1); });
    peSalvo = el('span', { class: 'wz-salvo' }, [svgIcone(ICO.visto, '2.4'), el('span', { txt: 'Salvo neste aparelho' })]);
    peSeguir = el('button', { type: 'button', class: 'bt bt-cheio' });
    peSeguir.addEventListener('click', function () {
      if (!validaEtapa(etapaAtual)) return;
      if (etapaAtual === ETAPAS.length - 1) envia();
      else vai(etapaAtual + 1);
    });
    peInt.appendChild(peVoltar);
    peInt.appendChild(peSalvo);
    peInt.appendChild(peSeguir);
    pe.appendChild(peInt);

    wizard.appendChild(topo);
    wizard.appendChild(corpo);
    wizard.appendChild(pe);
    montado = true;
  }

  function desenhaEtapa() {
    var e = ETAPAS[etapaAtual];
    corpo.innerHTML = '';
    var sec = el('section', { class: 'wz-etapa' });
    // o contador ja vive no cabecalho, ao lado da barra de progresso
    var cab = el('div', { class: 'wz-etapa-topo' }, [
      el('h2', { id: 'wz-titulo', txt: e.titulo })
    ]);
    if (e.texto) cab.appendChild(el('p', { txt: e.texto }));
    sec.appendChild(cab);

    e.blocos.forEach(function (b) {
      var bloco = el('div', { class: 'wz-bloco' });
      if (b.titulo) bloco.appendChild(el('h3', { txt: b.titulo }));
      if (b.sub) bloco.appendChild(el('p', { class: 'sub', txt: b.sub }));

      var fila = [];
      function despeja() {
        if (!fila.length) return;
        if (fila.length > 1) {
          var linha = el('div', { class: 'campos ' + (fila.length === 3 ? 'tres' : 'duas') });
          fila.forEach(function (n) { linha.appendChild(n); });
          bloco.appendChild(linha);
        } else {
          bloco.appendChild(fila[0]);
        }
        fila = [];
      }
      b.campos.forEach(function (c) {
        var n = renderCampo(c);
        if (c.larg === 'meio' || c.larg === 'terco') {
          fila.push(n);
          if (fila.length === (c.larg === 'terco' ? 3 : 2)) despeja();
        } else {
          despeja();
          bloco.appendChild(n);
        }
      });
      despeja();
      sec.appendChild(bloco);
    });

    corpo.appendChild(sec);
    corpo.scrollTop = 0;
    atualizaCondicionais();

    [].forEach.call(trilhos.children, function (t, i) {
      t.classList.toggle('feito', i < etapaAtual);
      t.classList.toggle('atual', i === etapaAtual);
    });
    conta.innerHTML = 'Etapa <b>' + (etapaAtual + 1) + '</b> de ' + ETAPAS.length + ' &middot; ' + e.nome;
    contaCel.textContent = (etapaAtual + 1) + '/' + ETAPAS.length + ' · ' + e.nome;
    peVoltar.classList.toggle('vazio', etapaAtual === 0);

    peSeguir.innerHTML = '';
    peSeguir.appendChild(el('span', { txt: etapaAtual === ETAPAS.length - 1 ? 'Enviar pré-análise' : 'Continuar' }));
    var s = svgIcone(ICO.seta, '2');
    s.setAttribute('class', 'seta');
    s.style.width = '15px'; s.style.height = '15px';
    peSeguir.appendChild(s);

    var h2 = corpo.querySelector('h2');
    if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
  }

  function vai(i) {
    if (i < 0 || i >= ETAPAS.length) return;
    wizard.classList.toggle('voltando', i < etapaAtual);
    etapaAtual = i;
    salvar();
    desenhaEtapa();
    try { history.replaceState(null, '', '#etapa-' + (i + 1)); } catch (err) {}
  }

  /* =======================================================
     7. ABRIR, FECHAR, ENVIAR
     ======================================================= */

  var focoAnterior = null;

  function abre() {
    if (!montado) montaEsqueleto();
    focoAnterior = document.activeElement;
    wizard.hidden = false;
    document.documentElement.classList.add('travado');
    requestAnimationFrame(function () { wizard.classList.add('visivel'); });
    if (enviado) {
      enviado = false;
      etapaAtual = 0;
      peSeguir.style.display = '';
      peVoltar.style.display = '';
      peSalvo.style.display = '';
    }
    desenhaEtapa();
  }

  function fecha() {
    wizard.classList.remove('visivel');
    document.documentElement.classList.remove('travado');
    setTimeout(function () { wizard.hidden = true; }, 420);
    try { history.replaceState(null, '', location.pathname); } catch (err) {}
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
  }

  function montaPayload() {
    var anexos = {};
    Object.keys(arquivos).forEach(function (k) {
      if (arquivos[k] && arquivos[k].length) {
        anexos[k] = arquivos[k].map(function (f) {
          return { nome: f.name, tamanho: f.size, tipo: f.type };
        });
      }
    });
    return {
      versao: 1,
      formulario: 'pre-analise-previdenciaria',
      enviadoEm: new Date().toISOString(),
      respostas: dados,
      anexos: anexos
    };
  }

  function protocolo() {
    var d = new Date();
    var base = String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    return 'AP-' + base + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function envia() {
    var payload = montaPayload();
    var prot = protocolo();
    payload.protocolo = prot;
    peSeguir.disabled = true;

    function conclui() {
      enviado = true;
      try { localStorage.removeItem(CHAVE); } catch (err) {}
      corpo.innerHTML = '';
      var fim = el('div', { class: 'wz-fim' }, [
        el('div', { class: 'visto' }, [svgIcone(ICO.visto, '2.2')]),
        el('h2', { txt: 'Pré-análise enviada' }),
        el('p', { txt: 'A equipe da AeroPrev recebeu as suas informações e vai conferir a documentação. O retorno chega pelo e-mail e pelo WhatsApp que você informou.' }),
        el('div', { class: 'protocolo' }, [el('span', { txt: 'Protocolo' }), document.createTextNode(prot)])
      ]);
      var volta = el('button', { type: 'button', class: 'bt bt-linha', txt: 'Voltar ao site' });
      volta.addEventListener('click', fecha);
      fim.appendChild(volta);
      corpo.appendChild(fim);
      corpo.scrollTop = 0;
      peSeguir.disabled = false;
      peSeguir.style.display = 'none';
      peVoltar.style.display = 'none';
      peSalvo.style.display = 'none';
      var h2 = corpo.querySelector('h2');
      if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
    }

    // ponto de integracao com o backoffice: defina window.AEROPREV_ENDPOINT
    if (window.AEROPREV_ENDPOINT) {
      var fd = new FormData();
      fd.append('dados', JSON.stringify(payload));
      Object.keys(arquivos).forEach(function (k) {
        (arquivos[k] || []).forEach(function (f) { fd.append(k + '[]', f, f.name); });
      });
      fetch(window.AEROPREV_ENDPOINT, { method: 'POST', body: fd })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; })
        .then(conclui)
        .catch(function (err) {
          peSeguir.disabled = false;
          alert('Não foi possível enviar agora. Suas respostas continuam salvas neste aparelho, tente novamente em instantes.');
          console.error('[AeroPrev] falha no envio:', err);
        });
    } else {
      console.info('[AeroPrev] AEROPREV_ENDPOINT não definido. Payload que seria enviado:', payload, arquivos);
      setTimeout(conclui, 600);
    }
  }

  /* =======================================================
     8. LIGACOES
     ======================================================= */

  carregar();

  document.addEventListener('click', function (ev) {
    var g = ev.target.closest('.js-abre-form');
    if (!g) return;
    ev.preventDefault();
    abre();
  });

  var formHero = document.getElementById('form-inicio');
  if (formHero) {
    formHero.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true;
      [].forEach.call(formHero.querySelectorAll('[required]'), function (n) {
        var caixa = n.closest('.campo');
        var vazio = !n.value.trim();
        var invalido = !vazio && (n.type === 'email'
          ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(n.value)
          : n.type === 'tel' ? n.value.replace(/\D/g, '').length < 10 : false);
        caixa.classList.toggle('erro', vazio || invalido);
        if (vazio || invalido) ok = false;
      });
      if (!ok) {
        var pri = formHero.querySelector('.campo.erro input,.campo.erro select');
        if (pri) pri.focus();
        return;
      }
      dados.nome = formHero.nome.value.trim();
      dados.email = formHero.email.value.trim();
      dados.telefone = formHero.telefone.value.trim();
      if (!dados.profissao) dados.profissao = formHero.funcao.value;
      salvar();
      abre();
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && montado && !wizard.hidden) fecha();
  });

  if (dados && Object.keys(dados).length && /^#etapa-\d+$/.test(location.hash)) {
    var n = parseInt(location.hash.replace('#etapa-', ''), 10) - 1;
    if (n >= 0 && n < ETAPAS.length) { etapaAtual = n; abre(); }
  }

  window.AeroPrevForm = { abre: abre, fecha: fecha, dados: montaPayload };
})();
