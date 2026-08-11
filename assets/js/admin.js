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

  var ARQ = window.AEROPREV_ARQUIVOS;

  var ROT = {};
  DEMO.estados.forEach(function (e) { ROT[e.id] = e.rot; });

  var estado = {
    tela: 'painel', busca: '', filtro: 'todos',
    selecionado: null,   // protocolo do caso aberto nas telas de anexo
    anexos: []           // espelho do IndexedDB, recarregado a cada gravação
  };

  /* mantem estado.anexos em dia com o banco do navegador */
  function carregaAnexos() {
    if (!ARQ || !ARQ.disponivel) return Promise.resolve([]);
    return ARQ.todos().then(function (r) {
      estado.anexos = r;
      return r;
    }, function () { return []; });
  }

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

    var verTodas = el('a', { class: 'acao', href: '#casos', txt: 'Ver todos' });

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
    var barra = el('div', { class: 'bloco-cab' }, [el('h2', { txt: 'Todos os cadastros' })]);
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

  /* ---------------- anexos do escritorio ---------------- */
  /* Analise previdenciaria e Calculos sao a mesma tela com outra gaveta:
     escolhe o caso na coluna da esquerda, anexa e ve os arquivos daquele caso. */
  function anexosDe(proto, categoria) {
    return estado.anexos.filter(function (a) {
      return a.protocolo === proto && (!categoria || a.categoria === categoria);
    });
  }

  function caseSelecionado(lista) {
    var achado = lista.filter(function (r) { return r.proto === estado.selecionado; })[0];
    return achado || lista[0] || null;
  }

  function colunaCasos(lista, categoria) {
    var col = el('div', { class: 'coluna-casos' });
    if (!lista.length) {
      col.appendChild(el('div', { class: 'vazio', txt: 'Nenhum cadastro corresponde a essa busca.' }));
      return col;
    }
    var sel = caseSelecionado(lista);
    lista.forEach(function (r) {
      var n = anexosDe(r.proto, categoria).length;
      var item = el('button', {
        class: 'caso-item' + (sel && r.proto === sel.proto ? ' e-ativo' : ''),
        type: 'button'
      }, [
        el('span', { class: 'avatar', txt: r.iniciais }),
        el('span', { class: 'caso-txt' }, [
          el('strong', { txt: r.nome }),
          el('span', { txt: r.proto + ' · ' + r.cpf })
        ]),
        n ? el('span', { class: 'caso-n', txt: String(n) }) : null
      ]);
      item.addEventListener('click', function () {
        estado.selecionado = r.proto;
        desenha();
      });
      col.appendChild(item);
    });
    return col;
  }

  function listaAnexos(r, categoria, aoMudar) {
    var itens = anexosDe(r.proto, categoria);
    var caixa = el('div', { class: 'anexos-lista' });
    if (!itens.length) {
      caixa.appendChild(el('p', { class: 'nota', txt: 'Nenhum arquivo anexado a este caso ainda.' }));
      return caixa;
    }
    itens.forEach(function (a) {
      var linha = el('div', { class: 'arquivo' }, [
        el('span', { class: 'tipo', txt: a.tipo }),
        el('div', {}, [
          el('strong', { txt: a.nome }),
          el('span', { txt: peso(a.peso) + ' · anexado em ' + dataHora(a.quando) })
        ]),
        el('button', { class: 'baixar', type: 'button', txt: 'Abrir' }),
        el('button', { class: 'remover', type: 'button', txt: 'Excluir', 'aria-label': 'Excluir ' + a.nome })
      ]);
      linha.querySelector('.baixar').addEventListener('click', function () { ARQ.abrir(a); });
      linha.querySelector('.remover').addEventListener('click', function () {
        if (!confirm('Excluir "' + a.nome + '"? Essa ação não pode ser desfeita.')) return;
        ARQ.remover(a.id).then(aoMudar);
      });
      caixa.appendChild(linha);
    });
    return caixa;
  }

  function areaEnvio(r, categoria, aoMudar) {
    var entrada = el('input', {
      type: 'file', id: 'envio-' + categoria, accept: ARQ.ACEITA, multiple: 'multiple', hidden: 'hidden'
    });
    var aviso = el('p', { class: 'envio-aviso', hidden: 'hidden' });
    var zona = el('label', { class: 'envio', for: 'envio-' + categoria }, [
      el('span', {
        class: 'envio-icone',
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
      }),
      el('span', {}, [
        el('strong', { txt: 'Anexar arquivo' }),
        el('span', { txt: 'PDF ou planilha (XLS, XLSX), até 15 MB por arquivo' })
      ])
    ]);

    function recebe(arquivos) {
      if (!arquivos || !arquivos.length) return;
      aviso.hidden = true;
      zona.classList.add('e-ocupada');
      var fila = Array.prototype.slice.call(arquivos).map(function (f) {
        return ARQ.salvar(r.proto, categoria, f).then(
          function () { return null; },
          function (e) { return f.name + ': ' + (e.message || 'não foi possível anexar'); }
        );
      });
      Promise.all(fila).then(function (erros) {
        zona.classList.remove('e-ocupada');
        var ruins = erros.filter(Boolean);
        if (ruins.length) { aviso.textContent = ruins.join(' · '); aviso.hidden = false; }
        aoMudar();
      });
    }

    entrada.addEventListener('change', function () { recebe(entrada.files); entrada.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('e-sobre'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('e-sobre'); });
    });
    zona.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) recebe(e.dataTransfer.files);
    });

    return el('div', {}, [zona, entrada, aviso]);
  }

  function telaAnexos(cfg) {
    var lista = filtrados().slice().sort(function (a, b) {
      return new Date(b.recebido) - new Date(a.recebido);
    });
    var r = caseSelecionado(lista);
    var recarrega = function () { carregaAnexos().then(desenha); };

    var direita;
    if (!r) {
      direita = el('div', { class: 'bloco-corpo' }, [
        el('p', { class: 'nota', txt: 'Selecione um cadastro na coluna ao lado para anexar arquivos.' })
      ]);
    } else {
      direita = el('div', { class: 'bloco-corpo' }, [
        el('div', { class: 'caso-cab' }, [
          el('div', {}, [
            el('span', { class: 'proto', txt: r.proto }),
            el('h3', { txt: r.nome }),
            el('p', { txt: r.objetivo })
          ]),
          etiqueta(r.status)
        ]),
        el('p', { class: 'nota', txt: cfg.ajuda }),
        areaEnvio(r, cfg.categoria, recarrega),
        listaAnexos(r, cfg.categoria, recarrega)
      ]);
    }

    return [el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [
        el('h2', { txt: cfg.titulo }),
        el('span', { class: 'acao', txt: lista.length + (lista.length === 1 ? ' cadastro' : ' cadastros') })
      ]),
      el('div', { class: 'trabalho' }, [colunaCasos(lista, cfg.categoria), direita])
    ])];
  }

  /* ---------------- relatorios ---------------- */
  function telaRelatorios() {
    var lista = filtrados().slice().sort(function (a, b) {
      return new Date(b.recebido) - new Date(a.recebido);
    });

    var corpo = el('div', { class: 'bloco-corpo' });
    corpo.appendChild(el('p', {
      class: 'nota',
      txt: 'O relatório abre em uma janela pronta para imprimir. Na janela de impressão, escolha "Salvar em PDF" para guardar o arquivo.'
    }));

    if (!lista.length) {
      corpo.appendChild(el('div', { class: 'vazio', txt: 'Nenhum cadastro corresponde a essa busca.' }));
    }

    lista.forEach(function (r) {
      var linha = el('div', { class: 'rel-linha' }, [
        el('span', { class: 'avatar', txt: r.iniciais }),
        el('div', { class: 'rel-txt' }, [
          el('strong', { txt: r.nome }),
          el('span', { txt: r.proto + ' · ' + r.objetivo })
        ]),
        el('div', { class: 'rel-bt' }, [
          el('button', { class: 'bt', type: 'button', txt: 'Simplificado' }),
          el('button', { class: 'bt bt-cheio', type: 'button', txt: 'Completo' })
        ])
      ]);
      var bts = linha.querySelectorAll('.rel-bt button');
      bts[0].addEventListener('click', function () { geraRelatorio(r, false); });
      bts[1].addEventListener('click', function () { geraRelatorio(r, true); });
      corpo.appendChild(linha);
    });

    return [el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [
        el('h2', { txt: 'Relatórios por cadastro' }),
        el('span', { class: 'acao', txt: lista.length + (lista.length === 1 ? ' cadastro' : ' cadastros') })
      ]),
      corpo
    ])];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function geraRelatorio(r, completo) {
    var linha = function (rot, val) {
      return val ? '<tr><th>' + esc(rot) + '</th><td>' + esc(val) + '</td></tr>' : '';
    };
    var partes = [];

    partes.push('<h2>Identificação</h2><table class="pares">' +
      linha('Nome', r.nome) + linha('CPF', r.cpf) +
      linha('Nascimento', dataCurta(r.nascimento)) +
      linha('Estado civil', r.estadoCivil) +
      linha('Profissão atual', r.profissao) +
      linha('E-mail', r.email) + linha('Telefone', r.telefone) +
      linha('Cidade', r.cidade + ' · ' + r.estado) + '</table>');

    partes.push('<h2>Objetivo</h2><p>' + esc(r.objetivo) + '</p>' +
      (completo && r.objetivoDetalhe ? '<p class="obs">' + esc(r.objetivoDetalhe) + '</p>' : ''));

    var vinc = r.vinculos.map(function (v) {
      return '<tr><td><strong>' + esc(v.empresa) + '</strong></td><td>' + esc(v.funcao) +
        '</td><td>' + esc(dataCurta(v.inicio) + ' a ' + dataCurta(v.fim)) + '</td></tr>';
    }).join('');
    partes.push('<h2>Trajetória na aviação</h2><table class="grade">' +
      '<thead><tr><th>Empresa</th><th>Função</th><th>Período</th></tr></thead><tbody>' +
      (vinc || '<tr><td colspan="3">Nenhum vínculo informado.</td></tr>') + '</tbody></table>');

    if (completo) {
      var outros = '';
      if (r.militar.serviu) outros += linha('Serviço militar', dataCurta(r.militar.inicio) + ' a ' + dataCurta(r.militar.fim));
      if (r.outras.length) outros += linha('Outros setores', r.outras.join(', '));
      if (r.beneficios.length) outros += linha('Benefícios', r.beneficios.join(', '));
      if (r.procInss.tem) outros += linha('Processo contra o INSS', r.procInss.num + ' · ' + r.procInss.sit);
      if (r.procTrab.tem) outros += linha('Processo trabalhista', r.procTrab.num + ' · ' + r.procTrab.sit);
      if (outros) partes.push('<h2>Militar, benefícios e processos</h2><table class="pares">' + outros + '</table>');

      var sn = DEMO.situacoes.map(function (s) {
        var sim = r.situacoes[s[0]];
        return '<tr class="' + (sim ? 'sim' : '') + '"><td>' + esc(s[1]) + '</td><td>' + (sim ? 'SIM' : 'não') + '</td></tr>';
      }).join('');
      var qtos = DEMO.situacoes.filter(function (s) { return r.situacoes[s[0]]; }).length;
      partes.push('<h2>Outras situações <small>' + qtos + ' de ' + DEMO.situacoes.length + ' marcadas</small></h2>' +
        '<table class="grade sn"><tbody>' + sn + '</tbody></table>');
    }

    var docs = r.docs.map(function (d) {
      return '<tr><td>' + esc(d.nome) + '</td><td>' + esc(d.tipo) + '</td><td>' + esc(peso(d.peso)) + '</td></tr>';
    }).join('');
    partes.push('<h2>Documentos enviados pelo solicitante <small>' + r.docs.length + '</small></h2>' +
      '<table class="grade"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th></tr></thead><tbody>' +
      (docs || '<tr><td colspan="3">Nenhum documento enviado.</td></tr>') + '</tbody></table>');

    var meus = anexosDe(r.proto);
    if (meus.length) {
      var CAT = { analise: 'Análise previdenciária', calculos: 'Cálculos' };
      var linhasMeus = meus.map(function (a) {
        return '<tr><td>' + esc(a.nome) + '</td><td>' + esc(CAT[a.categoria] || a.categoria) +
          '</td><td>' + esc(dataHora(a.quando)) + '</td></tr>';
      }).join('');
      partes.push('<h2>Anexos do escritório <small>' + meus.length + '</small></h2>' +
        '<table class="grade"><thead><tr><th>Arquivo</th><th>Seção</th><th>Anexado em</th></tr></thead><tbody>' +
        linhasMeus + '</tbody></table>');
    }

    if (completo && r.observacoes) {
      partes.push('<h2>Observações do solicitante</h2><p class="obs">' + esc(r.observacoes) + '</p>');
    }

    var doc = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<title>' + esc((completo ? 'Relatório completo' : 'Relatório simplificado') + ' · ' + r.nome) + '</title>' +
      '<style>' +
      '*{box-sizing:border-box}' +
      'html{background:#fff}' +
      'body{font:13px/1.55 "Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color:#1A1112;background:#fff;margin:0 auto;padding:34px 38px;max-width:820px}' +
      'header{border-bottom:2px solid #7A1B1D;padding-bottom:14px;margin-bottom:22px}' +
      '.selo{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#8E7C79}' +
      'h1{font-size:1.5rem;margin:.25rem 0 .1rem;color:#2C0A0B}' +
      'header p{margin:0;color:#635250;font-size:.82rem}' +
      'h2{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#7A1B1D;' +
      'margin:24px 0 8px;padding-bottom:5px;border-bottom:1px solid #E7E1DE}' +
      'h2 small{float:right;letter-spacing:0;text-transform:none;color:#8E7C79;font-weight:400}' +
      'table{width:100%;border-collapse:collapse;font-size:.82rem}' +
      '.pares th{width:34%;text-align:left;font-weight:500;color:#635250;padding:5px 10px 5px 0;vertical-align:top}' +
      '.pares td{padding:5px 0;font-weight:600}' +
      '.grade th{text-align:left;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;' +
      'color:#8E7C79;border-bottom:1px solid #E7E1DE;padding:5px 8px 5px 0}' +
      '.grade td{padding:5px 8px 5px 0;border-bottom:1px solid #F1ECEA;vertical-align:top}' +
      '.sn td:last-child{width:70px;text-align:right;color:#8E7C79}' +
      '.sn tr.sim td:last-child{color:#7A1B1D;font-weight:700}' +
      'p{margin:.3rem 0}.obs{color:#635250;background:#F7F5F4;padding:10px 12px;border-radius:8px}' +
      'footer{margin-top:30px;padding-top:12px;border-top:1px solid #E7E1DE;font-size:.7rem;color:#8E7C79}' +
      '@media print{body{padding:0}h2{break-after:avoid}tr{break-inside:avoid}}' +
      '</style></head><body>' +
      '<header><span class="selo">' + (completo ? 'Relatório completo' : 'Relatório simplificado') + '</span>' +
      '<h1>' + esc(r.nome) + '</h1>' +
      '<p>Protocolo ' + esc(r.proto) + ' · recebida em ' + esc(dataHora(r.recebido)) +
      ' · situação: ' + esc(ROT[r.status] || r.status) + '</p></header>' +
      partes.join('') +
      '<footer>AeroPrev · Sartori &amp; Wöhlke · gerado em ' + esc(dataHora(new Date().toISOString())) +
      '<br>Documento de uso interno. Os dados desta demonstração são fictícios.</footer>' +
      '</body></html>';

    var w = window.open('', '_blank');
    if (!w) { alert('O navegador bloqueou a janela do relatório. Libere os pop-ups deste site e tente de novo.'); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    // deixa a janela pintar antes de chamar a impressão, senão sai em branco no Safari
    setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
  }

  function telaEmBreve(titulo, texto) {
    return [el('section', { class: 'bloco' }, [
      el('div', { class: 'bloco-cab' }, [
        el('h2', { txt: titulo }),
        el('span', { class: 'acao', txt: 'Próxima fase' })
      ]),
      el('div', { class: 'bloco-corpo' }, [
        el('div', { class: 'proxima' }, [
          el('p', { txt: texto }),
          el('p', { class: 'nota', txt: 'Combinado com o escritório para um segundo momento, depois que a gestão de casos estiver rodando.' })
        ])
      ])
    ])];
  }

  var TELAS = {
    painel: { t: 'Dashboard', s: 'Visão geral das pré-análises recebidas', f: telaPainel },
    casos: { t: 'Casos', s: 'Cadastro completo do cliente', f: telaPreAnalises },
    analise: {
      t: 'Análise previdenciária', s: 'Análises do CNIS e informações',
      f: function () {
        return telaAnexos({
          categoria: 'analise',
          titulo: 'Análises por cadastro',
          ajuda: 'Anexe aqui a análise do CNIS e os documentos de apoio deste caso.'
        });
      }
    },
    calculos: {
      t: 'Cálculos', s: 'Planilhas de cálculos e informações',
      f: function () {
        return telaAnexos({
          categoria: 'calculos',
          titulo: 'Cálculos por cadastro',
          ajuda: 'Anexe aqui a planilha ou o PDF com os cálculos deste caso.'
        });
      }
    },
    relatorios: { t: 'Relatórios', s: 'Gerar relatório simplificado e completo', f: telaRelatorios },
    acervo: {
      t: 'Acervo jurisprudencial', s: 'Pesquise decisões e julgados',
      f: function () { return telaEmBreve('Acervo jurisprudencial', 'Busca em decisões e julgados sobre aposentadoria do aeronauta, com filtro por tribunal, tema e ano.'); }
    },
    base: {
      t: 'Base jurídica', s: 'Leis, normas e entendimentos',
      f: function () { return telaEmBreve('Base jurídica', 'Leis, normas, instruções normativas e entendimentos administrativos reunidos e pesquisáveis num lugar só.'); }
    },
    inteligente: {
      t: 'Análise inteligente', s: 'Geração de relatórios com IA',
      f: function () { return telaEmBreve('Análise inteligente', 'Relatório de admissibilidade e parecer jurídico prévio gerados a partir dos dados do cadastro e dos documentos anexados.'); }
    },
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
    if (estado.tela !== 'casos') estado.filtro = 'todos';
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
        location.hash = '#casos';
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

  // desenha já com o que estiver no banco do navegador, para a contagem de
  // anexos não aparecer zerada e pular para o número certo um instante depois
  carregaAnexos().then(daHash, daHash);
})();
