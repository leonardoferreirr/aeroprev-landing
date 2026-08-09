/* AeroPrev — tela de entrada do painel.
   ATENCAO: isto NAO e seguranca. A conferencia roda no navegador de quem
   acessa, entao qualquer pessoa com o console aberto entra assim mesmo. Serve
   para demonstrar o fluxo enquanto o painel so tem dados ficticios.
   A credencial vai como hash so para nao ficar legivel no repositorio, que e
   publico. Trocar por autenticacao de servidor antes de qualquer dado real
   (ver docs/painel.md). */
(function () {
  'use strict';

  var CHAVE = 'aeroprev-painel-sessao';
  // sha-256 de "usuario:senha"
  var ESPERADO = '0cf0ba8b533cd673fdce3d5b6b3311a50e68e17c57a95e213ad1e7e62a55d9d9';

  var form = document.getElementById('formEntrada');
  var erro = document.getElementById('erro');
  if (!form) return;

  function mostraErro(msg) {
    erro.textContent = msg;
    erro.hidden = false;
  }

  function digest(texto) {
    // crypto.subtle exige contexto seguro: existe em https e em localhost
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve(null);
    return window.crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(texto))
      .then(function (buf) {
        return Array.prototype.map
          .call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    erro.hidden = true;

    var usuario = document.getElementById('usuario').value.trim().toLowerCase();
    var senha = document.getElementById('senha').value;
    if (!usuario || !senha) { mostraErro('Preencha usuário e senha.'); return; }

    var bt = form.querySelector('button');
    bt.disabled = true;

    digest(usuario + ':' + senha).then(function (hash) {
      if (hash === null) {
        mostraErro('Este navegador não permite a conferência. Abra o painel por HTTPS.');
        bt.disabled = false;
        return;
      }
      if (hash !== ESPERADO) {
        mostraErro('Usuário ou senha incorretos.');
        document.getElementById('senha').value = '';
        bt.disabled = false;
        return;
      }
      try {
        // sessionStorage: a sessao morre quando a aba fecha
        sessionStorage.setItem(CHAVE, String(Date.now()));
      } catch (e) {}
      var destino = new URLSearchParams(location.search).get('de');
      location.replace(destino && destino.charAt(0) === '/' ? destino : 'admin');
    });
  });
})();
