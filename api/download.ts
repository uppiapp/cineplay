/**
 * CinePlay Official App Downloader — Vercel Edge Runtime
 *
 * Entrega os downloads oficiais dos aplicativos CinePlay para Windows, TV Box,
 * Celular, Mac, Roku e Linux sem expor repositórios antigos e nomeando os arquivos
 * diretamente com o nome da marca (CinePlay-Windows.zip, CinePlayTV.apk, etc.).
 */

export const config = {
  runtime: 'edge',
};

const ARQUIVOS: Record<string, { upstream: string; nome: string }> = {
  windows: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV-Windows.zip',
    nome: 'CinePlay-Windows.zip',
  },
  tvbox: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV.apk',
    nome: 'CinePlayTV.apk',
  },
  cell: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoCell.apk',
    nome: 'CinePlayCell.apk',
  },
  celular: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoCell.apk',
    nome: 'CinePlayCell.apk',
  },
  mac: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV.dmg',
    nome: 'CinePlay.dmg',
  },
  roku: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV-Roku.zip',
    nome: 'CinePlay-Roku.zip',
  },
  samsung: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV-Samsung.wgt',
    nome: 'CinePlay-Samsung.wgt',
  },
  lg: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV-LG.ipk',
    nome: 'CinePlay-LG.ipk',
  },
  linux: {
    upstream: 'https://github.com/SaimoTV/saimo-downloads/releases/latest/download/SaimoTV-Linux-x86_64.AppImage',
    nome: 'CinePlay-Linux-x86_64.AppImage',
  },
};

export default async function handler(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const appId = (reqUrl.searchParams.get('app') || reqUrl.searchParams.get('plataforma') || 'windows').toLowerCase();
  const item = ARQUIVOS[appId] || ARQUIVOS.windows;

  try {
    const upstreamRes = await fetch(item.upstream, {
      method: request.method,
      redirect: 'follow',
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'CinePlay/3.3.2',
        Accept: '*/*',
      },
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Erro ao buscar download: ${upstreamRes.statusText}`, { status: upstreamRes.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstreamRes.headers.get('content-type') || 'application/octet-stream');
    const tamanho = upstreamRes.headers.get('content-length');
    if (tamanho) headers.set('Content-Length', tamanho);
    headers.set('Content-Disposition', `attachment; filename="${item.nome}"`);
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response('Erro ao iniciar download', { status: 502 });
  }
}
