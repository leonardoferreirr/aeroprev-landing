#!/usr/bin/env python3
"""Gera a versao de producao em dist/.

O CSS entra inline no HTML para eliminar a requisicao que bloqueia a
renderizacao (era o que segurava o LCP). O JS continua externo, ja com defer,
so que minificado. Rode antes de cada deploy:

    python3 build.py
"""
import os, re, shutil, subprocess, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(RAIZ, 'dist')
PAGINAS = ['index.html', 'privacidade.html', 'termos.html']


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

    # javascript minificado
    os.makedirs(os.path.join(DIST, 'assets/js'), exist_ok=True)
    total_js = 0
    for arq in sorted(os.listdir(os.path.join(RAIZ, 'assets/js'))):
        if not arq.endswith('.js'):
            continue
        antes = os.path.getsize(os.path.join(RAIZ, 'assets/js', arq))
        depois = minifica_js(os.path.join(RAIZ, 'assets/js', arq),
                             os.path.join(DIST, 'assets/js', arq))
        total_js += depois
        print(f'  js  {arq:<18} {antes/1024:6.1f} -> {depois/1024:6.1f} KB')

    css = minifica_css(open(os.path.join(RAIZ, 'assets/css/site.css')).read())
    # o CSS vai para dentro do HTML, na raiz: os caminhos relativos a
    # assets/css/ precisam ser reescritos, senao as fontes caem em /fonts/
    css = css.replace("url('../", "url('assets/").replace('url("../', 'url("assets/').replace('url(../', 'url(assets/')
    print(f'  css site.css          {os.path.getsize(os.path.join(RAIZ, "assets/css/site.css"))/1024:6.1f} -> {len(css)/1024:6.1f} KB')

    for pagina in PAGINAS:
        caminho = os.path.join(RAIZ, pagina)
        if not os.path.exists(caminho):
            continue
        html = open(caminho).read()
        html = html.replace(
            '<link rel="stylesheet" href="assets/css/site.css">',
            '<style>' + css + '</style>')
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


if __name__ == '__main__':
    print('gerando dist/')
    build()
