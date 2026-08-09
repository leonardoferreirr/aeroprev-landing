/* AeroPrev — painel do escritorio.
   Le de window.AEROPREV_DEMO. Para ligar num backend depois, basta trocar
   `base()` por uma chamada que devolva a mesma forma de registro. */
(function () {
  'use strict';

  var DEMO = window.AEROPREV_DEMO;
  if (!DEMO) return;

  var conteudo = document.getElementById('conteudo');
  var tituloTela = document.getElementById('tituloTela');
  var subTela = document.getElementById('subTela');
  var campoBusca = document.getElementById('campoBusca');
  var lateral = document.getElementById('lateral');

  var ROT = {};
  DEMO.estados.forEach(function (e) { ROT[e.id] = e.rot; });

  var estado = { tela: 'painel', busca: '', filtro: 'todos' };

  /* ---------------- utilidades ---------------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === 'txt') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }
  function svg(d, extra) {
    return el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', html: (extra || '') + '<path d="' + d + '"/>' });
  }
  function peso(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
      : Math.round(bytes / 1024) + ' KB';
  }
  function dataHora(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function haQuanto(iso) {
    var h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'agora há pouco';
    if (h < 24) return 'há ' + h + (h === 1 ? ' hora' : ' horas');
    var d = Math.round(h / 24);
    return 'há ' + d + (d === 1 ? ' dia' : ' dias');
  }
  function dataCurta(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : p[1] + '/' + p[0];
  }
  function etiqueta(status) {
    return el('span', { class: 'eti eti-' + status, txt: ROT[status] || status });
  }

  function base() { return DEMO.registros; }

  function filtrados() {
    var t = estado.busca.trim().toLowerCase();
    return base().filter(function (r) {
      if (estado.filtro !== 'todos' && r.status !== estado.filtro) return false;
      if (!t) return true;
      return (r.nome + ' ' + r.cpf + ' ' + r.proto + ' ' + r.email).toLowerCase().indexOf(t) > -1;
    });
  }

  /* ---------------- rosca ---------------- */
  function rosca(fatias, total, rotulo) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 42 42');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', rotulo + ': ' + total);

    var raio = 15.9155, circ = 2 * Math.PI * raio, offset = 25;
    var fundo = document.createElementNS(NS, 'circle');
    fundo.setAttribute('cx', 21); fundo.setAttribute('cy', 21); fundo.setAttribute('r', raio);
    fundo.setAttribute('fill', 'none'); fundo.setAttribute('stroke', '#F1ECEA'); fundo.setAttribute('stroke-width', 5);
    s.appendChild(fundo);

    var acumulado = 0;
    fatias.forEach(function (f) {
      if (!f.valor) return;
      var frac = f.valor / total;
      var arco = document.createElementNS(NS, 'circle');
      arco.setAttribute('cx', 21); arco.setAttribute('cy', 21); arco.setAttribute('r', raio);
      arco.setAttribute('fill', 'none');
      arco.setAttribute('stroke', f.cor);
      arco.setAttribute('stroke-width', 5);
      arco.setAttribute('stroke-dasharray', (frac * circ).toFixed(2) + ' ' + circ.toFixed(2));
      arco.setAttribute('stroke-dashoffset', ((offset - acumulado * 100) * circ / 100).toFixed(2));
      s.appendChild(arco);
      acumulado += frac;
    });

    var t1 = document.createElementNS(NS, 'text');
    t1.setAttribute('x', 21); t1.setAttribute('y', 22);
    t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('class', 'rosca-total');
    t1.textContent = total;
    s.appendChild(t1);
    var t2 = document.createElementNS(NS, 'text');
    t2.setAttribute('x', 21); t2.setAttribute('y', 26);
    t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('class', 'rosca-rot');
    t2.textContent = rotulo;
    s.appendChild(t2);
    return s;
  }

  function blocoRosca(titulo, fatias, rotulo) {
    var total = fatias.reduce(function (a, f) { return a + f.valor; }, 0);
    var leg = el('div', { class: 'legenda' });
    fatias.forEach(function (f) {
      leg.appendChild(el('div', {}, [
        el('i', { style: 'background:' + f.cor }),
        el('span', { txt: f.rot }),
        el('b', { txt: String(f.valor) }),
        el('em', { txt: total ? Math.round(f.valor / total * 100) + '%' : '0%' })
      ]));
    });
    return el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [el('h2', { txt: titulo })]),
      el('div', { class: 'bloco-corpo' }, [
        el('div', { class: 'rosca' }, [rosca(fatias, total, rotulo), leg])
      ])
    ]);
  }

  /* ---------------- tabela ---------------- */
  function tabela(lista, comObjetivo) {
    if (!lista.length) {
      return el('div', { class: 'vazio', txt: 'Nenhuma pré-análise corresponde a essa busca.' });
    }
    var cabs = ['Protocolo', 'Solicitante', 'Objetivo', 'Situação', 'Anexos', 'Recebida'];
    if (!comObjetivo) cabs.splice(2, 1);

    var thead = el('thead', {}, [el('tr', {}, cabs.map(function (c) { return el('th', { txt: c }); }))]);
    var tbody = el('tbody');

    lista.forEach(function (r) {
      var celulas = [
        el('td', {}, [el('span', { class: 'proto', txt: r.proto })]),
        el('td', {}, [el('div', { class: 'pessoa' }, [
          el('span', { class: 'avatar', txt: r.iniciais }),
          el('div', {}, [
            el('strong', { txt: r.nome }),
            el('span', { txt: r.cpf })
          ])
        ])])
      ];
      if (comObjetivo) celulas.push(el('td', { txt: r.objetivo }));
      celulas.push(el('td', {}, [etiqueta(r.status)]));
      celulas.push(el('td', {}, [el('span', {
        class: 'anexos',
        html: '<svg viewBox="0 0 24 24"><path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 11-3-3L15 6"/></svg>' +
          '<span>' + r.docs.length + '</span>'
      })]));
      celulas.push(el('td', {}, [el('span', { class: 'quando', txt: haQuanto(r.recebido), title: dataHora(r.recebido) })]));

      var tr = el('tr', { tabindex: '0', role: 'button', 'aria-label': 'Abrir ficha de ' + r.nome }, celulas);
      tr.addEventListener('click', function () { abreFicha(r); });
      tr.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abreFicha(r); }
      });
      tbody.appendChild(tr);
    });

    return el('div', { class: 'rolagem' }, [el('table', {}, [thead, tbody])]);
  }

  /* ---------------- telas ---------------- */
  function telaPainel() {
    var todos = base();
    var conta = function (id) { return todos.filter(function (r) { return r.status === id; }).length; };
    var anexos = todos.reduce(function (a, r) { return a + r.docs.length; }, 0);
    var pendentes = todos.filter(function (r) { return r.status === 'documentos'; })
      .reduce(function (a, r) { return a + Math.max(0, 6 - r.docs.length); }, 0);

    var METRICAS = [
      ['Pré-análises recebidas', todos.length, 'M6 3h9l4 4v14H6z', conta('nova') + ' aguardando triagem'],
      ['Em análise', conta('analise'), 'M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 'com a equipe agora'],
      ['Concluídas', conta('concluida'), 'M4 12l5 5L20 6', 'devolvidas ao solicitante'],
      ['Documentos anexados', anexos, 'M3 7h6l2 2h10v10H3z', pendentes + ' pendências abertas']
    ];

    var metricas = el('div', { class: 'metricas' });
    METRICAS.forEach(function (m) {
      metricas.appendChild(el('div', { class: 'metrica' }, [
        el('div', { class: 'metrica-topo' }, [
          el('div', { class: 'metrica-icone', html: '<svg viewBox="0 0 24 24"><path d="' + m[2] + '"/></svg>' }),
          el('span', { txt: m[0] })
        ]),
        el('b', { txt: String(m[1]) }),
        el('small', { txt: m[3] })
      ]));
    });

    var CORES = { nova: '#1D4ED8', analise: '#B45309', documentos: '#7A1B1D', concluida: '#15803D', arquivada: '#9C918D' };
    var porStatus = DEMO.estados.map(function (e) {
      return { rot: e.rot, cor: CORES[e.id], valor: conta(e.id) };
    }).filter(function (f) { return f.valor; });

    var TONS = ['#7A1B1D', '#A63A34', '#CDAB91', '#8A6748', '#5E1416', '#C08C6E', '#3F2E28'];
    var porObjetivo = DEMO.objetivos.map(function (o, i) {
      return {
        rot: o.length > 34 ? o.slice(0, 32) + '…' : o,
        cor: TONS[i % TONS.length],
        valor: todos.filter(function (r) { return r.objetivo === o; }).length
      };
    }).filter(function (f) { return f.valor; });

    var recentes = todos.slice().sort(function (a, b) {
      return new Date(b.recebido) - new Date(a.recebido);
    }).slice(0, 6);

    var verTodas = el('a', { class: 'acao', href: '#preanalises', txt: 'Ver todas' });

    return [
      metricas,
      el('div', { class: 'duo' }, [
        blocoRosca('Por situação', porStatus, 'total'),
        blocoRosca('Por objetivo', porObjetivo, 'total')
      ]),
      el('section', { class: 'bloco' }, [
        el('div', { class: 'bloco-cab' }, [el('h2', { txt: 'Chegaram por último' }), verTodas]),
        tabela(recentes, true)
      ])
    ];
  }

  function telaPreAnalises() {
    var barra = el('div', { class: 'bloco-cab' }, [el('h2', { txt: 'Todas as pré-análises' })]);
    var filtros = el('div', { class: 'filtros' });
    [{ id: 'todos', rot: 'Todas' }].concat(DEMO.estados).forEach(function (e) {
      var b = el('button', { class: 'filtro' + (estado.filtro === e.id ? ' e-ativo' : ''), type: 'button', txt: e.rot });
      b.addEventListener('click', function () { estado.filtro = e.id; desenha(); });
      filtros.appendChild(b);
    });
    barra.appendChild(filtros);

    var lista = filtrados().slice().sort(function (a, b) {
      return new Date(b.recebido) - new Date(a.recebido);
    });
    return [el('section', { class: 'bloco' }, [barra, tabela(lista, true)])];
  }

  function telaDocumentos() {
    var linhas = [];
    filtrados().forEach(function (r) {
      r.docs.forEach(function (d) { linhas.push({ r: r, d: d }); });
    });

    var corpo = el('div', { class: 'bloco-corpo' });
    if (!linhas.length) {
      corpo.appendChild(el('div', { class: 'vazio', txt: 'Nenhum documento corresponde a essa busca.' }));
    }
    linhas.slice(0, 60).forEach(function (x) {
      var arq = el('div', { class: 'arquivo' }, [
        el('span', { class: 'tipo', txt: x.d.tipo }),
        el('div', {}, [
          el('strong', { txt: x.d.nome }),
          el('span', { txt: x.r.nome + ' · ' + x.r.proto + ' · ' + peso(x.d.peso) })
        ]),
        el('button', { class: 'baixar', type: 'button', txt: 'Abrir' })
      ]);
      arq.querySelector('.baixar').addEventListener('click', function () { abreFicha(x.r); });
      corpo.appendChild(arq);
    });

    return [el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [
        el('h2', { txt: 'Documentos recebidos' }),
        el('span', { class: 'acao', txt: linhas.length + ' arquivos' })
      ]),
      corpo
    ])];
  }

  function telaSimples(titulo, texto) {
    return [el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [el('h2', { txt: titulo })]),
      el('div', { class: 'bloco-corpo' }, [el('p', { class: 'nota', txt: texto })])
    ])];
  }

  var TELAS = {
    painel: { t: 'Painel', s: 'Visão geral das pré-análises recebidas', f: telaPainel },
    preanalises: { t: 'Pré-análises', s: 'Tudo que chegou pelo formulário do site', f: telaPreAnalises },
    documentos: { t: 'Documentos', s: 'Arquivos anexados pelos solicitantes', f: telaDocumentos },
    equipe: {
      t: 'Equipe', s: 'Quem tem acesso ao painel',
      f: function () { return telaSimples('Equipe', 'A gestão de acessos depende de um sistema de login, que ainda não existe neste site. Enquanto isso, o painel não distingue usuários.'); }
    },
    ajustes: {
      t: 'Ajustes', s: 'Configurações do painel',
      f: function () { return telaSimples('Ajustes', 'Modelos de e-mail, prazos e etapas do fluxo entram aqui quando o painel passar a gravar dados.'); }
    }
  };

  /* ---------------- ficha ---------------- */
  var ficha = document.getElementById('ficha');
  var fundoFicha = document.getElementById('fundoFicha');
  var fichaCorpo = document.getElementById('fichaCorpo');
  var ultimoFoco = null;

  function par(rot, valor, largo) {
    if (!valor) return null;
    return el('div', { class: 'par' + (largo ? ' largo' : '') }, [
      el('dt', { txt: rot }), el('dd', { txt: valor })
    ]);
  }
  function secao(titulo, filhos) {
    var validos = filhos.filter(Boolean);
    if (!validos.length) return null;
    return el('section', { class: 'ficha-secao' }, [el('h3', { txt: titulo })].concat(validos));
  }

  function abreFicha(r) {
    ultimoFoco = document.activeElement;
    document.getElementById('fichaProto').textContent = r.proto;
    document.getElementById('fichaNome').textContent = r.nome;
    document.getElementById('fichaSub').textContent =
      'Recebida em ' + dataHora(r.recebido) + ' · atualizada ' + haQuanto(r.atualizado);

    fichaCorpo.innerHTML = '';

    var cabecalho = el('div', { class: 'lista-simples' }, [etiqueta(r.status)]);
    r.atividades.forEach(function (a) { cabecalho.appendChild(el('span', { class: 'pilula', txt: a })); });
    fichaCorpo.appendChild(cabecalho);

    fichaCorpo.appendChild(secao('Identificação', [
      el('dl', { class: 'pares' }, [
        par('CPF', r.cpf), par('Nascimento', dataCurta(r.nascimento)),
        par('Estado civil', r.estadoCivil), par('Profissão atual', r.profissao),
        par('E-mail', r.email), par('Telefone', r.telefone),
        par('Cidade', r.cidade + ' · ' + r.estado)
      ].filter(Boolean))
    ]));

    fichaCorpo.appendChild(secao('Objetivo', [
      el('dl', { class: 'pares' }, [par('O que procura', r.objetivo, true)].filter(Boolean)),
      r.objetivoDetalhe ? el('p', { class: 'nota', txt: r.objetivoDetalhe }) : null
    ]));

    var vinculos = el('div');
    r.vinculos.forEach(function (v) {
      vinculos.appendChild(el('div', { class: 'vinculo' }, [
        el('strong', { txt: v.empresa }),
        el('span', { txt: v.funcao + ' · ' + dataCurta(v.inicio) + ' a ' + dataCurta(v.fim) })
      ]));
    });
    fichaCorpo.appendChild(secao('Trajetória na aviação', [vinculos]));

    var outrosItens = [];
    if (r.militar.serviu) {
      outrosItens.push(par('Serviço militar', dataCurta(r.militar.inicio) + ' a ' + dataCurta(r.militar.fim), true));
    }
    if (r.outras.length) outrosItens.push(par('Outros setores', r.outras.join(', '), true));
    if (r.beneficios.length) outrosItens.push(par('Benefícios', r.beneficios.join(', '), true));
    if (r.procInss.tem) outrosItens.push(par('Processo contra o INSS', r.procInss.num + ' · ' + r.procInss.sit, true));
    if (r.procTrab.tem) outrosItens.push(par('Processo trabalhista', r.procTrab.num + ' · ' + r.procTrab.sit, true));
    fichaCorpo.appendChild(secao('Militar, benefícios e processos', [
      el('dl', { class: 'pares' }, outrosItens)
    ]));

    var marcados = DEMO.situacoes.filter(function (s) { return r.situacoes[s[0]]; });
    var listaSN = el('div', { class: 'sn-ficha' });
    DEMO.situacoes.forEach(function (s) {
      var sim = r.situacoes[s[0]];
      listaSN.appendChild(el('div', { class: 'sn-item' + (sim ? ' e-sim' : '') }, [
        el('span', { txt: s[1] }),
        el('b', { txt: sim ? 'SIM' : 'não' })
      ]));
    });
    fichaCorpo.appendChild(secao(
      'Outras situações · ' + marcados.length + ' de ' + DEMO.situacoes.length + ' marcadas',
      [listaSN]
    ));

    var docs = el('div');
    r.docs.forEach(function (d) {
      docs.appendChild(el('div', { class: 'arquivo' }, [
        el('span', { class: 'tipo', txt: d.tipo }),
        el('div', {}, [el('strong', { txt: d.nome }), el('span', { txt: peso(d.peso) })]),
        el('button', { class: 'baixar', type: 'button', txt: 'Baixar' })
      ]));
    });
    fichaCorpo.appendChild(secao('Documentos · ' + r.docs.length, [docs]));

    if (r.observacoes) {
      fichaCorpo.appendChild(secao('Observações do solicitante', [
        el('p', { class: 'nota', txt: r.observacoes })
      ]));
    }

    ficha.classList.add('e-aberta');
    fundoFicha.classList.add('e-aberta');
    ficha.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('fechaFicha').focus();
  }

  function fechaFicha() {
    ficha.classList.remove('e-aberta');
    fundoFicha.classList.remove('e-aberta');
    ficha.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  document.getElementById('fechaFicha').addEventListener('click', fechaFicha);
  fundoFicha.addEventListener('click', fechaFicha);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && ficha.classList.contains('e-aberta')) fechaFicha();
  });
  Array.prototype.forEach.call(document.querySelectorAll('.ficha-pe [data-acao]'), function (b) {
    b.addEventListener('click', function () {
      b.textContent = 'Indisponível na demonstração';
      setTimeout(function () {
        b.textContent = b.dataset.acao === 'analise' ? 'Marcar em análise' : 'Pedir documentos';
      }, 1600);
    });
  });

  /* ---------------- navegacao ---------------- */
  function desenha() {
    var tela = TELAS[estado.tela] || TELAS.painel;
    tituloTela.textContent = tela.t;
    subTela.textContent = tela.s;
    conteudo.innerHTML = '';
    tela.f().forEach(function (n) { conteudo.appendChild(n); });

    Array.prototype.forEach.call(document.querySelectorAll('.menu a'), function (a) {
      a.classList.toggle('e-ativo', a.dataset.tela === estado.tela);
    });
    var novas = base().filter(function (r) { return r.status === 'nova'; }).length;
    document.getElementById('contaNovas').textContent = novas;
  }

  function daHash() {
    var h = (location.hash || '#painel').replace('#', '');
    estado.tela = TELAS[h] ? h : 'painel';
    if (estado.tela !== 'preanalises') estado.filtro = 'todos';
    desenha();
  }
  var fundoMenu = document.getElementById('fundoMenu');
  function fechaMenu() {
    lateral.classList.remove('e-aberta');
    fundoMenu.classList.remove('e-aberta');
    document.getElementById('abreMenu').setAttribute('aria-expanded', 'false');
  }

  window.addEventListener('hashchange', function () {
    daHash();
    fechaMenu();
  });

  var esperaBusca;
  campoBusca.addEventListener('input', function () {
    clearTimeout(esperaBusca);
    esperaBusca = setTimeout(function () {
      estado.busca = campoBusca.value;
      // um filtro de situação esquecido faria a busca voltar vazia sem o
      // usuário entender por quê
      if (estado.busca.trim()) estado.filtro = 'todos';
      // busca só faz sentido nas telas de lista
      if (estado.tela === 'painel' && estado.busca.trim()) {
        location.hash = '#preanalises';
        return;
      }
      desenha();
    }, 180);
  });

  var abreMenu = document.getElementById('abreMenu');
  abreMenu.addEventListener('click', function () {
    var aberta = lateral.classList.toggle('e-aberta');
    fundoMenu.classList.toggle('e-aberta', aberta);
    abreMenu.setAttribute('aria-expanded', aberta ? 'true' : 'false');
  });
  fundoMenu.addEventListener('click', fechaMenu);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && lateral.classList.contains('e-aberta')) fechaMenu();
  });

  var sair = document.getElementById('sair');
  if (sair) sair.addEventListener('click', function () {
    try { sessionStorage.removeItem('aeroprev-painel-sessao'); } catch (e) {}
    location.replace('login');
  });

  daHash();
})();
