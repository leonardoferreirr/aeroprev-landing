/* AeroPrev — comportamento do site: cabecalho, menu, revelacoes, perguntas. */
(function () {
  'use strict';

  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- cabecalho: fixa ao rolar, esconde ao descer ---------- */
  var topo = document.getElementById('topo');
  var ultimo = 0, travaTopo = false;

  function aoRolar() {
    var y = window.scrollY;
    topo.classList.toggle('fixo', y > 24);
    if (!travaTopo) {
      var descendo = y > ultimo && y > 320;
      topo.classList.toggle('escondido', descendo);
    }
    ultimo = y;
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* ---------- menu no celular ---------- */
  var menuBt = document.getElementById('menu-bt');
  var menu = document.getElementById('menu-movel');

  function fechaMenu() {
    menu.classList.remove('aberto');
    menuBt.setAttribute('aria-expanded', 'false');
    menuBt.setAttribute('aria-label', 'Abrir menu');
    document.documentElement.classList.remove('travado');
    travaTopo = false;
  }

  menuBt.addEventListener('click', function () {
    var abrindo = !menu.classList.contains('aberto');
    menu.classList.toggle('aberto', abrindo);
    menuBt.setAttribute('aria-expanded', String(abrindo));
    menuBt.setAttribute('aria-label', abrindo ? 'Fechar menu' : 'Abrir menu');
    document.documentElement.classList.toggle('travado', abrindo);
    travaTopo = abrindo;
    if (abrindo) {
      topo.classList.remove('escondido');
      [].forEach.call(menu.querySelectorAll('a'), function (a, i) {
        a.style.animationDelay = (0.06 + i * 0.055) + 's';
      });
    }
  });
  menu.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) fechaMenu();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && menu.classList.contains('aberto')) fechaMenu();
  });

  /* ---------- rolagem suave com folga para o cabecalho ---------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var alvo = document.querySelector(id);
    if (!alvo) return;
    ev.preventDefault();
    var folga = topo.offsetHeight + 14;
    var y = alvo.getBoundingClientRect().top + window.scrollY - folga;
    window.scrollTo({ top: y, behavior: reduzido ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------- revelacoes na entrada ---------- */
  var alvos = document.querySelectorAll('.sobe, .escreve');
  if (reduzido || !('IntersectionObserver' in window)) {
    [].forEach.call(alvos, function (el) { el.classList.add('visivel'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    [].forEach.call(alvos, function (el) { obs.observe(el); });

    // o hero entra assim que a abertura sai, sem depender de rolagem
    var entrarHero = function () {
      [].forEach.call(document.querySelectorAll('.hero .sobe, .hero .escreve'), function (el, i) {
        setTimeout(function () { el.classList.add('visivel'); }, 90 + i * 110);
      });
    };
    if (document.documentElement.classList.contains('entrou')) entrarHero();
    else {
      var esperaAbertura = new MutationObserver(function () {
        if (document.documentElement.classList.contains('entrou')) {
          esperaAbertura.disconnect();
          entrarHero();
        }
      });
      esperaAbertura.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- entrada em sequencia dentro dos grids ---------- */
  ['.passos', '.docs', '.pilares', '.publico', '.hero-selos', '.chamada-passos'].forEach(function (sel) {
    [].forEach.call(document.querySelectorAll(sel), function (grade) {
      [].forEach.call(grade.children, function (filho, i) {
        filho.style.setProperty('--i', i);
      });
      grade.classList.add('cascata');
    });
  });

  /* ---------- parallax: um unico rAF lendo o scroll uma vez ---------- */
  if (!reduzido) {
    var camadas = [];
    [].forEach.call(document.querySelectorAll('[data-parallax]'), function (n) {
      camadas.push({ n: n, k: parseFloat(n.getAttribute('data-parallax')) || 0.1, r: n.getAttribute('data-gira') === '' ? 1 : 0 });
    });

    if (camadas.length) {
      var alvoY = 0, atualY = 0, rodando = false;

      function passo() {
        atualY += (alvoY - atualY) * 0.09;
        camadas.forEach(function (c) {
          var caixa = c.n.parentElement.getBoundingClientRect();
          var centro = caixa.top + caixa.height / 2 - window.innerHeight / 2;
          var d = -centro * c.k;
          c.n.style.transform = 'translate3d(0,' + d.toFixed(1) + 'px,0)' +
            (c.r ? ' rotate(' + (d * 0.014).toFixed(2) + 'deg)' : '');
        });
        if (Math.abs(alvoY - atualY) > 0.4) requestAnimationFrame(passo);
        else rodando = false;
      }

      function agenda() {
        alvoY = window.scrollY;
        if (!rodando) { rodando = true; requestAnimationFrame(passo); }
      }
      window.addEventListener('scroll', agenda, { passive: true });
      window.addEventListener('resize', agenda, { passive: true });
      agenda();
    }
  }

  /* ---------- perguntas frequentes ---------- */
  [].forEach.call(document.querySelectorAll('.faq-bt'), function (bt) {
    bt.addEventListener('click', function () {
      var item = bt.closest('.faq-item');
      var abrindo = !item.classList.contains('aberto');
      var grupo = item.parentElement;
      [].forEach.call(grupo.querySelectorAll('.faq-item.aberto'), function (o) {
        o.classList.remove('aberto');
        o.querySelector('.faq-bt').setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('aberto', abrindo);
      bt.setAttribute('aria-expanded', String(abrindo));
    });
  });

  /* ---------- mascara de telefone ---------- */
  window.mascaraTelefone = function (campo) {
    campo.addEventListener('input', function () {
      var d = campo.value.replace(/\D/g, '').slice(0, 11);
      var v = d;
      if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 6) {
        var corte = d.length > 10 ? 7 : 6;
        v = '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte);
      }
      campo.value = v;
    });
  };
  [].forEach.call(document.querySelectorAll('input[type=tel]'), window.mascaraTelefone);
})();
