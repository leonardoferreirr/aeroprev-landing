/* AeroPrev — monta o relatorio do caso como um PDF unico, ja com os anexos
   dentro. Substitui a rota antiga (janela do navegador + "Salvar em PDF"), que
   nunca punha o arquivo na mao do JavaScript e por isso nao permitia juntar
   nada.

   O texto e desenhado vetorialmente com as fontes padrao do PDF (Helvetica),
   entao o resultado continua pesquisavel e leve — nada de rasterizar tela.

   Os anexos entram assim:
     PDF        paginas copiadas na integra, atras de uma folha separadora
     JPG / PNG  uma pagina desenhada aqui, com o rotulo do documento no topo
     resto      nao entra: fica listado na folha de pendencias, com o motivo

   pdf-lib so e baixado quando alguem pede um relatorio: sao 525 KB que nao
   fazem falta em quem entra no painel so para ler a lista de casos. */
window.AEROPREV_PDF = (function () {
  'use strict';

  var LIB = 'assets/js/pdf-lib-1.17.1.min.js';
  var promessaLib = null;

  function carregaLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (promessaLib) return promessaLib;
    promessaLib = new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = LIB;
      s.onload = function () {
        window.PDFLib ? ok(window.PDFLib)
          : falha(new Error('a biblioteca de PDF carregou incompleta'));
      };
      s.onerror = function () {
        promessaLib = null;
        falha(new Error('não foi possível carregar a biblioteca de PDF'));
      };
      document.head.appendChild(s);
    });
    return promessaLib;
  }

  /* ---------------- medidas e cores ---------------- */

  var A4 = [595.28, 841.89];
  var MARGEM = 48;
  var LARG = A4[0] - MARGEM * 2;
  var RODAPE = 42;                    // altura reservada no pe da pagina

  /* mesmos tons da identidade usada no painel */
  var COR = {
    vinho: [0.478, 0.106, 0.114],     // #7A1B1D
    escuro: [0.173, 0.039, 0.043],    // #2C0A0B
    texto: [0.102, 0.067, 0.071],     // #1A1112
    medio: [0.388, 0.322, 0.314],     // #635250
    claro: [0.557, 0.486, 0.475],     // #8E7C79
    linha: [0.906, 0.882, 0.871],     // #E7E1DE
    fundo: [0.969, 0.961, 0.957]      // #F7F5F4
  };

  /* Helvetica escreve em WinAnsi: o que estiver fora da tabela derruba o
     pdf-lib no meio da geracao. Os sinais que aparecem de verdade nos dados
     (aspas curvas, travessao, reticencias) tem equivalente; o resto vira "?"
     em vez de estourar o relatorio inteiro. */
  var TROCA = {
    '‘': "'", '’': "'", '“': '"', '”': '"',
    '–': '-', '—': '-', '…': '...', ' ': ' ',
    '•': '·', '−': '-', 'ʼ': "'"
  };

  function limpa(s) {
    s = String(s == null ? '' : s);
    var saida = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (TROCA[c]) { saida += TROCA[c]; continue; }
      var n = s.charCodeAt(i);
      // emoji e afins ocupam dois codigos; some com o par inteiro em vez de
      // deixar "??" no meio da frase que a pessoa escreveu
      if (n >= 0xD800 && n <= 0xDBFF) { i++; continue; }
      // faixa coberta pelo WinAnsi, fora os codigos de controle
      if (n === 9 || n === 10 || (n >= 32 && n <= 126) || (n >= 160 && n <= 255)) {
        saida += c;
      } else {
        saida += '?';
      }
    }
    // o corte acima pode deixar espaco dobrado onde estava o emoji
    return saida.replace(/ {2,}/g, ' ').replace(/ +([,.;:!?])/g, '$1');
  }

  /* ---------------- folha em construcao ---------------- */

  /* Guarda o documento, a pagina corrente e onde parou a escrita. Toda funcao
     de desenho consulta o espaco que sobra e vira a pagina sozinha. */
  function Folha(doc, fontes, cabecalho) {
    this.doc = doc;
    this.f = fontes.normal;
    this.fb = fontes.negrito;
    this.cabecalho = cabecalho;
    this.pag = null;
    this.y = 0;
    this.paginas = [];
    this.novaPagina();
  }

  Folha.prototype.novaPagina = function () {
    this.pag = this.doc.addPage(A4);
    this.paginas.push(this.pag);
    this.y = A4[1] - MARGEM;
    return this.pag;
  };

  Folha.prototype.cabe = function (altura) {
    if (this.y - altura < MARGEM + RODAPE) { this.novaPagina(); return true; }
    return false;
  };

  Folha.prototype.texto = function (t, opc) {
    opc = opc || {};
    var tam = opc.tam || 9.5;
    var fonte = opc.negrito ? this.fb : this.f;
    this.pag.drawText(limpa(t), {
      x: opc.x == null ? MARGEM : opc.x,
      y: this.y - tam,
      size: tam,
      font: fonte,
      color: rgbDe(opc.cor || COR.texto)
    });
  };

  /* quebra o texto na largura pedida e devolve as linhas */
  Folha.prototype.quebra = function (t, largura, tam, negrito) {
    var fonte = negrito ? this.fb : this.f;
    var palavras = limpa(t).split(/\s+/).filter(Boolean);
    var linhas = [], atual = '';
    palavras.forEach(function (p) {
      var teste = atual ? atual + ' ' + p : p;
      if (fonte.widthOfTextAtSize(teste, tam) <= largura) {
        atual = teste;
      } else {
        if (atual) linhas.push(atual);
        // palavra sozinha maior que a coluna (URL, nome de arquivo): corta
        while (fonte.widthOfTextAtSize(p, tam) > largura && p.length > 1) {
          var corte = p.length;
          while (corte > 1 && fonte.widthOfTextAtSize(p.slice(0, corte), tam) > largura) corte--;
          linhas.push(p.slice(0, corte));
          p = p.slice(corte);
        }
        atual = p;
      }
    });
    if (atual) linhas.push(atual);
    return linhas.length ? linhas : [''];
  };

  Folha.prototype.paragrafo = function (t, opc) {
    opc = opc || {};
    var tam = opc.tam || 9.5;
    var alt = tam * 1.45;
    var linhas = this.quebra(t, LARG - (opc.recuo || 0) * 2, tam, opc.negrito);
    var self = this;
    linhas.forEach(function (l) {
      self.cabe(alt);
      self.texto(l, { tam: tam, cor: opc.cor, negrito: opc.negrito, x: MARGEM + (opc.recuo || 0) });
      self.y -= alt;
    });
    this.y -= opc.depois == null ? 4 : opc.depois;
  };

  /* faixa de secao: rotulo em versalete com fio embaixo */
  Folha.prototype.secao = function (titulo, nota) {
    this.cabe(46);
    this.y -= 14;
    this.texto(titulo.toUpperCase(), { tam: 7.6, cor: COR.vinho, negrito: true });
    if (nota) {
      var t = limpa(nota);
      this.pag.drawText(t, {
        x: MARGEM + LARG - this.f.widthOfTextAtSize(t, 8),
        y: this.y - 7.6, size: 8, font: this.f, color: rgbDe(COR.claro)
      });
    }
    this.y -= 12;
    this.pag.drawLine({
      start: { x: MARGEM, y: this.y }, end: { x: MARGEM + LARG, y: this.y },
      thickness: 0.7, color: rgbDe(COR.linha)
    });
    this.y -= 10;
  };

  /* rotulo a esquerda, valor a direita — o "pares" do relatorio antigo */
  Folha.prototype.par = function (rot, val) {
    if (!val && val !== 0) return;
    var tam = 9.5, colRot = LARG * 0.32, colVal = LARG - colRot - 10;
    var linhas = this.quebra(String(val), colVal, tam, true);
    var alt = tam * 1.45;
    this.cabe(alt * linhas.length + 2);
    this.texto(rot, { tam: tam, cor: COR.medio });
    var self = this;
    linhas.forEach(function (l, i) {
      self.pag.drawText(l, {
        x: MARGEM + colRot + 10, y: self.y - tam, size: tam,
        font: self.fb, color: rgbDe(COR.texto)
      });
      if (i < linhas.length - 1) self.y -= alt;
    });
    this.y -= alt + 2;
  };

  /* tabela com cabecalho; larguras em fracao da largura util */
  Folha.prototype.tabela = function (cabs, linhas, fracoes, opc) {
    opc = opc || {};
    var tam = 8.8, alt = tam * 1.4, self = this;
    var cols = fracoes.map(function (f) { return LARG * f; });

    function desenhaCabecalho() {
      self.cabe(alt + 8);
      var x = MARGEM;
      cabs.forEach(function (c, i) {
        self.pag.drawText(limpa(String(c).toUpperCase()), {
          x: x, y: self.y - 7, size: 6.9, font: self.fb, color: rgbDe(COR.claro)
        });
        x += cols[i];
      });
      self.y -= alt;
      self.pag.drawLine({
        start: { x: MARGEM, y: self.y + 4 }, end: { x: MARGEM + LARG, y: self.y + 4 },
        thickness: 0.7, color: rgbDe(COR.linha)
      });
      self.y -= 4;
    }

    if (cabs && cabs.length) desenhaCabecalho();

    linhas.forEach(function (cels) {
      // cada celula pode ocupar mais de uma linha; a altura e a da maior
      var partes = cels.map(function (c, i) {
        return self.quebra(String(c == null ? '' : c), cols[i] - 8, tam,
          opc.negritoPrimeira && i === 0);
      });
      var quantas = Math.max.apply(null, partes.map(function (p) { return p.length; }));
      if (self.cabe(quantas * alt + 6) && cabs && cabs.length) desenhaCabecalho();

      var topo = self.y;
      var x = MARGEM;
      partes.forEach(function (p, i) {
        p.forEach(function (l, j) {
          self.pag.drawText(l, {
            x: x, y: topo - tam - j * alt, size: tam,
            font: (opc.negritoPrimeira && i === 0) ? self.fb : self.f,
            color: rgbDe(opc.cores && opc.cores[i] ? opc.cores[i] : COR.texto)
          });
        });
        x += cols[i];
      });
      self.y -= quantas * alt + 4;
      self.pag.drawLine({
        start: { x: MARGEM, y: self.y + 2 }, end: { x: MARGEM + LARG, y: self.y + 2 },
        thickness: 0.5, color: rgbDe([0.945, 0.925, 0.918])
      });
    });
    this.y -= 4;
  };

  /* bloco recuado com fundo claro, para texto livre do solicitante */
  Folha.prototype.citacao = function (t) {
    var tam = 9.5, alt = tam * 1.5;
    var linhas = this.quebra(t, LARG - 24, tam);
    this.cabe(linhas.length * alt + 18);
    var topo = this.y;
    this.pag.drawRectangle({
      x: MARGEM, y: topo - linhas.length * alt - 12, width: LARG,
      height: linhas.length * alt + 12, color: rgbDe(COR.fundo)
    });
    var self = this;
    linhas.forEach(function (l, i) {
      self.pag.drawText(l, {
        x: MARGEM + 12, y: topo - 14 - i * alt, size: tam,
        font: self.f, color: rgbDe(COR.medio)
      });
    });
    this.y = topo - linhas.length * alt - 18;
  };


  var rgbDe = null;   // preenchido quando a lib carrega

  /* ---------------- anexos ---------------- */

  function tipoReal(bytes) {
    var b = new Uint8Array(bytes);
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
    return '';
  }

  /* baixa o anexo que o solicitante enviou (bucket privado do Supabase) */
  function bytesDoStorage(caminho) {
    return window.AeroPrevSB.urlAssinada(caminho, 300)
      .then(function (url) { return fetch(url); })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      });
  }

  /* pagina inteira para uma foto de documento, com o rotulo no topo */
  function paginaImagem(doc, img, rotulo, nome, fontes) {
    var pag = doc.addPage(A4);
    var topo = A4[1] - MARGEM;

    pag.drawText(limpa(String(rotulo || 'Documento').toUpperCase()), {
      x: MARGEM, y: topo - 8, size: 7.6, font: fontes.negrito, color: rgbDe(COR.vinho)
    });
    pag.drawText(limpa(nome), {
      x: MARGEM, y: topo - 22, size: 8.4, font: fontes.normal, color: rgbDe(COR.claro)
    });
    pag.drawLine({
      start: { x: MARGEM, y: topo - 30 }, end: { x: MARGEM + LARG, y: topo - 30 },
      thickness: 0.7, color: rgbDe(COR.linha)
    });

    var caixaAlt = topo - 30 - MARGEM - 14;
    var escala = Math.min(LARG / img.width, caixaAlt / img.height, 1);
    // foto de celular costuma ser menor que a pagina em pontos; ai amplia ate
    // preencher a caixa, senao o documento sai minusculo no meio da folha
    if (escala === 1 && img.width < LARG && img.height < caixaAlt) {
      escala = Math.min(LARG / img.width, caixaAlt / img.height);
    }
    var l = img.width * escala, a = img.height * escala;
    pag.drawImage(img, {
      x: MARGEM + (LARG - l) / 2,
      y: MARGEM + 14 + (caixaAlt - a) / 2,
      width: l, height: a
    });
    return pag;
  }

  /* folha separadora antes de um PDF anexado */
  function paginaSeparadora(doc, rotulo, nome, fontes, quantas) {
    var pag = doc.addPage(A4);
    // no terco superior, na mesma altura em que o relatorio abre: centralizado
    // a folha fica com um bloco solto boiando no meio do branco
    var base = A4[1] - MARGEM - 96;
    pag.drawLine({
      start: { x: MARGEM, y: base + 46 }, end: { x: MARGEM + LARG, y: base + 46 },
      thickness: 1.6, color: rgbDe(COR.vinho)
    });
    pag.drawText(limpa('Documento anexado'.toUpperCase()), {
      x: MARGEM, y: base + 26, size: 7.6, font: fontes.negrito, color: rgbDe(COR.claro)
    });
    pag.drawText(limpa(rotulo || nome), {
      x: MARGEM, y: base, size: 19, font: fontes.negrito, color: rgbDe(COR.escuro)
    });
    pag.drawText(limpa(nome + '  ·  ' + quantas + (quantas === 1 ? ' página' : ' páginas')), {
      x: MARGEM, y: base - 18, size: 9, font: fontes.normal, color: rgbDe(COR.medio)
    });
    return pag;
  }

  /* ---------------- montagem ---------------- */

  /* r        = registro do caso, como admin.js ja o tem
     completo = inclui situacoes, processos e observacoes
     opc.anexos      = lista unificada [{rotulo, nome, mime, caminho|bytes}]
     opc.aoProgresso = callback(feito, total, nome) para a interface avisar */
  function montar(r, completo, opc) {
    opc = opc || {};
    var anexos = opc.anexos || [];
    var avisa = opc.aoProgresso || function () {};

    return carregaLib().then(function (PDFLib) {
      rgbDe = function (c) { return PDFLib.rgb(c[0], c[1], c[2]); };

      return PDFLib.PDFDocument.create().then(function (doc) {
        return Promise.all([
          doc.embedFont(PDFLib.StandardFonts.Helvetica),
          doc.embedFont(PDFLib.StandardFonts.HelveticaBold)
        ]).then(function (fs) {
          var fontes = { normal: fs[0], negrito: fs[1] };
          var folha = new Folha(doc, fontes);

          desenhaRelatorio(folha, r, completo, anexos);

          // os anexos entram depois do relatorio, na ordem da lista
          var falhas = [];
          var feito = 0;

          function proximo(i) {
            if (i >= anexos.length) return Promise.resolve();
            var a = anexos[i];
            avisa(feito, anexos.length, a.nome);

            // bytes pode vir pronto (IndexedDB), como promessa (Blob antigo
            // sendo convertido) ou nem existir, e ai vem do bucket
            var pegaBytes = a.bytes
              ? Promise.resolve(a.bytes)
              : (a.caminho ? bytesDoStorage(a.caminho)
                : Promise.reject(new Error('anexo sem origem')));

            return pegaBytes.then(function (bytes) {
              var t = tipoReal(bytes);
              if (t === 'pdf') {
                return PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true })
                  .then(function (origem) {
                    var indices = origem.getPageIndices();
                    paginaSeparadora(doc, a.rotulo, a.nome, fontes, indices.length);
                    return doc.copyPages(origem, indices).then(function (pgs) {
                      pgs.forEach(function (p) { doc.addPage(p); });
                    });
                  });
              }
              if (t === 'jpg' || t === 'png') {
                var embute = t === 'jpg' ? doc.embedJpg(bytes) : doc.embedPng(bytes);
                return Promise.resolve(embute).then(function (img) {
                  paginaImagem(doc, img, a.rotulo, a.nome, fontes);
                });
              }
              falhas.push({ nome: a.nome, motivo: 'formato que não entra em PDF (' + (a.tipoRot || 'arquivo') + ')' });
            }).catch(function (e) {
              falhas.push({ nome: a.nome, motivo: mensagemFalha(e) });
            }).then(function () {
              feito++;
              avisa(feito, anexos.length, a.nome);
              return proximo(i + 1);
            });
          }

          return proximo(0).then(function () {
            if (falhas.length) desenhaPendencias(doc, fontes, falhas);
            numeraRodape(doc, fontes, r);
            doc.setTitle(limpa((completo ? 'Relatório completo' : 'Relatório simplificado') + ' - ' + r.nome));
            doc.setSubject(limpa('Protocolo ' + r.proto));
            doc.setCreator('AeroPrev - Sartoti & Wöhlke');
            doc.setProducer('AeroPrev');
            return doc.save().then(function (bytes) {
              return { bytes: bytes, falhas: falhas };
            });
          });
        });
      });
    });
  }

  function mensagemFalha(e) {
    var m = String((e && e.message) || e);
    if (/encrypt|password/i.test(m)) return 'PDF protegido por senha';
    if (/HTTP 40|HTTP 5/.test(m)) return 'não foi possível baixar o arquivo';
    if (/Invalid|parse|header/i.test(m)) return 'arquivo corrompido ou incompleto';
    return 'não foi possível incluir (' + m.slice(0, 60) + ')';
  }

  /* ---------------- conteudo do relatorio ---------------- */

  function desenhaRelatorio(folha, r, completo, anexos) {
    var DEMO = window.AEROPREV_DEMO || { situacoes: [] };
    var pag = folha.pag;

    // capa curta no topo da primeira pagina
    pag.drawText(limpa((completo ? 'Relatório completo' : 'Relatório simplificado').toUpperCase()), {
      x: MARGEM, y: folha.y - 8, size: 7.6, font: folha.fb, color: rgbDe(COR.claro)
    });
    folha.y -= 22;
    pag.drawText(limpa(r.nome), {
      x: MARGEM, y: folha.y - 18, size: 20, font: folha.fb, color: rgbDe(COR.escuro)
    });
    folha.y -= 30;
    pag.drawText(limpa('Protocolo ' + r.proto + '  ·  recebida em ' + fmtDataHora(r.recebido) +
      '  ·  situação: ' + (r.statusRot || r.status)), {
      x: MARGEM, y: folha.y - 9, size: 9, font: folha.f, color: rgbDe(COR.medio)
    });
    folha.y -= 18;
    pag.drawLine({
      start: { x: MARGEM, y: folha.y }, end: { x: MARGEM + LARG, y: folha.y },
      thickness: 1.6, color: rgbDe(COR.vinho)
    });
    folha.y -= 6;

    folha.secao('Identificação');
    folha.par('Nome', r.nome);
    folha.par('CPF', r.cpf);
    folha.par('Nascimento', fmtData(r.nascimento));
    folha.par('Estado civil', r.estadoCivil);
    folha.par('Profissão atual', r.profissao);
    folha.par('E-mail', r.email);
    folha.par('Telefone', r.telefone);
    if (r.cidade || r.estado) folha.par('Cidade', [r.cidade, r.estado].filter(Boolean).join(' · '));

    folha.secao('Objetivo');
    (r.objetivos && r.objetivos.length ? r.objetivos : [r.objetivo || '(não informado)'])
      .forEach(function (o) { folha.paragrafo('·  ' + o, { depois: 1 }); });
    if (completo && r.objetivoDetalhe) { folha.y -= 4; folha.citacao(r.objetivoDetalhe); }

    folha.secao('Trajetória na aviação', r.vinculos.length + (r.vinculos.length === 1 ? ' vínculo' : ' vínculos'));
    if (r.vinculos.length) {
      folha.tabela(['Empresa', 'Função', 'Período'],
        r.vinculos.map(function (v) {
          return [v.empresa, v.funcao, fmtData(v.inicio) + ' a ' + (v.fim === 'Atual' ? 'Atual' : fmtData(v.fim))];
        }), [0.40, 0.30, 0.30], { negritoPrimeira: true });
    } else {
      folha.paragrafo('Nenhum vínculo informado.', { cor: COR.claro });
    }

    if (r.atividades && r.atividades.length) {
      folha.secao('Funções exercidas');
      folha.paragrafo(r.atividades.join('  ·  '));
    }

    if (completo) {
      var extras = [];
      if (r.militar.serviu) extras.push(['Serviço militar', fmtData(r.militar.inicio) + ' a ' + fmtData(r.militar.fim)]);
      if (r.outras.length) extras.push(['Outros setores', r.outras.join(', ')]);
      if (r.beneficios.length) extras.push(['Benefícios', r.beneficios.join(', ')]);
      if (r.procInss.tem) extras.push(['Processo contra o INSS', r.procInss.num + ' · ' + r.procInss.sit]);
      if (r.procTrab.tem) extras.push(['Processo trabalhista', r.procTrab.num + ' · ' + r.procTrab.sit]);
      if (extras.length) {
        folha.secao('Militar, benefícios e processos');
        extras.forEach(function (p) { folha.par(p[0], p[1]); });
      }

      var marcadas = DEMO.situacoes.filter(function (s) { return r.situacoes[s[0]]; }).length;
      folha.secao('Outras situações', marcadas + ' de ' + DEMO.situacoes.length + ' marcadas');
      folha.tabela([], DEMO.situacoes.map(function (s) {
        return [s[1], r.situacoes[s[0]] ? 'SIM' : 'não'];
      }), [0.86, 0.14], { cores: [COR.texto, COR.claro] });
    }

    folha.secao('Documentos enviados pelo solicitante', String(r.docs.length));
    if (r.docs.length) {
      folha.tabela(['Documento', 'Arquivo', 'Tipo', 'Tamanho'],
        r.docs.map(function (d) {
          return [d.grupo || '—', d.nome, d.tipo, fmtPeso(d.peso)];
        }), [0.30, 0.44, 0.10, 0.16], { negritoPrimeira: true });
    } else {
      folha.paragrafo('Nenhum documento enviado.', { cor: COR.claro });
    }

    var doEscritorio = anexos.filter(function (a) { return a.origem === 'escritorio'; });
    if (doEscritorio.length) {
      folha.secao('Anexos do escritório', String(doEscritorio.length));
      folha.tabela(['Arquivo', 'Seção'],
        doEscritorio.map(function (a) { return [a.nome, a.rotulo]; }),
        [0.62, 0.38], { negritoPrimeira: true });
    }

    if (completo && r.observacoes) {
      folha.secao('Observações do solicitante');
      folha.citacao(r.observacoes);
    }

    if (anexos.length) {
      folha.secao('Anexos deste arquivo', String(anexos.length));
      folha.paragrafo('Os arquivos listados acima seguem nas próximas páginas, na ordem em que aparecem. ' +
        'Cada documento começa em folha própria, identificada com o nome do anexo.', { cor: COR.medio });
    }
  }

  /* folha final listando o que nao pode ser incorporado */
  function desenhaPendencias(doc, fontes, falhas) {
    var folha = new Folha(doc, fontes);
    folha.pag.drawText(limpa('Anexos não incluídos'.toUpperCase()), {
      x: MARGEM, y: folha.y - 8, size: 7.6, font: fontes.negrito, color: rgbDe(COR.vinho)
    });
    folha.y -= 26;
    folha.pag.drawLine({
      start: { x: MARGEM, y: folha.y }, end: { x: MARGEM + LARG, y: folha.y },
      thickness: 1.4, color: rgbDe(COR.vinho)
    });
    folha.y -= 12;
    folha.paragrafo('Estes arquivos estão no caso, mas não entraram neste PDF. ' +
      'Eles continuam disponíveis para download na tela do cadastro.', { cor: COR.medio });
    folha.y -= 4;
    folha.tabela(['Arquivo', 'Motivo'],
      falhas.map(function (f) { return [f.nome, f.motivo]; }),
      [0.52, 0.48], { negritoPrimeira: true, cores: [COR.texto, COR.claro] });
  }

  /* rodape com paginacao em todas as folhas, ja com o total fechado */
  function numeraRodape(doc, fontes, r) {
    var pgs = doc.getPages();
    var total = pgs.length;
    var carimbo = limpa('AeroPrev · Sartoti & Wöhlke · protocolo ' + r.proto +
      ' · gerado em ' + fmtDataHora(new Date().toISOString()));
    pgs.forEach(function (p, i) {
      var alt = p.getSize().height;
      p.drawText(carimbo, {
        x: MARGEM, y: 24, size: 6.8, font: fontes.normal, color: rgbDe(COR.claro)
      });
      var n = (i + 1) + ' / ' + total;
      p.drawText(n, {
        x: p.getSize().width - MARGEM - fontes.normal.widthOfTextAtSize(n, 6.8),
        y: 24, size: 6.8, font: fontes.normal, color: rgbDe(COR.claro)
      });
      // fio fino separando o rodape do conteudo, so nas folhas do relatorio
      if (alt === A4[1]) {
        p.drawLine({
          start: { x: MARGEM, y: 34 }, end: { x: p.getSize().width - MARGEM, y: 34 },
          thickness: 0.5, color: rgbDe(COR.linha)
        });
      }
    });
  }

  /* ---------------- formatacao ---------------- */

  function fmtData(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
  }

  function fmtDataHora(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso || '');
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' as ' + z(d.getHours()) + 'h' + z(d.getMinutes());
  }

  function fmtPeso(b) {
    if (!b) return '';
    return b < 1048576 ? Math.round(b / 1024) + ' KB'
      : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }

  function nomeArquivo(r, completo) {
    var limpo = limpa(r.nome).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return 'AeroPrev-' + r.proto + '-' + (limpo || 'cadastro') +
      (completo ? '-completo' : '-simplificado') + '.pdf';
  }

  function baixa(bytes, nome) {
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  return {
    montar: montar,
    nomeArquivo: nomeArquivo,
    baixa: baixa,
    disponivel: true
  };
})();
