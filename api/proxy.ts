import type { IncomingMessage, ServerResponse } from 'http';

export const config = {
  runtime: 'nodejs',
};

const UPSTREAM = 'https://saimo-tv.pages.dev';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host ?? 'localhost';
  const protocolo = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const url = `${protocolo}://${host}${req.url ?? '/'}`;

  // Cabeçalhos CORS padrão para permitir reprodução em qualquer navegador
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const cabecalhos = new Headers();
  if (req.headers.range) cabecalhos.set('range', String(req.headers.range));
  if (req.headers['user-agent']) cabecalhos.set('user-agent', String(req.headers['user-agent']));
  if (req.headers.referer) cabecalhos.set('referer', String(req.headers.referer));

  // 1. Tentar executar a função local de proxy se o módulo estiver disponível
  try {
    const { onRequest } = await import('../functions/api/proxy.ts');
    const resposta = await onRequest({
      request: new Request(url, { method: req.method ?? 'GET', headers: cabecalhos }),
    });

    if (resposta.ok || resposta.status === 206 || resposta.status === 304) {
      res.statusCode = resposta.status;
      resposta.headers.forEach((valor, chave) => {
        if (chave.toLowerCase() !== 'access-control-allow-origin') {
          res.setHeader(chave, valor);
        }
      });

      if (!resposta.body || req.method === 'HEAD') {
        res.end();
        return;
      }

      const leitor = resposta.body.getReader();
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
        // Conexão encerrada
      }
      res.end();
      return;
    }
  } catch (errLocal) {
    // Se o import falhar no ambiente Lambda ou der erro, continua para o upstream oficial
  }

  // 2. Fallback resiliente e transparente para a infraestrutura oficial do Saimo
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
      // Conexão encerrada
    }
    res.end();
  } catch (errUpstream) {
    console.error('[proxy] Falha em ambas as camadas de proxy:', errUpstream);
    res.statusCode = 502;
    res.end('Bad gateway');
  }
}
