/* AeroPrev — cliente Supabase mínimo para o painel do escritório.
   Sem SDK, só fetch. Faz login por e-mail/senha (Supabase Auth), guarda a
   sessão, renova o token sozinho, lê a tabela autenticado e gera links
   temporários para baixar os anexos do bucket privado.

   A chave abaixo é publishable (pública por projeto): a proteção do painel vem
   do login (só e-mails que o escritório cadastrar entram) e das políticas RLS
   do banco. A chave secreta nunca entra aqui. */
(function () {
  'use strict';

  var URL_BASE = 'https://loqnkkhmhupwzjltvocb.supabase.co';
  var KEY = 'sb_publishable_lEH8Z0JSzkScjqL-fqfONg_UqWrFQkG';
  var BUCKET = 'documentos';
  var SKEY = 'aeroprev-sb-sessao';

  function ler() {
    try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; }
  }
  function grava(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
  function limpa() { try { localStorage.removeItem(SKEY); } catch (e) {} }

  function guardaTokens(d) {
    var s = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      // 1 minuto de folga para renovar antes de expirar de fato
      expira_em: Date.now() + ((d.expires_in || 3600) * 1000) - 60000,
      email: d.user && d.user.email
    };
    grava(s);
    return s;
  }

  function entrar(email, senha) {
    return fetch(URL_BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim(), password: senha })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error_description || d.msg || d.error || 'Não foi possível entrar.');
        return guardaTokens(d);
      });
    });
  }

  function renova() {
    var s = ler();
    if (!s || !s.refresh_token) return Promise.reject(new Error('sem sessão'));
    return fetch(URL_BASE + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) {
      if (!r.ok) { limpa(); throw new Error('sessão expirada'); }
      return r.json().then(guardaTokens);
    });
  }

  function token() {
    var s = ler();
    if (!s || !s.access_token) return Promise.reject(new Error('sem sessão'));
    if (Date.now() < s.expira_em) return Promise.resolve(s.access_token);
    return renova().then(function (s2) { return s2.access_token; });
  }

  /* fetch autenticado contra a API do projeto. Renova o token uma vez se o
     servidor devolver 401 (token revogado ou expirado no limite). */
  function api(path, opts) {
    opts = opts || {};
    return token().then(function (tok) {
      var h = Object.assign({ apikey: KEY, Authorization: 'Bearer ' + tok }, opts.headers || {});
      return fetch(URL_BASE + path, Object.assign({}, opts, { headers: h })).then(function (r) {
        if (r.status !== 401) return r;
        return renova().then(function (s2) {
          var h2 = Object.assign({ apikey: KEY, Authorization: 'Bearer ' + s2.access_token }, opts.headers || {});
          return fetch(URL_BASE + path, Object.assign({}, opts, { headers: h2 }));
        });
      });
    });
  }

  /* link temporário para baixar um anexo do bucket privado.
     caminho = "documentos/uuid/campo/arquivo.pdf" (com ou sem o nome do bucket). */
  function urlAssinada(caminho, segundos) {
    var rel = caminho.indexOf(BUCKET + '/') === 0 ? caminho.slice(BUCKET.length + 1) : caminho;
    var alvo = '/storage/v1/object/sign/' + BUCKET + '/' + rel.split('/').map(encodeURIComponent).join('/');
    return api(alvo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: segundos || 120 })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok || !d.signedURL) throw new Error('Não foi possível gerar o link do arquivo.');
        return URL_BASE + '/storage/v1' + d.signedURL;
      });
    });
  }

  /* apaga um cadastro inteiro: primeiro os anexos do bucket, depois a linha.
     Nessa ordem de propósito: se a remoção dos arquivos falhar, o cadastro
     continua no painel e dá para tentar de novo. O contrário deixaria PDFs
     órfãos sem nenhuma tela que os alcance. */
  function excluir(id, caminhos) {
    var lista = (caminhos || []).map(function (c) {
      var s = String(c || '');
      return s.indexOf(BUCKET + '/') === 0 ? s.slice(BUCKET.length + 1) : s;
    }).filter(Boolean);

    var anexos = lista.length
      ? api('/storage/v1/object/' + BUCKET, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: lista })
        }).then(function (r) {
          if (!r.ok) throw new Error('Não foi possível apagar os anexos (HTTP ' + r.status + ').');
        })
      : Promise.resolve();

    return anexos.then(function () {
      return api('/rest/v1/submissoes?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' }
      }).then(function (r) {
        if (!r.ok) throw new Error('Não foi possível apagar o cadastro (HTTP ' + r.status + ').');
        return r.json().then(function (d) {
          // o RLS recusa em silêncio devolvendo lista vazia, e não um erro:
          // sem esta checagem o painel diria "excluído" com a linha ainda lá
          if (!Array.isArray(d) || !d.length) {
            throw new Error('O banco recusou a exclusão. Rode o SQL de docs/liberar-exclusao.sql no Supabase para liberar a permissão.');
          }
          return d[0];
        });
      });
    });
  }

  function sair() {
    var s = ler();
    limpa();
    if (s && s.access_token) {
      fetch(URL_BASE + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token }
      }).catch(function () {});
    }
  }

  window.AeroPrevSB = {
    entrar: entrar,
    sair: sair,
    api: api,
    urlAssinada: urlAssinada,
    excluir: excluir,
    temSessao: function () { var s = ler(); return !!(s && s.access_token); },
    email: function () { var s = ler(); return s && s.email; }
  };
})();
