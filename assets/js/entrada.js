/* AeroPrev — tela de entrada do painel.
   Autenticação de verdade via Supabase Auth (assets/js/supabase.js). Só entra
   quem o escritório cadastrar em Authentication > Users no painel do Supabase.
   A sessão fica no navegador; o token é renovado sozinho e expira. */
(function () {
  'use strict';

  var form = document.getElementById('formEntrada');
  var erro = document.getElementById('erro');
  if (!form) return;

  function mostraErro(msg) {
    erro.textContent = msg;
    erro.hidden = false;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    erro.hidden = true;

    var email = document.getElementById('usuario').value.trim();
    var senha = document.getElementById('senha').value;
    if (!email || !senha) { mostraErro('Preencha e-mail e senha.'); return; }
    if (!window.AeroPrevSB) { mostraErro('Não foi possível iniciar. Recarregue a página.'); return; }

    var bt = form.querySelector('button');
    var rotulo = bt.textContent;
    bt.disabled = true;
    bt.textContent = 'Entrando…';

    AeroPrevSB.entrar(email, senha).then(function () {
      var destino = new URLSearchParams(location.search).get('de');
      location.replace(destino && destino.charAt(0) === '/' ? destino : 'admin');
    }).catch(function (e) {
      var msg = /invalid login|credentials/i.test(e.message || '')
        ? 'E-mail ou senha incorretos.'
        : (e.message || 'Não foi possível entrar.');
      mostraErro(msg);
      document.getElementById('senha').value = '';
      bt.disabled = false;
      bt.textContent = rotulo;
    });
  });
})();
