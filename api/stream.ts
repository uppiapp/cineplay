import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  runtime: 'nodejs',
};

const UPSTREAM = 'https://saimo-tv.pages.dev';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const targetUrl = `${UPSTREAM}${req.url ?? '/api/stream'}`;
    const upstreamRes = await fetch(targetUrl, {
      method: req.method ?? 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
      },
      redirect: 'manual',
    });

    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((valor: string, chave: string) => {
      // Evitar sobrescrever CORS
      if (chave.toLowerCase() !== 'access-control-allow-origin') {
        res.setHeader(chave, valor);
      }
    });

    if (upstreamRes.status === 301 || upstreamRes.status === 302) {
      res.end();
      return;
    }

    const data = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(data));
  } catch (err: any) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
}
