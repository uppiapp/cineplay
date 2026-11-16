import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  runtime: 'nodejs',
};

const UPSTREAM = 'https://saimo-tv.pages.dev';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Cabeçalhos CORS universais para permitir streaming em qualquer dispositivo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const targetUrl = `${UPSTREAM}${req.url ?? '/api/proxy'}`;
    const fwdHeaders: Record<string, string> = {
      'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': (req.headers['accept'] as string) || '*/*',
    };
    if (req.headers.range) fwdHeaders['Range'] = String(req.headers.range);

    const upstreamRes = await fetch(targetUrl, {
      method: req.method ?? 'GET',
      headers: fwdHeaders,
      redirect: 'follow',
    });

    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((valor: string, chave: string) => {
      if (chave.toLowerCase() !== 'access-control-allow-origin') {
        res.setHeader(chave, valor);
      }
    });

    if (!upstreamRes.body || req.method === 'HEAD') {
      res.end();
      return;
    }

    const leitor = upstreamRes.body.getReader();
    res.on('close', () => { void leitor.cancel().catch(() => {}); });
    try {
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        if (!res.write(value)) {
          await new Promise((pronto) => res.once('drain', pronto));
        }
      }
    } catch {
      // Conexão encerrada pelo cliente
    }
    res.end();
  } catch (errUpstream) {
    console.error('[proxy] Erro ao encaminhar requisição para upstream:', errUpstream);
    res.statusCode = 502;
    res.end('Bad gateway');
  }
}
