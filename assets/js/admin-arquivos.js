/* AeroPrev — anexos do painel, gravados no proprio navegador (IndexedDB).
   Guarda o arquivo inteiro, entao o que o escritorio anexa continua la depois de
   fechar a aba. Nao e servidor: os arquivos ficam na maquina de quem anexou e nao
   sao vistos por outra pessoa do escritorio. Quando entrar um backend, so estas
   funcoes mudam — as telas chamam sempre a mesma interface. */
window.AEROPREV_ARQUIVOS = (function () {
  'use strict';

  var BANCO = 'aeroprev-painel';
  var LOJA = 'anexos';
  var VERSAO = 1;
  var TETO = 15 * 1024 * 1024;             // mesmo limite por arquivo do formulario
  var ACEITA = '.pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,' +
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  var conexao = null;

  function abre() {
    if (conexao) return conexao;
    conexao = new Promise(function (ok, falha) {
      if (!window.indexedDB) return falha(new Error('sem-indexeddb'));
      var req = indexedDB.open(BANCO, VERSAO);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(LOJA)) {
          var loja = db.createObjectStore(LOJA, { keyPath: 'id', autoIncrement: true });
          loja.createIndex('protocolo', 'protocolo', { unique: false });
          loja.createIndex('categoria', 'categoria', { unique: false });
        }
      };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { falha(req.error || new Error('indexeddb')); };
    });
    return conexao;
  }

  function transacao(modo, tarefa) {
    return abre().then(function (db) {
      return new Promise(function (ok, falha) {
        var tx = db.transaction(LOJA, modo);
        var loja = tx.objectStore(LOJA);
        var saida;
        tarefa(loja, function (v) { saida = v; });
        tx.oncomplete = function () { ok(saida); };
        tx.onerror = function () { falha(tx.error || new Error('transacao')); };
        tx.onabort = function () { falha(tx.error || new Error('abortada')); };
      });
    });
  }

  /* extensao em maiuscula, que e o que a etiqueta da lista mostra */
  function extensao(nome) {
    var p = String(nome || '').split('.');
    return p.length > 1 ? p.pop().toUpperCase().slice(0, 5) : 'ARQ';
  }

  function salvar(protocolo, categoria, arquivo) {
    if (!arquivo) return Promise.reject(new Error('sem-arquivo'));
    if (arquivo.size > TETO) {
      return Promise.reject(new Error('O arquivo tem ' + (arquivo.size / 1048576).toFixed(1).replace('.', ',') +
        ' MB. O limite por arquivo é 15 MB.'));
    }
    // guarda os BYTES (ArrayBuffer), não o File: o Safari/WebKit — o navegador do
    // iPhone — aborta a transação ao serializar um File no IndexedDB. ArrayBuffer
    // grava em todos os navegadores; o Blob é remontado na leitura.
    return arquivo.arrayBuffer().then(function (bytes) {
      var reg = {
        protocolo: protocolo,
        categoria: categoria,
        nome: arquivo.name,
        tipo: extensao(arquivo.name),
        mime: arquivo.type || 'application/octet-stream',
        peso: arquivo.size,
        quando: new Date().toISOString(),
        bytes: bytes
      };
      return transacao('readwrite', function (loja, devolve) {
        var req = loja.add(reg);
        req.onsuccess = function () { reg.id = req.result; devolve(reg); };
      });
    });
  }

  /* remonta o Blob a partir dos bytes guardados */
  function comoBlob(reg) {
    if (reg.blob instanceof Blob) return reg.blob;        // registros antigos
    return new Blob([reg.bytes], { type: reg.mime || 'application/octet-stream' });
  }

  /* sem categoria devolve tudo do caso */
  function listar(protocolo, categoria) {
    return transacao('readonly', function (loja, devolve) {
      var req = loja.index('protocolo').getAll(protocolo);
      req.onsuccess = function () {
        var r = req.result || [];
        if (categoria) r = r.filter(function (x) { return x.categoria === categoria; });
        r.sort(function (a, b) { return new Date(b.quando) - new Date(a.quando); });
        devolve(r);
      };
    });
  }

  function todos() {
    return transacao('readonly', function (loja, devolve) {
      var req = loja.getAll();
      req.onsuccess = function () { devolve(req.result || []); };
    });
  }

  function remover(id) {
    return transacao('readwrite', function (loja, devolve) {
      loja.delete(id);
      devolve(true);
    });
  }

  /* abre numa aba nova; a URL e revogada depois porque o blob fica preso em memoria */
  function abrirArquivo(reg) {
    var url = URL.createObjectURL(comoBlob(reg));
    var w = window.open(url, '_blank');
    if (!w) {  // bloqueado por pop-up: cai pro download
      var a = document.createElement('a');
      a.href = url; a.download = reg.nome;
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function baixar(reg) {
    var url = URL.createObjectURL(comoBlob(reg));
    var a = document.createElement('a');
    a.href = url; a.download = reg.nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /* quanto o navegador ja deixou guardar e quanto ainda cabe */
  function espaco() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (e) {
      return { usado: e.usage || 0, total: e.quota || 0 };
    }).catch(function () { return null; });
  }

  return {
    ACEITA: ACEITA,
    TETO: TETO,
    disponivel: !!window.indexedDB,
    salvar: salvar,
    listar: listar,
    todos: todos,
    remover: remover,
    abrir: abrirArquivo,
    baixar: baixar,
    espaco: espaco
  };
})();
