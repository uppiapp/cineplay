/**
 * Clona o catálogo VOD completo de filmes-saimo.pages.dev para catalogo/
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://filmes-saimo.pages.dev/';
const DESTINO = path.resolve('catalogo');

if (!fs.existsSync(DESTINO)) {
  fs.mkdirSync(DESTINO, { recursive: true });
}

async function baixar(nome) {
  const caminhoLocal = path.join(DESTINO, nome);
  if (fs.existsSync(caminhoLocal)) {
    console.log(`[EXISTE] ${nome}`);
    return fs.readFileSync(caminhoLocal, 'utf8');
  }

  const dir = path.dirname(caminhoLocal);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`[BAIXANDO] ${nome}...`);
  try {
    const res = await fetch(BASE + nome);
    if (!res.ok) {
      console.warn(`[FALHA ${res.status}] ${nome}`);
      return null;
    }
    const texto = await res.text();
    fs.writeFileSync(caminhoLocal, texto, 'utf8');
    return texto;
  } catch (err) {
    console.error(`[ERRO] ${nome}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('Iniciando clone do catálogo...');

  // 1. Arquivos centrais
  const centrais = [
    'indice.txt',
    'novidades.json',
    'busca.txt',
    'destaques.txt',
    'detalhes.txt',
    'fichas.txt',
    'generos.txt',
    'redeflix/links-animes.txt',
    'redeflix/links-doramas.txt',
  ];

  for (const c of centrais) {
    await baixar(c);
  }

  // 2. Letras do índice
  const indiceTexto = fs.readFileSync(path.join(DESTINO, 'indice.txt'), 'utf8');
  const letras = [];
  for (const l of indiceTexto.split('\n')) {
    const campos = l.split('\t');
    if (campos.length >= 2 && !l.startsWith('base:')) {
      letras.push(campos[0].trim());
    }
  }

  console.log('Letras encontradas:', letras.join(', '));

  // 3. Filmes, séries e reservados por letra
  for (const l of letras) {
    const gav = l === '#' ? '%23' : l;
    await baixar(`filmes-${gav}.txt`);
    await baixar(`reservado-${gav}.txt`);
    const seriesTexto = await baixar(`series-${gav}.txt`);

    if (seriesTexto) {
      const pedacos = new Set();
      for (const sl of seriesTexto.split('\n')) {
        const sc = sl.split('\t');
        if (sc.length >= 3 && sc[2]) {
          pedacos.add(Number(sc[2]) || 0);
        }
      }
      for (const p of pedacos) {
        await baixar(`series-${gav}-${p}.txt`);
      }
    }
  }

  console.log('Clone do catálogo concluído com sucesso!');
}

main().catch(console.error);
