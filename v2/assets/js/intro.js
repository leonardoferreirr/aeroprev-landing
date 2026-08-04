/* AeroPrev — abertura da marca.
   O escudo se forma, o circulo se traca, o aviao entra deixando o rastro nascer
   atras dele, o wordmark revela e a regua fecha. Tudo em rAF, sem dependencia. */
(function () {
  'use strict';

  var root = document.getElementById('abertura');
  if (!root) return;

  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var jaViu = false;
  try { jaViu = sessionStorage.getItem('ap-abertura') === '1'; } catch (e) {}

  var el = {
    escudo:  document.getElementById('wipe-escudo'),
    circulo: document.getElementById('wipe-circulo'),
    trilhas: document.getElementById('wipe-trilhas'),
    aero:    document.getElementById('wipe-aero'),
    prev:    document.getElementById('wipe-prev'),
    aviao:   document.getElementById('lg-g-aviao'),
    regua:   document.getElementById('lg-g-regua'),
    marca:   root.querySelector('.marca')
  };

  /* ---- coreografia (segundos) ---- */
  var T = {
    escudo:  [0.04, 0.78],
    circulo: [0.40, 1.52],
    aviao:   [0.90, 2.14],
    aero:    [2.02, 2.50],
    prev:    [2.15, 2.63],
    regua:   [2.44, 2.78]
  };
  var DUR = 2.84;

  var CIRC = 2 * Math.PI * 207;      // circunferencia do traco do circulo
  var AVIAO_CX = 773.5;
  var VOO = [[-1180, 440], [-880, 320], [-380, 108], [0, 0]];  // bezier de entrada

  /* ---- utilidades ---- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function outQuad(t) { return 1 - Math.pow(1 - t, 2); }
  function inOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function bezier(p, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
            a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  }

  /* ---- render de um frame no tempo t ---- */
  function seek(t) {
    // escudo: cresce de cima para baixo
    var e = outCubic(seg(t, T.escudo[0], T.escudo[1]));
    el.escudo.style.transform = 'scaleY(' + e + ')';

    // circulo: traco desenhado no sentido horario a partir da esquerda
    var c = inOutCubic(seg(t, T.circulo[0], T.circulo[1]));
    el.circulo.style.strokeDashoffset = (CIRC * (1 - c)).toFixed(1);

    // aviao: entra pela esquerda-baixo numa curva, cabrando ate assentar
    var pa = seg(t, T.aviao[0], T.aviao[1]);
    var pe = outQuad(pa);
    var pos = bezier(VOO, pe);
    var esc = (0.72 + 0.28 * pe) * (1 + 0.022 * Math.sin(Math.PI * clamp((pa - 0.72) / 0.28, 0, 1)));
    var rot = 10 * (1 - outCubic(pa));
    el.aviao.style.opacity = pa > 0 ? clamp(pa * 12, 0, 1) : 0;
    el.aviao.style.transform =
      'translate(' + pos[0].toFixed(1) + 'px,' + pos[1].toFixed(1) + 'px) ' +
      'rotate(' + rot.toFixed(2) + 'deg) scale(' + esc.toFixed(3) + ')';

    // trilhas: nascem atras do aviao, a borda do wipe segue a cauda
    var xCauda = AVIAO_CX + pos[0] - 115;
    el.trilhas.style.transform = 'scaleX(' + clamp((xCauda - 300) / 400, 0, 1).toFixed(4) + ')';

    // wordmark: revela da esquerda para a direita
    el.aero.style.transform = 'scaleX(' + outCubic(seg(t, T.aero[0], T.aero[1])).toFixed(4) + ')';
    el.prev.style.transform = 'scaleX(' + outCubic(seg(t, T.prev[0], T.prev[1])).toFixed(4) + ')';

    // regua
    el.regua.style.transform = 'scaleX(' + outCubic(seg(t, T.regua[0], T.regua[1])).toFixed(4) + ')';
  }

  /* ---- ciclo ---- */
  var inicio = null, rodando = false, encerrada = false;

  function quadro(ts) {
    if (inicio === null) inicio = ts;
    var t = (ts - inicio) / 1000;
    seek(Math.min(t, DUR));
    if (t < DUR) requestAnimationFrame(quadro);
    else sair();
  }

  function sair() {
    if (encerrada) return;
    encerrada = true;
    try { sessionStorage.setItem('ap-abertura', '1'); } catch (e) {}
    root.classList.add('saindo');
    document.documentElement.classList.remove('travado');
    document.documentElement.classList.add('entrou');
    setTimeout(function () { root.remove(); }, 680);
  }

  function pular() {
    if (encerrada) return;
    seek(DUR);
    sair();
  }

  if (reduzido || jaViu) {
    seek(DUR);
    document.documentElement.classList.remove('travado');
    document.documentElement.classList.add('entrou');
    root.remove();
    return;
  }

  seek(0);
  document.documentElement.classList.add('travado');
  requestAnimationFrame(function (ts) { rodando = true; inicio = ts; quadro(ts); });

  root.addEventListener('click', pular);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') pular();
  }, { once: true });

  // usado pelo harness de teste para capturar quadros deterministicos
  window.__introSeek = seek;
})();
