#!/usr/bin/env python3
"""Gera a versao de producao em dist/.

O CSS entra inline no HTML para eliminar a requisicao que bloqueia a
renderizacao (era o que segurava o LCP). O JS continua externo, ja com defer,
so que minificado. Rode antes de cada deploy:

    python3 build.py
"""
import os, re, shutil, subprocess, sys, hashlib

RAIZ = os.getcwd() if '--somente-dist' in sys.argv else os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(RAIZ, 'dist')
# cada pagina com a folha que deve entrar inline nela
PAGINAS = {
    'index.html': 'site.css',
    'privacidade.html': 'site.css',
    'termos.html': 'site.css',
    'admin.html': 'admin.css',
    'login.html': 'admin.css',
}


def minifica_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)          # comentarios
    css = re.sub(r'\s*\n\s*', '', css)                        # quebras
    css = re.sub(r'\s{2,}', ' ', css)
    css = re.sub(r'\s*([{}:;,>~])\s*', r'\1', css)
    css = re.sub(r';}', '}', css)
    return css.strip()


def minifica_js(caminho, destino):
    """Usa terser quando disponivel; senao copia o arquivo intacto."""
    try:
        r = subprocess.run(
            ['npx', '--yes', 'terser', caminho, '-c', '-m', '--comments', 'false'],
            capture_output=True, text=True, timeout=120)
        if r.returncode == 0 and len(r.stdout) > 200:
            open(destino, 'w').write(r.stdout)
            return len(r.stdout)
    except Exception:
        pass
    shutil.copy2(caminho, destino)
    return os.path.getsize(destino)


def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    # assets estaticos
    for sub in ['assets/fonts', 'assets/img']:
        origem = os.path.join(RAIZ, sub)
        if os.path.isdir(origem):
            shutil.copytree(origem, os.path.join(DIST, sub))

    # javascript minificado. Os arquivos em /assets sao servidos com cache
    # immutable de 1 ano; como o nome nao muda, uma correcao nunca chegaria a
    # quem ja abriu a pagina. Por isso carimbamos cada JS com um hash do
    # conteudo (?v=...) e reescrevemos as referencias no HTML: muda o arquivo,
    # muda a URL, o navegador busca de novo.
    os.makedirs(os.path.join(DIST, 'assets/js'), exist_ok=True)
    total_js = 0
    versao_js = {}
    for arq in sorted(os.listdir(os.path.join(RAIZ, 'assets/js'))):
        if not arq.endswith('.js'):
            continue
        antes = os.path.getsize(os.path.join(RAIZ, 'assets/js', arq))
        destino = os.path.join(DIST, 'assets/js', arq)
        depois = minifica_js(os.path.join(RAIZ, 'assets/js', arq), destino)
        versao_js[arq] = hashlib.md5(open(destino, 'rb').read()).hexdigest()[:8]
        total_js += depois
        print(f'  js  {arq:<18} {antes/1024:6.1f} -> {depois/1024:6.1f} KB')

    def prepara_css(nome):
        caminho = os.path.join(RAIZ, 'assets/css', nome)
        if not os.path.exists(caminho):
            return None
        bruto = open(caminho).read()
        # @import inline vira uma requisicao a mais; resolve aqui
        def resolve(m):
            alvo = os.path.normpath(os.path.join(RAIZ, 'assets/css', m.group(1)))
            return open(alvo).read() if os.path.exists(alvo) else ''
        bruto = re.sub(r"@import\s+url\(['\"]?([^'\")]+)['\"]?\);", resolve, bruto)
        pronto = minifica_css(bruto)
        # o CSS vai para dentro do HTML, na raiz: os caminhos relativos a
        # assets/css/ precisam ser reescritos, senao as fontes caem em /fonts/
        pronto = (pronto.replace("url('../", "url('assets/")
                        .replace('url("../', 'url("assets/')
                        .replace('url(../', 'url(assets/'))
        print(f'  css {nome:<18} {os.path.getsize(caminho)/1024:6.1f} -> {len(pronto)/1024:6.1f} KB')
        return pronto

    folhas = {n: prepara_css(n) for n in sorted(set(PAGINAS.values()))}

    for pagina, folha in PAGINAS.items():
        caminho = os.path.join(RAIZ, pagina)
        if not os.path.exists(caminho) or not folhas.get(folha):
            continue
        html = open(caminho).read()
        html = html.replace(
            '<link rel="stylesheet" href="assets/css/' + folha + '">',
            '<style>' + folhas[folha] + '</style>')
        # carimba cada <script src="assets/js/X.js"> com o hash do conteudo,
        # pra furar o cache immutable quando o arquivo muda
        def versiona(m):
            nome = m.group(1)
            v = versao_js.get(nome)
            return 'assets/js/' + nome + ('?v=' + v if v else '')
        html = re.sub(r'assets/js/([\w.-]+\.js)', versiona, html)
        # comentarios de secao nao precisam ir para producao
        html = re.sub(r'\n?<!--\s*=+.*?=+\s*-->', '', html, flags=re.S)
        html = re.sub(r'\n{3,}', '\n\n', html)
        open(os.path.join(DIST, pagina), 'w').write(html)
        print(f'  html {pagina:<18} {os.path.getsize(caminho)/1024:6.1f} -> {len(html)/1024:6.1f} KB')

    for extra in ['robots.txt', 'sitemap.xml', 'vercel.json']:
        o = os.path.join(RAIZ, extra)
        if os.path.exists(o):
            shutil.copy2(o, os.path.join(DIST, extra))

    tot = sum(os.path.getsize(os.path.join(r, f))
              for r, _, fs in os.walk(DIST) for f in fs)
    print(f'\ndist/ pronto: {tot/1024:.0f} KB no total')




def build_completo():
    """Gera publico/: a v1 na raiz e a v2 (tema escuro) em /v2."""
    import subprocess
    PUB = os.path.join(RAIZ, 'publico')
    build()                                    # gera dist/ da v1
    if os.path.isdir(PUB):
        shutil.rmtree(PUB)
    shutil.copytree(DIST, PUB)

    v2 = os.path.join(RAIZ, 'v2')
    if os.path.isdir(v2):
        print('\ngerando v2/ (tema escuro)')
        r = subprocess.run([sys.executable, os.path.abspath(__file__), '--somente-dist'],
                           cwd=v2, capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip()[-400:])
        v2dist = os.path.join(v2, 'dist')
        if os.path.isdir(v2dist):
            shutil.copytree(v2dist, os.path.join(PUB, 'v2'))

    for extra in ['vercel.json']:
        o = os.path.join(RAIZ, extra)
        if os.path.exists(o):
            shutil.copy2(o, os.path.join(PUB, extra))
    tot = sum(os.path.getsize(os.path.join(r, f))
              for r, _, fs in os.walk(PUB) for f in fs)
    print(f'\npublico/ pronto: {tot/1024:.0f} KB (v1 na raiz, v2 em /v2)')


if __name__ == '__main__':
    if '--somente-dist' in sys.argv:
        print('gerando dist/')
        build()
    else:
        build_completo()
