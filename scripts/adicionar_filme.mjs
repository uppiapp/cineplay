/**
 * Script utilitário para adicionar filmes próprios ao catálogo CinePlay.
 *
 * Exemplo de uso:
 *   node scripts/adicionar_filme.mjs "Meu Filme Exclusivo (2026)" "https://stream.cineplay.tv/filmes/meu-filme/master.m3u8" --dub --ano 2026 --capa "https://image.tmdb.org/t/p/w342/exemplo.jpg"
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Uso: node scripts/adicionar_filme.mjs "<Título>" "<URL do Vídeo/M3U8>" [opções]

Opções:
  --dub          Áudio Dublado em Português (padrão)
  --leg          Áudio Legendado
  --ano <AAAA>   Ano de lançamento (ex: 2026)
  --capa <URL>   URL do pôster do filme
`);
  process.exit(1);
}

const titulo = args[0].trim();
const url = args[1].trim();

let versao = 'dub';
let ano = '2026';
let capa = '';

for (let i = 2; i < args.length; i++) {
  if (args[i] === '--leg') versao = 'leg';
  if (args[i] === '--dub') versao = 'dub';
  if (args[i] === '--ano' && args[i + 1]) ano = args[++i].trim();
  if (args[i] === '--capa' && args[i + 1]) capa = args[++i].trim();
}

const matchAno = titulo.match(/\((\d{4})\)\s*$/);
if (matchAno) ano = matchAno[1];

function normalizar(texto) {
  return texto
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extrairLetra(t) {
  const norm = normalizar(t);
  const prim = norm.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(prim) ? prim : '#';
}

const letra = extrairLetra(titulo);
const gaveta = letra === '#' ? '%23' : letra;
const catalogoDir = path.resolve('catalogo');

if (!fs.existsSync(catalogoDir)) {
  console.error('Pasta catalogo/ não encontrada!');
  process.exit(1);
}

// 1. Atualizar filmes-[letra].txt
const arqFilmes = path.join(catalogoDir, `filmes-${gaveta}.txt`);
let linhasFilmes = fs.existsSync(arqFilmes) ? fs.readFileSync(arqFilmes, 'utf8').split('\n') : [];
let achou = false;

linhasFilmes = linhasFilmes.map((linha) => {
  const [t, ...fontes] = linha.split('\t');
  if (t === titulo) {
    achou = true;
    let temVersao = false;
    const novasFontes = fontes.map((f) => {
      if (f.startsWith(`${versao}=`)) {
        temVersao = true;
        return `${versao}=${url},${f.slice(versao.length + 1)}`;
      }
      return f;
    });
    if (!temVersao) novasFontes.push(`${versao}=${url}`);
    return `${t}\t${novasFontes.join('\t')}`;
  }
  return linha;
});

if (!achou) {
  linhasFilmes.push(`${titulo}\t${versao}=${url}`);
}

fs.writeFileSync(arqFilmes, linhasFilmes.filter(Boolean).join('\n') + '\n', 'utf8');
console.log(`[OK] Adicionado em filmes-${gaveta}.txt`);

// 2. Atualizar busca.txt
const arqBusca = path.join(catalogoDir, 'busca.txt');
if (fs.existsSync(arqBusca)) {
  const buscaTexto = fs.readFileSync(arqBusca, 'utf8');
  if (!buscaTexto.includes(titulo)) {
    const novaLinha = `${titulo}\tf\t${letra}\t${ano}\n`;
    fs.appendFileSync(arqBusca, novaLinha, 'utf8');
    console.log('[OK] Adicionado ao índice de busca.txt');
  }
}

// 3. Atualizar novidades.json se capa foi fornecida
if (capa) {
  const arqNovidades = path.join(catalogoDir, 'novidades.json');
  if (fs.existsSync(arqNovidades)) {
    try {
      const nov = JSON.parse(fs.readFileSync(arqNovidades, 'utf8'));
      if (!nov.rodadas) nov.rodadas = [];
      if (!nov.rodadas[0]) nov.rodadas.unshift({ adicionados: [], atualizados: [] });
      nov.rodadas[0].adicionados.unshift({
        t: titulo,
        tp: 'f',
        ano,
        capa,
      });
      fs.writeFileSync(arqNovidades, JSON.stringify(nov, null, 2), 'utf8');
      console.log('[OK] Adicionado aos destaques de novidades.json');
    } catch {}
  }
}

console.log(`
🎉 Filme "${titulo}" registrado com sucesso no catálogo CinePlay!
Para sincronizar com os usuários, execute:
  cd catalogo
  git commit -am "feat: adiciona ${titulo}"
  git push origin main
`);
