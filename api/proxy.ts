/**
 * CinePlay Official Streaming Proxy — Vercel Edge Runtime
 *
 * Proxy de alta performance executado diretamente na borda (Edge) da Vercel.
 * Transforma transmissões HTTP e HTTPS em streaming seguro com CORS irrestrito (*),
 * reescreve manifestos HLS (.m3u8) e DASH (.mpd), envia cabeçalhos Referer/User-Agent
 * para CDNs protegidos e fornece streaming contínuo sem depender de servidores externos.
 */

export const config = {
  runtime: 'edge',
};

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization, X-Requested-With',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified',
};

function copyStreamingHeaders(from: Headers, to: Headers): void {
  const headersToCopy = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
  ];
  for (const h of headersToCopy) {
    if (from.has(h)) to.set(h, from.get(h)!);
  }
}

function isM3u8(url: string, contentType: string): boolean {
  return (
    url.includes('.m3u8') ||
    url.toLowerCase().split('?')[0].endsWith('.txt') ||
    contentType.includes('application/vnd.apple.mpegurl') ||
    contentType.includes('application/x-mpegurl') ||
    contentType.includes('audio/mpegurl')
  );
}

function isMpd(url: string, contentType: string): boolean {
  return url.includes('.mpd') || contentType.includes('application/dash+xml');
}

function resolveUrl(uri: string, base: string): string {
  try {
    return new URL(uri, base).href;
  } catch {
    return uri;
  }
}

export function fixNestedPath(manifestUrl: string, requestUrl: string): string {
  let manifest: URL;
  let request: URL;
  try {
    manifest = new URL(manifestUrl);
    request = new URL(requestUrl);
  } catch {
    return requestUrl;
  }

  if (request.pathname === manifest.pathname) return requestUrl;
  if (manifest.protocol !== request.protocol || manifest.host !== request.host) {
    return requestUrl;
  }

  const rawQuery = manifest.search.startsWith('?') ? manifest.search.slice(1) : manifest.search;
  const nestedValue = rawQuery
    .split('&')
    .find((part) => part.startsWith('url='))
    ?.slice('url='.length);
  if (!nestedValue) return requestUrl;

  let nestedPath: string;
  try {
    nestedPath = new URL(decodeURIComponent(nestedValue)).pathname;
  } catch {
    return requestUrl;
  }

  const manifestDir = manifest.pathname.slice(0, manifest.pathname.lastIndexOf('/') + 1);
  const nestedDir = nestedPath.slice(0, nestedPath.lastIndexOf('/') + 1);
  if (!manifestDir || !nestedDir) return requestUrl;
  if (!request.pathname.startsWith(manifestDir)) return requestUrl;

  const corrected = nestedDir + request.pathname.slice(manifestDir.length);
  return `${request.protocol}//${request.host}${corrected}${request.search}${request.hash}`;
}

function proxied(
  absolute: string,
  proxyOrigin: string,
  referer: string | null,
  ua: string | null,
): string {
  let out = `${proxyOrigin}/api/proxy?url=${encodeURIComponent(absolute)}`;
  if (referer) out += `&referer=${encodeURIComponent(referer)}`;
  if (ua) out += `&ua=${encodeURIComponent(ua)}`;
  return out;
}

function proxiedTemplate(
  absolute: string,
  proxyOrigin: string,
  referer: string | null,
  ua: string | null,
): string {
  return proxied(absolute, proxyOrigin, referer, ua).replace(/%24/g, '$');
}

export function rewriteM3u8(
  content: string,
  manifestUrl: string,
  proxyOrigin: string,
  referer: string | null,
  ua: string | null,
): string {
  const wrap = (uri: string): string => {
    const abs = fixNestedPath(manifestUrl, resolveUrl(uri, manifestUrl));
    return proxied(abs, proxyOrigin, referer, ua);
  };

  return content
    .split('\n')
    .map((line) => {
      const withUri = line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${wrap(uri)}"`);
      if (withUri.startsWith('#')) return withUri;
      const trimmed = withUri.trim();
      if (!trimmed) return withUri;
      return wrap(trimmed);
    })
    .join('\n');
}

export function rewriteMpd(
  content: string,
  manifestUrl: string,
  proxyOrigin: string,
  referer: string | null,
  ua: string | null,
): string {
  const unescapeXml = (value: string): string =>
    value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

  const baseMatch = content.match(/<BaseURL[^>]*>([\s\S]*?)<\/BaseURL>/);
  const base = baseMatch ? resolveUrl(unescapeXml(baseMatch[1].trim()), manifestUrl) : manifestUrl;

  let out = content.replace(/<BaseURL[^>]*>[\s\S]*?<\/BaseURL>\s*/g, '');

  out = out.replace(
    /\b(initialization|media|sourceURL)="([^"]+)"/g,
    (match, attr: string, raw: string) => {
      const value = unescapeXml(raw);
      if (!value.trim()) return match;
      const placeholders: string[] = [];
      const masked = value.replace(/\$[^$]*\$/g, (token) => {
        placeholders.push(token);
        return `__DASHTOK${placeholders.length - 1}__`;
      });
      let abs = resolveUrl(masked, base);
      abs = abs.replace(/__DASHTOK(\d+)__/g, (_m, i: string) => placeholders[Number(i)]);
      const url = proxiedTemplate(abs, proxyOrigin, referer, ua);
      return `${attr}="${url.replace(/&/g, '&amp;')}"`;
    },
  );

  return out;
}

const LIMITE_LISTA = 30 * 1024 * 1024;

async function baixarListaCrua(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  const erro = (status: number, mensagem: string) =>
    new Response(JSON.stringify({ error: mensagem }), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20', Accept: '*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok || !r.body) return erro(502, `A lista respondeu ${r.status}`);
    const leitor = r.body.getReader();
    const pedacos: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_LISTA) {
        leitor.cancel().catch(() => {});
        return erro(413, 'A lista passa de 30 MB');
      }
      pedacos.push(value);
    }
    const corpo = new Uint8Array(total);
    let ponto = 0;
    for (const p of pedacos) {
      corpo.set(p, ponto);
      ponto += p.byteLength;
    }
    return new Response(corpo, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...CORS_HEADERS },
    });
  } catch {
    return erro(502, 'Não consegui baixar a lista');
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const reqUrl = new URL(request.url);
  const videoUrl = reqUrl.searchParams.get('url');
  const referer = reqUrl.searchParams.get('referer');
  const ua = reqUrl.searchParams.get('ua');

  if (!videoUrl) {
    return new Response(JSON.stringify({ status: 'ok', service: 'cineplay-proxy' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const decodedUrl = videoUrl;

    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return new Response(JSON.stringify({ error: 'Invalid URL protocol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (reqUrl.searchParams.get('raw') === '1') {
      return await baixarListaCrua(decodedUrl);
    }

    const parsedOrigin = new URL(decodedUrl);
    const effectiveReferer = referer || `${parsedOrigin.protocol}//${parsedOrigin.hostname}/`;
    const refererOrigin = (() => {
      try {
        return new URL(effectiveReferer).origin;
      } catch {
        return `${parsedOrigin.protocol}//${parsedOrigin.hostname}`;
      }
    })();

    const clientHeaders: Record<string, string> = {
      'User-Agent': ua || DEFAULT_UA,
      Referer: effectiveReferer,
      Origin: refererOrigin,
      Accept: '*/*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) clientHeaders['Range'] = rangeHeader;

    const originalReferer = clientHeaders['Referer'];
    const originalOrigin = clientHeaders['Origin'];

    let currentUrl = decodedUrl;
    let finalResponse: Response | null = null;
    const maxRedirects = 15;

    for (let i = 0; i < maxRedirects; i++) {
      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: clientHeaders,
          redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
          const locationHeader = response.headers.get('location')!;
          try { await response.body?.cancel(); } catch { /* corpo descartado */ }

          currentUrl = resolveUrl(locationHeader, currentUrl);
          const setCookie = response.headers.get('set-cookie');
          if (setCookie) {
            const existingCookie = clientHeaders['Cookie'] || '';
            clientHeaders['Cookie'] = existingCookie ? `${existingCookie}; ${setCookie}` : setCookie;
          }

          clientHeaders['Referer'] = originalReferer;
          clientHeaders['Origin'] = originalOrigin;
          continue;
        }

        finalResponse = response;
        break;
      } catch {
        if (i < 2) continue;
        throw new Error(`Failed to connect to ${currentUrl}`);
      }
    }

    if (!finalResponse) {
      return new Response(JSON.stringify({ error: 'Too many redirects or fetch failures' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    for (let i = 0; finalResponse.status >= 500 && i < 2; i++) {
      try { await finalResponse.body?.cancel(); } catch { /* corpo descartado */ }
      await new Promise((pronto) => setTimeout(pronto, 300));
      try {
        finalResponse = await fetch(currentUrl, { method: 'GET', headers: clientHeaders });
      } catch {
        break;
      }
    }

    if (finalResponse.status === 403 || finalResponse.status === 404) {
      const strategies: Array<Record<string, string>> = [
        {
          'User-Agent': clientHeaders['User-Agent'],
          Referer: originalReferer,
          Accept: '*/*',
          ...(clientHeaders['Cookie'] ? { Cookie: clientHeaders['Cookie'] } : {}),
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
        {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
        {
          'User-Agent': 'Lavf/58.29.100',
          Accept: '*/*',
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
        { ...(rangeHeader ? { Range: rangeHeader } : {}) },
      ];

      for (const headers of strategies) {
        try {
          const retry = await fetch(currentUrl, { method: 'GET', headers });
          if (retry.ok || retry.status === 206) {
            finalResponse = retry;
            break;
          }
          await retry.body?.cancel();
        } catch { /* próxima */ }
      }
    }

    const contentType = finalResponse.headers.get('content-type') || '';
    let manifestHls = isM3u8(currentUrl, contentType);
    const manifestDash = isMpd(currentUrl, contentType);
    let hlsText: string | null = null;

    if (!manifestHls && contentType.toLowerCase().includes('text/plain')) {
      const candidato = await finalResponse.clone().text();
      if (candidato.trimStart().startsWith('#EXTM3U')) {
        manifestHls = true;
        hlsText = candidato;
      }
    }

    // Se a mídia já tiver CORS liberado, podemos responder ou redirecionar
    if (
      !manifestHls &&
      !manifestDash &&
      currentUrl.startsWith('https://') &&
      !referer &&
      finalResponse.headers.get('access-control-allow-origin')
    ) {
      try { await finalResponse.body?.cancel(); } catch { /* corpo descartado */ }
      return new Response(null, {
        status: 302,
        headers: { Location: currentUrl, 'Cache-Control': 'no-store', ...CORS_HEADERS },
      });
    }

    if (!finalResponse.ok && finalResponse.status !== 206) {
      return new Response(JSON.stringify({
        error: `Failed to fetch: ${finalResponse.statusText}`,
        status: finalResponse.status,
      }), {
        status: finalResponse.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const proxyOrigin = reqUrl.origin;
    const childReferer = referer ?? `${new URL(currentUrl).origin}/`;

    if (manifestHls) {
      const text = hlsText ?? await finalResponse.text();
      return new Response(rewriteM3u8(text, currentUrl, proxyOrigin, childReferer, ua), {
        status: finalResponse.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          ...CORS_HEADERS,
        },
      });
    }

    if (manifestDash) {
      const text = await finalResponse.text();
      return new Response(rewriteMpd(text, currentUrl, proxyOrigin, referer, ua), {
        status: finalResponse.status,
        headers: {
          'Content-Type': 'application/dash+xml',
          'Cache-Control': 'no-store',
          ...CORS_HEADERS,
        },
      });
    }

    const responseHeaders = new Headers(CORS_HEADERS);
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    responseHeaders.set('Accept-Ranges', 'bytes');
    copyStreamingHeaders(finalResponse.headers, responseHeaders);

    const cleanPath = currentUrl.split('?')[0].toLowerCase();
    const currentMime = (responseHeaders.get('content-type') || '').toLowerCase();
    const hasFakeExt = /\.(js|css|woff|woff2|png|jpg|jpeg|gif|ts|m4s)($|\?)/i.test(currentUrl);
    const isNonMediaMime = !currentMime.startsWith('video/') && !currentMime.startsWith('audio/');

    if (hasFakeExt || isNonMediaMime) {
      if (cleanPath.endsWith('.m4s') || cleanPath.endsWith('.mp4')) {
        responseHeaders.set('Content-Type', 'video/mp4');
      } else if (cleanPath.endsWith('.aac')) {
        responseHeaders.set('Content-Type', 'audio/aac');
      } else if (cleanPath.endsWith('.ac3')) {
        responseHeaders.set('Content-Type', 'audio/ac3');
      } else {
        responseHeaders.set('Content-Type', 'video/mp2t');
      }
    }

    return new Response(finalResponse.body, {
      status: finalResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to proxy video',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
