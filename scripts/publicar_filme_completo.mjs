/**
 * Script All-in-One: Converte, Hospeda no Cloudflare R2 / Supabase Storage e Publica no Catálogo CinePlay
 *
 * Uso:
 *   node scripts/publicar_filme_completo.mjs "<caminho_do_video>" "<Título do Filme>" [ano] [áudio]
 *
 * Exemplo:
 *   node scripts/publicar_filme_completo.mjs "C:\\videos\\origem.mp4" "CinePlay: A Origem (2026)" 2026 dub
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { obterClienteR2, uploadPastaR2 } from './upload_r2.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kqfmahrxjuqlvxngeurj.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm1haHJ4anVxbHZ4bmdldXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDY2MTcsImV4cCI6MjA5MzgyMjYxN30.hQUfMD0TJIG-RE5SAlKaXBiR4HQQrH2JQZyQx4mASvs';
const BUCKET = process.env.SUPABASE_BUCKET || 'cineplay-videos';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Uso: node scripts/publicar_filme_completo.mjs "<video.mp4>" "<Título>" [ano] [dub|leg]
Exemplo:
  node scripts/publicar_filme_completo.mjs "public/abertura/cineplay-abertura.mp4" "CinePlay: A Origem (2026)" 2026 dub
`);
  process.exit(1);
}

const arquivoVideo = path.resolve(args[0]);
let titulo = args[1].trim();
let ano = args[2] ? String(args[2]).trim() : '2026';
let versao = args[3] && args[3].toLowerCase() === 'leg' ? 'leg' : 'dub';

if (!fs.existsSync(arquivoVideo)) {
  console.error(`❌ Arquivo de vídeo não encontrado: ${arquivoVideo}`);
  process.exit(1);
}

const matchAno = titulo.match(/\((\d{4})\)\s*$/);
if (matchAno) {
  ano = matchAno[1];
} else {
  titulo = `${titulo} (${ano})`;
}

function normalizar(texto) {
  return texto
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function slugify(texto) {
  return normalizar(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const slug = slugify(titulo);
const pastaTemp = path.resolve('streams', slug);
if (!fs.existsSync(pastaTemp)) {
  fs.mkdirSync(pastaTemp, { recursive: true });
}

console.log(`\n🚀 [1/5] Iniciando processamento do filme: "${titulo}"`);
console.log(`   Ano: ${ano} | Áudio: ${versao.toUpperCase()} | Slug: ${slug}`);

// 1. Extrair Thumbnail/Pôster com ffmpeg
const posterLocal = path.join(pastaTemp, 'poster.jpg');
console.log(`📸 [2/5] Gerando pôster em alta definição...`);
try {
  execSync(`ffmpeg -y -ss 00:00:01 -i "${arquivoVideo}" -vframes 1 -q:v 2 "${posterLocal}"`, { stdio: 'pipe' });
  console.log(`   Pôster gerado: ${posterLocal}`);
} catch (err) {
  console.warn(`   Aviso ao gerar pôster: ${err.message}`);
}

// 2. Converter para HLS streaming
console.log(`🎬 [3/5] Segmentando vídeo em HLS (master.m3u8 + .ts)...`);
const hlsOutput = path.join(pastaTemp, 'master.m3u8');
const hlsCmd = `ffmpeg -y -i "${arquivoVideo}" -c:v copy -c:a aac -b:a 160k -ac 2 -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "${path.join(pastaTemp, 'segmento_%03d.ts')}" "${hlsOutput}"`;
execSync(hlsCmd, { stdio: 'pipe' });
console.log(`   HLS gerado com sucesso!`);

// 3. Upload para Cloudflare R2 (se configurado) ou Supabase Storage
let masterUrl = '';
let posterUrl = '';

const r2Client = obterClienteR2();
if (r2Client) {
  console.log(`☁️  [4/5] Fazendo upload para CLOUDFLARE R2 (Bucket: ${r2Client.bucketName})...`);
  const resR2 = await uploadPastaR2(pastaTemp, slug);
  masterUrl = resR2.urlMaster;
  posterUrl = resR2.urlPoster;
  console.log(`   Upload Cloudflare R2 concluído com sucesso!`);
} else {
  console.log(`☁️  [4/5] Cloudflare R2 não configurado no .env. Enviando para Supabase Storage (Bucket: ${BUCKET})...`);

  async function uploadArquivoSupabase(caminhoCompleto, caminhoRemoto, mimeType) {
    const fileBuffer = fs.readFileSync(caminhoCompleto);
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminhoRemoto}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha no upload de ${caminhoRemoto}: ${res.status} ${txt}`);
    }
  }

  const arquivos = fs.readdirSync(pastaTemp);
  for (const arq of arquivos) {
    const caminhoLocal = path.join(pastaTemp, arq);
    const caminhoRemoto = `${slug}/${arq}`;
    let mime = 'application/octet-stream';
    if (arq.endsWith('.m3u8')) mime = 'application/vnd.apple.mpegurl';
    else if (arq.endsWith('.ts')) mime = 'video/mp2t';
    else if (arq.endsWith('.jpg') || arq.endsWith('.jpeg')) mime = 'image/jpeg';
    else if (arq.endsWith('.mp4')) mime = 'video/mp4';

    process.stdout.write(`   Enviando ${arq}... `);
    await uploadArquivoSupabase(caminhoLocal, caminhoRemoto, mime);
    console.log('✅');
  }

  masterUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${slug}/master.m3u8`;
  posterUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${slug}/poster.jpg`;
}

console.log(`   URL do Streaming: ${masterUrl}`);
console.log(`   URL do Pôster: ${posterUrl}`);

// 4. Cadastrar no catálogo local
console.log(`📝 [5/5] Registrando no catálogo CinePlay...`);

function extrairLetra(t) {
  const norm = normalizar(t);
  const prim = norm.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(prim) ? prim : '#';
}

const letra = extrairLetra(titulo);
const gaveta = letra === '#' ? '%23' : letra;
const catalogoDir = path.resolve('catalogo');

// 4.1 filmes-[letra].txt
const arqFilmes = path.join(catalogoDir, `filmes-${gaveta}.txt`);
let linhasFilmes = fs.existsSync(arqFilmes) ? fs.readFileSync(arqFilmes, 'utf8').split('\n') : [];
let achou = false;

linhasFilmes = linhasFilmes.map((linha) => {
  const [t, ...fontes] = linha.split('\t');
  if (t === titulo) {
    achou = true;
    return `${t}\t${versao}=${masterUrl}`;
  }
  return linha;
});

if (!achou) {
  linhasFilmes.push(`${titulo}\t${versao}=${masterUrl}`);
}
fs.writeFileSync(arqFilmes, linhasFilmes.filter(Boolean).join('\n') + '\n', 'utf8');

// 4.2 busca.txt
const arqBusca = path.join(catalogoDir, 'busca.txt');
if (fs.existsSync(arqBusca)) {
  let buscaTexto = fs.readFileSync(arqBusca, 'utf8');
  if (!buscaTexto.includes(titulo)) {
    fs.appendFileSync(arqBusca, `${titulo}\tf\t${letra}\t${ano}\n`, 'utf8');
  }
}

// 4.3 novidades.json
const arqNovidades = path.join(catalogoDir, 'novidades.json');
if (fs.existsSync(arqNovidades)) {
  try {
    const novidades = JSON.parse(fs.readFileSync(arqNovidades, 'utf8'));
    if (novidades.rodadas && novidades.rodadas.length > 0) {
      novidades.rodadas[0].adicionados.unshift({
        t: titulo,
        tp: 'f',
        ano: ano,
        capa: posterUrl,
      });
      novidades.rodadas[0].adicionados_total = novidades.rodadas[0].adicionados.length;
      fs.writeFileSync(arqNovidades, JSON.stringify(novidades, null, 2), 'utf8');
    }
  } catch (e) {
    console.warn('   Aviso ao atualizar novidades.json:', e.message);
  }
}

// 4.4 fichas.txt
const arqFichas = path.join(catalogoDir, 'fichas.txt');
if (fs.existsSync(arqFichas)) {
  let fichasTexto = fs.readFileSync(arqFichas, 'utf8');
  if (!fichasTexto.includes(titulo)) {
    fs.appendFileSync(arqFichas, `f\t${titulo}\t999999\t${posterUrl}\tFicção,Ação,Lançamento 2026\n`, 'utf8');
  }
}

// 5. Commit e Push no GitHub do Catálogo
console.log(`\n📦 Enviando atualização para o GitHub (uppiapp/cineplay-catalogo)...`);
try {
  execSync(`cd catalogo && git add . && git commit -m "Publica filme ${titulo}" && git push origin main`, { stdio: 'inherit' });
  console.log(`\n🎉 FILME PUBLICADO COM SUCESSO!`);
  console.log(`O filme "${titulo}" já está no ar, hospedado nos seus próprios servidores e disponível no CinePlay!`);
} catch (e) {
  console.warn(`   Aviso no git push do catálogo: ${e.message}`);
}
