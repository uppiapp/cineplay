/**
 * Upload de Filmes e Streams para o Cloudflare R2
 *
 * Utiliza o SDK oficial S3-compatible da AWS configurado para os endpoints da Cloudflare.
 */
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Carregar variáveis de ambiente do .env se existir
function carregarEnv() {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const linhas = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const linha of linhas) {
      const trim = linha.trim();
      if (!trim || trim.startsWith('#')) continue;
      const [chave, ...resto] = trim.split('=');
      if (chave && resto.length > 0) {
        process.env[chave.trim()] = resto.join('=').trim();
      }
    }
  }
}
carregarEnv();

export function obterClienteR2(configCustom = {}) {
  const accountId = configCustom.accountId || process.env.R2_ACCOUNT_ID;
  const accessKeyId = configCustom.accessKeyId || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = configCustom.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = configCustom.bucketName || process.env.R2_BUCKET_NAME || 'cineplay-videos';
  const publicUrl = configCustom.publicUrl || process.env.R2_PUBLIC_URL || '';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, publicUrl, accountId };
}

export async function testarConexaoR2(configCustom = {}) {
  const r2 = obterClienteR2(configCustom);
  if (!r2) {
    throw new Error('Credenciais da Cloudflare R2 não informadas (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).');
  }

  const cmd = new ListObjectsV2Command({
    Bucket: r2.bucketName,
    MaxKeys: 1,
  });

  await r2.client.send(cmd);
  return { sucesso: true, bucket: r2.bucketName, endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com` };
}

export async function uploadPastaR2(pastaLocal, prefixoRemoto, configCustom = {}) {
  const r2 = obterClienteR2(configCustom);
  if (!r2) {
    throw new Error('Cloudflare R2 não configurado.');
  }

  const arquivos = fs.readdirSync(pastaLocal);
  const resultados = [];

  for (const arq of arquivos) {
    const caminhoLocal = path.join(pastaLocal, arq);
    const chaveRemota = `${prefixoRemoto}/${arq}`.replace(/\/+/g, '/');

    let contentType = 'application/octet-stream';
    if (arq.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
    else if (arq.endsWith('.ts')) contentType = 'video/mp2t';
    else if (arq.endsWith('.jpg') || arq.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (arq.endsWith('.mp4')) contentType = 'video/mp4';

    const body = fs.readFileSync(caminhoLocal);
    const cmd = new PutObjectCommand({
      Bucket: r2.bucketName,
      Key: chaveRemota,
      Body: body,
      ContentType: contentType,
      CacheControl: arq.endsWith('.m3u8') ? 'max-age=1' : 'max-age=31536000',
    });

    await r2.client.send(cmd);
    resultados.push(chaveRemota);
  }

  const basePublica = r2.publicUrl.replace(/\/+$/, '');
  const urlMaster = basePublica ? `${basePublica}/${prefixoRemoto}/master.m3u8` : '';
  const urlPoster = basePublica ? `${basePublica}/${prefixoRemoto}/poster.jpg` : '';

  return {
    arquivos: resultados,
    urlMaster,
    urlPoster,
  };
}

// Execução direta via CLI para teste
if (process.argv[1] && process.argv[1].endsWith('upload_r2.mjs')) {
  console.log('Testando conexão com Cloudflare R2...');
  testarConexaoR2()
    .then((res) => console.log('✅ Conexão Cloudflare R2 OK:', res))
    .catch((err) => console.error('❌ Falha na conexão R2:', err.message));
}
