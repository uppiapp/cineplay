/**
 * Filmes e séries, baixados por pedaço do mesmo repositório que o app lê.
 *
 * Porte de `Vod.kt`. A lista de origem tem trinta megabytes e trezentas mil
 * linhas, o que nenhum navegador de TV abre; ela já vem pré-digerida em um
 * catálogo fatiado por letra, com as séries ainda repartidas dentro da letra, de
 * modo que nenhum download passa de uns cem quilobytes. Como a tela também
 * navega por letra, o download acompanha o dedo em vez de contrariá-lo.
 *
 * As capas não existem na origem e vêm do TMDB, buscadas e pontuadas com o
 * mesmo algoritmo do `api-saimo-tv` — o gerador que alimenta o catálogo do
 * Supabase. Pegar só o primeiro resultado (como este site fazia antes, via
 * Cinemeta) errava a capa com frequência; pontuar por título e ano é o que
 * torna a busca confiável o bastante para usar sem checagem manual.
 */

import { linkFilmes } from './listas';
import { melhorMatch, posterUrl, type TmdbTipo } from './tmdbService';
import { peneirar as semDesligados } from './fontesDesativadas';


export const LETRAS = [
  '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

/** Versão (dublado/legendado) -> fontes em ordem de preferência. */
export interface Filme {
  titulo: string;
  fontes: Record<string, string[]>;
}

export interface Serie {
  titulo: string;
  ano: string;
  pedaco: number;
  episodios: number;
  nomeCompleto: string;
}

export interface Episodio {
  temporada: number;
  numero: number;
  versao: string;
  urls: string[];
}

export type ColecaoVod = 'animes' | 'doramas';

/**
 * Série de uma coleção editorial publicada pelo gerador RedeFlix.
 *
 * Ao contrário do catálogo geral, estas listas são pequenas e já carregam os
 * episódios no mesmo arquivo. O `tmdbId` vem da lista oficial de IDs e evita
 * misturar títulos homônimos quando a capa/metadados forem enriquecidos.
 */
export interface SerieColecao {
  titulo: string;
  ano: string;
  tmdbId: string;
  episodios: Episodio[];
  nomeCompleto: string;
}

export interface Gaveta {
  letra: string;
  filmes: number;
  series: number;
  reservados: number;
}

export interface Achado {
  titulo: string;
  serie: boolean;
  letra: string;
  ano: string;
  nomeCompleto: string;
}

/** Os começos de endereço, numerados. Preenchidos ao ler o índice. */
let bases: string[] = [];
const arquivos = new Map<string, Promise<string | null>>();
let indiceBusca: string | null = null;
const colecoes = new Map<ColecaoVod, Promise<SerieColecao[]>>();
/** De qual endereço vem tudo o que está em memória aqui. */
let baseDaMemoria = '';

/**
 * Esquece o que foi lido de outro endereço. Trocar ou apagar o link de filmes
 * em Ajustes não pode deixar a tela com títulos da lista anterior.
 */
function sincronizar(): string {
  const base = linkFilmes();
  if (base !== baseDaMemoria) {
    baseDaMemoria = base;
    bases = [];
    arquivos.clear();
    indiceBusca = null;
    colecoes.clear();
    filasEmMemoria = null;
    generosEmMemoria = null;
  }
  return base;
}

function gaveta(letra: string): string {
  return letra === '#' ? '%23' : letra;
}

/**
 * Conteúdo do arquivo, memorizado.
 *
 * O catálogo muda de vez em quando e nunca no meio de uma navegação, então o que
 * já foi lido serve para o resto da visita: poupa a rede e faz voltar à mesma
 * letra abrir na hora.
 */
function arquivo(nome: string): Promise<string | null> {
  // Sem endereço de filmes não se pede nada.
  const BASE = sincronizar();
  if (!BASE) return Promise.resolve(null);
  const existente = arquivos.get(nome);
  if (existente) return existente;

  const promessa = fetch(BASE + nome)
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null)
    .then((texto) => {
      // Um download falho não pode virar "não existe" para sempre: sem
      // esquecê-lo, uma oscilação de rede deixaria a letra vazia até recarregar.
      if (texto === null) arquivos.delete(nome);
      return texto;
    });

  arquivos.set(nome, promessa);
  return promessa;
}

/**
 * O item guarda "base:resto"; o endereço inteiro sairia dezenas de vezes maior,
 * e o começo é sempre o mesmo punhado de servidores. Sem a base o que sobra é
 * "0:19927", que só falharia na hora de tocar — melhor devolver vazio.
 */
function montar(valor: string): string {
  if (valor.startsWith('http')) return valor;
  const corte = valor.indexOf(':');
  if (corte <= 0) return '';
  const indice = Number(valor.slice(0, corte));
  if (!Number.isInteger(indice)) return '';
  const resto = valor.slice(corte + 1);
  const base = bases[indice];
  if (!base) return '';
  return resto.includes('.') ? base + resto : `${base}${resto}.mp4`;
}

/** Letra -> quantos filmes, séries e reservados começam com ela. */
export async function indice(): Promise<Gaveta[]> {
  const texto = await arquivo('indice.txt');
  if (!texto) return [];
  const out: Gaveta[] = [];
  const encontradas: string[] = [];

  for (const linha of texto.split('\n')) {
    if (linha.startsWith('base:')) {
      const partes = linha.slice('base:'.length).trim().split(/\s+/);
      if (partes.length >= 2) encontradas[Number(partes[0])] = partes.slice(1).join(' ');
    } else if (linha.trim()) {
      const campos = linha.split('\t');
      if (campos.length >= 3) {
        out.push({
          letra: campos[0],
          filmes: Number(campos[1]) || 0,
          series: Number(campos[2]) || 0,
          reservados: Number(campos[3]) || 0,
        });
      }
    }
  }
  if (encontradas.length) bases = encontradas;
  return out;
}

/** Garante que as bases de endereço já foram lidas antes de montar uma URL. */
async function comBases<T>(trabalho: () => Promise<T>): Promise<T> {
  if (!bases.length) await indice();
  return trabalho();
}

export async function filmes(letra: string, reservados = false): Promise<Filme[]> {
  return comBases(async () => {
    const prefixo = reservados ? 'reservado' : 'filmes';
    const texto = await arquivo(`${prefixo}-${gaveta(letra)}.txt`);
    if (!texto) return [];

    const out: Filme[] = [];
    for (const linha of texto.split('\n')) {
      const campos = linha.split('\t');
      if (campos.length < 2 || !campos[0].trim()) continue;
      const fontes: Record<string, string[]> = {};
      for (const parte of campos.slice(1)) {
        const marca = parte.indexOf('=');
        if (marca <= 0) continue;
        const urls = semDesligados(parte
          .slice(marca + 1)
          .split(',')
          .filter(Boolean)
          .map(montar)
          .filter(Boolean));
        if (urls.length) fontes[parte.slice(0, marca)] = urls;
      }
      if (Object.keys(fontes).length) out.push({ titulo: campos[0], fontes });
    }
    return out;
  });
}

export async function series(letra: string): Promise<Serie[]> {
  const texto = await arquivo(`series-${gaveta(letra)}.txt`);
  if (!texto) return [];
  const out: Serie[] = [];
  for (const linha of texto.split('\n')) {
    const campos = linha.split('\t');
    if (campos.length < 4 || !campos[0].trim()) continue;
    const titulo = campos[0];
    const ano = campos[1];
    out.push({
      titulo,
      ano,
      pedaco: Number(campos[2]) || 0,
      episodios: Number(campos[3]) || 0,
      nomeCompleto: ano.trim() ? `${titulo} (${ano})` : titulo,
    });
  }
  return out;
}

/** Episódios de uma série. Baixa só o pedaço em que ela está. */
export async function episodios(letra: string, serie: Serie): Promise<Episodio[]> {
  return comBases(async () => {
    const texto = await arquivo(`series-${gaveta(letra)}-${serie.pedaco}.txt`);
    if (!texto) return [];

    const out: Episodio[] = [];
    let dentro = false;
    for (const linha of texto.split('\n')) {
      if (linha.startsWith('@')) {
        // O arquivo é ordenado: passar do bloco procurado quer dizer que acabou.
        if (dentro) break;
        const identidade = linha.slice(1).split('\t');
        dentro = identidade[0] === serie.titulo && (identidade[1] ?? '') === serie.ano;
        continue;
      }
      if (!dentro) continue;
      const campos = linha.split('\t');
      if (campos.length < 4) continue;
      const urls = semDesligados(campos[3].split(',').filter(Boolean).map(montar).filter(Boolean));
      if (!urls.length) continue;
      out.push({
        temporada: Number(campos[0]) || 0,
        numero: Number(campos[1]) || 0,
        versao: campos[2],
        urls,
      });
    }
    return out;
  });
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Procura em todo o acervo.
 *
 * O índice traz só nome, tipo e letra — menos de um megabyte para trinta mil
 * títulos — então dá para procurar no acervo inteiro sem baixar o acervo.
 */
export async function buscar(termo: string): Promise<Achado[]> {
  const alvo = normalizar(termo);
  if (alvo.length < 2) return [];
  sincronizar();
  const texto = indiceBusca ?? (await arquivo('busca.txt'));
  if (!texto) return [];
  indiceBusca = texto;

  const out: Achado[] = [];
  for (const linha of texto.split('\n')) {
    const campos = linha.split('\t');
    if (campos.length < 3) continue;
    const ano = campos[3] ?? '';
    if (!normalizar(`${campos[0]} ${ano}`).includes(alvo)) continue;
    out.push({
      titulo: campos[0],
      serie: campos[1] === 's',
      letra: campos[2],
      ano,
      nomeCompleto: ano.trim() ? `${campos[0]} (${ano})` : campos[0],
    });
    if (out.length >= 200) break;
  }
  return out;
}

/**
 * Todo o acervo de um tipo, de uma vez.
 *
 * Antes a tela pedia uma letra de cada vez, porque o acervo é publicado por
 * letra e a letra A sozinha já traz três mil e quinhentos filmes. Mas o índice
 * de busca tem os trinta mil nomes em menos de um megabyte, e é o mesmo
 * arquivo que a busca já baixa: dá para mostrar tudo e deixar a pessoa rolar,
 * sem escolher letra nenhuma. O endereço de cada título continua vindo da
 * letra dele, na hora em que for aberto.
 */
export async function todos(serie: boolean): Promise<Achado[]> {
  sincronizar();
  const texto = indiceBusca ?? (await arquivo('busca.txt'));
  if (!texto) return [];
  indiceBusca = texto;

  const out: Achado[] = [];
  for (const linha of texto.split('\n')) {
    const campos = linha.split('\t');
    if (campos.length < 3) continue;
    if ((campos[1] === 's') !== serie) continue;
    const ano = campos[3] ?? '';
    out.push({
      titulo: campos[0],
      serie,
      letra: campos[2],
      ano,
      nomeCompleto: ano.trim() ? `${campos[0]} (${ano})` : campos[0],
    });
  }
  return out;
}

/** Um filme específico, pelo nome, dentro da letra dele. */
export async function filme(achado: Achado): Promise<Filme | null> {
  const lista = await filmes(achado.letra);
  let direto = lista.find((f) => f.titulo === achado.titulo);
  if (!direto) {
    const limpo = achado.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase();
    direto = lista.find((f) => f.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase() === limpo);
  }
  if (direto) return direto;
  const reservado = await filmes(achado.letra, true);
  let res = reservado.find((f) => f.titulo === achado.titulo);
  if (!res) {
    const limpo = achado.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase();
    res = reservado.find((f) => f.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase() === limpo);
  }
  return res ?? null;
}

/** Uma série específica, pelo nome, dentro da letra dela. */
export async function serie(achado: Achado): Promise<Serie | null> {
  const lista = await series(achado.letra);
  let direto = lista.find(
    (s) => s.titulo === achado.titulo && (!achado.ano.trim() || s.ano === achado.ano),
  );
  if (!direto) {
    const limpo = achado.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase();
    direto = lista.find((s) => s.titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim().toLowerCase() === limpo);
  }
  return direto ?? null;
}

/** Lê `vod/redeflix/links-animes.txt` ou `links-doramas.txt`. */
export async function colecao(tipo: ColecaoVod): Promise<SerieColecao[]> {
  const BASE = sincronizar();
  if (!BASE) return [];
  if (!bases.length) await indice();
  const existente = colecoes.get(tipo);
  if (existente) return existente;

  // Estas duas listas são atualizadas semanalmente. O raw do GitHub aceita
  // cache agressivo e chegava a mostrar por horas a classificação anterior
  // (anime dentro de Doramas) mesmo depois do arquivo já ter sido corrigido.
  const promessa = fetch(
    `${BASE}redeflix/links-${tipo}.txt?v=${Math.floor(Date.now() / 60_000)}`,
    { cache: 'no-store' },
  )
    .then((r) => {
      if (!r.ok) throw new Error(`Coleção ${tipo} indisponível (${r.status})`);
      return r.text();
    })
    .then((texto) => {
      const out: SerieColecao[] = [];
      let atual: SerieColecao | null = null;

      for (const linhaBruta of texto.split('\n')) {
        const linha = linhaBruta.trim();
        if (!linha) continue;
        if (linha.startsWith('@')) {
          const [titulo = '', ano = '', tmdbId = ''] = linha.slice(1).split('\t');
          if (!titulo.trim()) { atual = null; continue; }
          atual = {
            titulo: titulo.trim(),
            ano: ano.trim(),
            tmdbId: tmdbId.trim(),
            episodios: [],
            nomeCompleto: ano.trim() ? `${titulo.trim()} (${ano.trim()})` : titulo.trim(),
          };
          out.push(atual);
          continue;
        }
        if (!atual) continue;
        const [temporada, numero, versao, urlsTexto] = linhaBruta.split('\t');
        const urls = semDesligados((urlsTexto ?? '').split(',')
          .map((url) => montar(url.trim()))
          .filter(Boolean));
        if (!urls.length) continue;
        atual.episodios.push({
          temporada: Number(temporada) || 0,
          numero: Number(numero) || 0,
          versao: versao?.trim() || 'dub',
          urls,
        });
      }
      return out.filter((serie) => serie.episodios.length > 0);
    })
    .catch((erro) => {
      colecoes.delete(tipo);
      throw erro;
    });

  colecoes.set(tipo, promessa);
  return promessa;
}

// ============================================================
// CAPAS
// ============================================================

/// Título -> capa. Vazio quer dizer procurado e não achado, e é guardado
/// também: sem isso a mesma busca infrutífera se repetiria a cada rolagem.
const capasEmMemoria = new Map<string, Promise<string | null>>();

export function capa(titulo: string, serieBool: boolean): Promise<string | null> {
  const chave = `${serieBool ? 's' : 'f'}:${titulo}`;
  const existente = capasEmMemoria.get(chave);
  if (existente) return existente;

  const tipo: TmdbTipo = serieBool ? 'tv' : 'movie';
  const promessa = melhorMatch(titulo, tipo)
    .then((match) => posterUrl(match?.resultado.poster_path))
    .catch(() => null);

  capasEmMemoria.set(chave, promessa);
  return promessa;
}

/**
 * As fileiras da tela inicial, prontas para desenhar.
 *
 * O acervo tem trinta e quatro mil filmes e nenhuma data de entrada, então não
 * há como o site descobrir sozinho o que é novidade — e perguntar a capa de
 * cada título ao TMDB, a cada abertura, seria uma tela que demora para
 * aparecer. A conta é feita no repositório (`gerar_destaques.py`) e chega aqui
 * pronta: seis fileiras, cento e vinte títulos, sete quilobytes, com o caminho
 * do pôster junto.
 *
 * O formato de cada item é o mesmo de um resultado de busca — tipo, título,
 * letra, ano —, então abrir um destaque passa pelo caminho que já abre um
 * título procurado. É o mesmo arquivo que a TV Box, o Mac e o Windows leem.
 */
export interface ItemDestaque {
  /** 'f' filme, 's' série, 'a' anime, 'd' dorama. */
  tipo: string;
  titulo: string;
  letra: string;
  ano: string;
  /** Endereço inteiro da capa, ou vazio quando o gerador não achou uma. */
  capa: string;
}

export interface FilaDestaque {
  titulo: string;
  itens: ItemDestaque[];
}

export const ITENS_NETFLIX_CURADOS: ItemDestaque[] = [
  { tipo: 's', titulo: 'Stranger Things', letra: 'S', ano: '2016', capa: 'https://image.tmdb.org/t/p/w342/twfKp60THrcOIep9sjHODOOfO8d.jpg' },
  { tipo: 's', titulo: 'Wandinha', letra: 'W', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/7rxiQrZjrer0RB9qNA8rHYFo53R.jpg' },
  { tipo: 's', titulo: 'Round 6', letra: 'R', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/6gcHdboppvplmBWxvROc96NJnmm.jpg' },
  { tipo: 's', titulo: 'Bridgerton', letra: 'B', ano: '2020', capa: 'https://image.tmdb.org/t/p/w342/eSrfwxnmMffTEI8gHTDde0iWuGB.jpg' },
  { tipo: 's', titulo: 'La Casa de Papel', letra: 'L', ano: '2017', capa: 'https://image.tmdb.org/t/p/w342/UfXcC5GbCCMPW2qZ3SB8D9hpUz.jpg' },
  { tipo: 's', titulo: 'The Witcher', letra: 'T', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/uJ1kQWTY1nElMcrrbHtDitbV85K.jpg' },
  { tipo: 's', titulo: 'Black Mirror', letra: 'B', ano: '2011', capa: 'https://image.tmdb.org/t/p/w342/aCTL24B8ZuiI2osMwoUI5rqBXoF.jpg' },
  { tipo: 's', titulo: 'Cobra Kai', letra: 'C', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/6GDW4EsgsXlYrL1ASb5eCHQK4er.jpg' },
  { tipo: 's', titulo: 'Dark', letra: 'D', ano: '2017', capa: 'https://image.tmdb.org/t/p/w342/mAbuZuS4CqlTI6lvWIxPRHppbVs.jpg' },
  { tipo: 's', titulo: 'Lupin', letra: 'L', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/sOUWRai0215iUSMackrZx3Y1j05.jpg' },
  { tipo: 's', titulo: 'Berlim', letra: 'B', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/aOv5c4PJmQn3sBdrGVThVIyxQpH.jpg' },
  { tipo: 's', titulo: 'ONE PIECE: A Série', letra: 'O', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/aesLt9fsKSA6KCgGxA60VVxjtLk.jpg' },
  { tipo: 's', titulo: 'Peaky Blinders', letra: 'P', ano: '2013', capa: 'https://image.tmdb.org/t/p/w342/i0uajcHH9yogXMfDHpOXexIukG9.jpg' },
  { tipo: 's', titulo: 'Sex Education', letra: 'S', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/2SUS5YMoBmJ8IYZzipTHCzIixRc.jpg' },
  { tipo: 's', titulo: 'Outer Banks', letra: 'O', ano: '2020', capa: 'https://image.tmdb.org/t/p/w342/ovDgO2LPfwdVRfvScAqo9aMiIW.jpg' },
  { tipo: 's', titulo: 'Emily em Paris', letra: 'E', ano: '2020', capa: 'https://image.tmdb.org/t/p/w342/2QeSY4fkl3tKRAg3HEiTHxSJg8j.jpg' },
  { tipo: 's', titulo: 'O Gambito da Rainha', letra: 'O', ano: '2020', capa: 'https://image.tmdb.org/t/p/w342/ubWpLTkwcms5PfZJMFZkNXVYXqJ.jpg' },
  { tipo: 's', titulo: 'Elite', letra: 'E', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/sfC3hM33pCenEjnmuITvhaUKSXU.jpg' },
  { tipo: 's', titulo: 'Ozark', letra: 'O', ano: '2017', capa: 'https://image.tmdb.org/t/p/w342/epUO5w9nRmozR0iWCFwChT3ha6j.jpg' },
  { tipo: 's', titulo: 'Heartstopper', letra: 'H', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/7h8ZHFmx73HnEagDI6KbWAw4ea3.jpg' },
  { tipo: 's', titulo: 'Sweet Tooth', letra: 'S', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/rgMfhcrVZjuy5b7Pn0KzCRCEnMX.jpg' },
  { tipo: 's', titulo: 'Sandman', letra: 'S', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/5k1PlMiep3mg1BwIc7P4RZlu3WI.jpg' },
  { tipo: 's', titulo: 'Narcos', letra: 'N', ano: '2015', capa: 'https://image.tmdb.org/t/p/w342/zzz1KiXWqr8SvqiAb1NmFtnV7Uu.jpg' },
  { tipo: 's', titulo: 'Lucifer', letra: 'L', ano: '2016', capa: 'https://image.tmdb.org/t/p/w342/hdKxcoV5CFc3sGOmbGXDXbx1cTZ.jpg' },
  { tipo: 's', titulo: 'Manifest', letra: 'M', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/rRKLin0R9gYxpR33W7e4cxx5swI.jpg' },
  { tipo: 's', titulo: 'The Crown', letra: 'T', ano: '2016', capa: 'https://image.tmdb.org/t/p/w342/ehUMAA3qDR5HNor9DB60g72KNQZ.jpg' },
  { tipo: 's', titulo: 'Arcane', letra: 'A', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/m3Tzf6k537PnhOEwaSRNCSxedLS.jpg' },
  { tipo: 'f', titulo: 'Alerta Vermelho', letra: 'A', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/pe17f8VDfzbvbHSAKAlcORtBHmW.jpg' },
  { tipo: 'f', titulo: 'Resgate 2', letra: 'R', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/AfwqKLQwjgPu8bIL1mqhHTlnQv0.jpg' },
  { tipo: 'f', titulo: 'A Sociedade da Neve (2023)', letra: 'A', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/7fQTmvKgVGxifieVryqqlxohkoW.jpg' },
  { tipo: 'f', titulo: 'O Irlandês', letra: 'O', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/9H1XgBZFoVnh7nSibGWZcJMOL6C.jpg' },
  { tipo: 'f', titulo: 'Bird Box', letra: 'B', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/kTHDVXVTT62gJY9WfZnaXdmtvZE.jpg' },
  { tipo: 'f', titulo: 'Glass Onion: Um Mistério Knives Out', letra: 'G', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/zQJcENHbZUpLQ8RKYt9wTzcXCwv.jpg' },
  { tipo: 'f', titulo: 'Enola Holmes', letra: 'E', ano: '2020', capa: 'https://image.tmdb.org/t/p/w342/riYInlsq2kf1AWoGm80JQW5dLKp.jpg' },
  { tipo: 'f', titulo: 'Rebel Moon - Parte 1: A Menina do Fogo', letra: 'R', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/sPmGw8DOpH856QjhCfetSK9yzI5.jpg' },
  { tipo: 'f', titulo: 'Não Olhe para Cima', letra: 'N', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/6Sc7Tjt7aPsdghYK32mDMFeZkqJ.jpg' },
  { tipo: 'f', titulo: 'Agente Oculto', letra: 'A', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/1f10KUKW7KyNt8bF8NHmwbBQ9fs.jpg' },
  { tipo: 's', titulo: 'Bebe Rena', letra: 'B', ano: '2024', capa: 'https://image.tmdb.org/t/p/w342/5Qsao5QaFFu3BlFgUhB5asp4dzb.jpg' },
  { tipo: 's', titulo: 'Dahmer: Um Canibal Americano', letra: 'D', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/b0yY2BOCprAI1Ug3JASheUrfATY.jpg' },
  { tipo: 's', titulo: 'Mindhunter', letra: 'M', ano: '2017', capa: 'https://image.tmdb.org/t/p/w342/fbKE87mojpIETWepSbD5Qt741fp.jpg' },
  { tipo: 's', titulo: 'Treta', letra: 'T', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/oJJ3sJBpbCzq2t6hKccqDcMJc7v.jpg' },
];

export const ITENS_SAGAS_HEROIS: ItemDestaque[] = [
  { tipo: 'f', titulo: 'Vingadores: Ultimato', letra: 'V', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/q6725aR8Zs4IwGMXzZT8aC8lh41.jpg' },
  { tipo: 'f', titulo: 'Homem-Aranha: Sem Volta Para Casa', letra: 'H', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/xaKydnMw6wR1MBAjS5seGPVusbs.jpg' },
  { tipo: 'f', titulo: 'Batman: O Cavaleiro das Trevas', letra: 'B', ano: '2008', capa: 'https://image.tmdb.org/t/p/w342/4lj1ikfsSmMZNyfdi8R8Tv5tsgb.jpg' },
  { tipo: 'f', titulo: 'Coringa', letra: 'C', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/xLxgVxFWvb9hhUyCDDXxRPPnFck.jpg' },
  { tipo: 'f', titulo: 'Deadpool (2016)', letra: 'D', ano: '2016', capa: 'https://image.tmdb.org/t/p/w342/tekExNqal2kcHp8BKiHX5jjxK9J.jpg' },
  { tipo: 'f', titulo: 'Homem de Ferro (2008)', letra: 'H', ano: '2008', capa: 'https://image.tmdb.org/t/p/w342/mqN7RxojEiPoh3FTSTwOtwg7KAu.jpg' },
  { tipo: 'f', titulo: 'Pantera Negra (2018)', letra: 'P', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/ubXNpxL2ASSzY0f8Hxv08pOsV2L.jpg' },
  { tipo: 'f', titulo: 'Harry Potter e a Pedra Filosofal', letra: 'H', ano: '2001', capa: 'https://image.tmdb.org/t/p/w342/4rtsbE9aQ1qw4gv7yYwaNYfWFoS.jpg' },
  { tipo: 'f', titulo: 'O Senhor dos Anéis: A Sociedade do Anel', letra: 'O', ano: '2001', capa: 'https://image.tmdb.org/t/p/w342/tlvsNCwWEIgwAM23aNzTmMIcPEZ.jpg' },
  { tipo: 'f', titulo: 'John Wick 4: Baba Yaga', letra: 'J', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/rXTqhpkpj6E0YilQ49PK1SSqLhm.jpg' },
  { tipo: 'f', titulo: 'Velozes e Furiosos 7 (2015)', letra: 'V', ano: '2015', capa: 'https://image.tmdb.org/t/p/w342/spydMyyD81HjGJVwZvjajkrWW1h.jpg' },
  { tipo: 'f', titulo: 'Star Wars: O Despertar da Força (2015)', letra: 'S', ano: '2015', capa: 'https://image.tmdb.org/t/p/w342/lqMDbo4rXnakFgc4C6LzPv6pG7F.jpg' },
  { tipo: 'f', titulo: 'Interestelar', letra: 'I', ano: '2014', capa: 'https://image.tmdb.org/t/p/w342/tR1XVa5bxgdh2bRw2u0DzrgkO2l.jpg' },
  { tipo: 'f', titulo: 'O Poderoso Chefão', letra: 'O', ano: '1972', capa: 'https://image.tmdb.org/t/p/w342/wOMxE93W6KcZTuCeNUByNTSaLLt.jpg' },
  { tipo: 'f', titulo: 'Pulp Fiction: Tempo de Violência', letra: 'P', ano: '1994', capa: 'https://image.tmdb.org/t/p/w342/tptjnB2LDbuUWya9Cx5sQtv5hqb.jpg' },
  { tipo: 'f', titulo: 'Gladiador', letra: 'G', ano: '2000', capa: 'https://image.tmdb.org/t/p/w342/4DUClyGA6OqjXv6yC0Imf6THGfp.jpg' },
  { tipo: 'f', titulo: 'Matrix', letra: 'M', ano: '1999', capa: 'https://image.tmdb.org/t/p/w342/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg' },
  { tipo: 'f', titulo: 'Avatar (2009)', letra: 'A', ano: '2009', capa: 'https://image.tmdb.org/t/p/w342/lRRMQhlOLM9xgvjKKFndOmptqKR.jpg' },
  { tipo: 'f', titulo: 'Top Gun Ases indomaveis', letra: 'T', ano: '1986', capa: 'https://image.tmdb.org/t/p/w342/dDrMtnVgtDeecIgNchb9F8JcO5w.jpg' },
  { tipo: 'f', titulo: 'Oppenheimer (2023)', letra: 'O', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/uqrrZICcZFHqlNuZIR3iM1h0Rst.jpg' },
  { tipo: 'f', titulo: 'Duna', letra: 'D', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg' },
];

export const ITENS_SERIES_PREMIADAS: ItemDestaque[] = [
  { tipo: 's', titulo: 'Breaking Bad', letra: 'B', ano: '2008', capa: 'https://image.tmdb.org/t/p/w342/hGwm9Cj3CdbJIqQWNExQqiYmCd4.jpg' },
  { tipo: 's', titulo: 'Game of Thrones', letra: 'G', ano: '2011', capa: 'https://image.tmdb.org/t/p/w342/aqomTRKjNZkmNEeOZnEmWrFTmKU.jpg' },
  { tipo: 's', titulo: 'The Last of Us', letra: 'T', ano: '2023', capa: 'https://image.tmdb.org/t/p/w342/ieMLFFCwdep90d67kOT0oFtv2yX.jpg' },
  { tipo: 's', titulo: 'Chernobyl', letra: 'C', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg' },
  { tipo: 's', titulo: 'Better Call Saul', letra: 'B', ano: '2015', capa: 'https://image.tmdb.org/t/p/w342/tFCPd8nOqrxjKpTs0ZAdPRydQFR.jpg' },
  { tipo: 's', titulo: 'The Boys', letra: 'T', ano: '2019', capa: 'https://image.tmdb.org/t/p/w342/in1R2dDc421JxsoRWaIIAqVI2KE.jpg' },
  { tipo: 's', titulo: 'Rick e Morty', letra: 'R', ano: '2013', capa: 'https://image.tmdb.org/t/p/w342/5qfd0e2uMbVInX3YdeFbDsfxi1t.jpg' },
  { tipo: 's', titulo: 'Invencível', letra: 'I', ano: '2021', capa: 'https://image.tmdb.org/t/p/w342/4vzSdzQGvP0TIpQHNa4Ip6op0Ts.jpg' },
  { tipo: 's', titulo: 'A Casa do Dragão', letra: 'A', ano: '2022', capa: 'https://image.tmdb.org/t/p/w342/oKJDm4QCKbp6mR4FnxXrFlPJP8Y.jpg' },
  { tipo: 's', titulo: 'The Walking Dead', letra: 'T', ano: '2010', capa: 'https://image.tmdb.org/t/p/w342/9lb02gTh4LLB17yAEXFd4C3R4JP.jpg' },
  { tipo: 's', titulo: 'Vikings', letra: 'V', ano: '2013', capa: 'https://image.tmdb.org/t/p/w342/bQLrHIRNEkE3PdIWQrZHynQZazu.jpg' },
  { tipo: 's', titulo: 'Succession', letra: 'S', ano: '2018', capa: 'https://image.tmdb.org/t/p/w342/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg' },
  { tipo: 's', titulo: 'True Detective', letra: 'T', ano: '2014', capa: 'https://image.tmdb.org/t/p/w342/1fxr55V72a2gtqyn2b8pf6FslOf.jpg' },
  { tipo: 's', titulo: 'Xogum A Gloriosa Saga do Japao', letra: 'X', ano: '2024', capa: 'https://image.tmdb.org/t/p/w342/gaOb9hyCDUcbZiTYcHy7mIFmNo.jpg' },
  { tipo: 's', titulo: 'Dexter', letra: 'D', ano: '2006', capa: 'https://image.tmdb.org/t/p/w342/f1nV5NBIFwfQLw5g8FVrdt90FAy.jpg' },
  { tipo: 's', titulo: 'Supernatural', letra: 'S', ano: '2005', capa: 'https://image.tmdb.org/t/p/w342/ygS9SupLrUdERIiSfAYu7EC6dmw.jpg' },
];

export function chaveDeDeduplicacao(titulo: string): string {
  return titulo
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    .replace(/\s*-\s*leg(endado)?/gi, '')
    .replace(/\s*-\s*dub(lado)?/gi, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

let filasEmMemoria: FilaDestaque[] | null = null;

function extrairLetra(titulo: string): string {
  const norm = titulo.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();
  const primeira = norm.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(primeira) ? primeira : '#';
}

export async function destaques(): Promise<FilaDestaque[]> {
  sincronizar();
  if (filasEmMemoria) return filasEmMemoria;

  const [textoDestaques, textoNovidades] = await Promise.all([
    arquivo('destaques.txt'),
    arquivo('novidades.json'),
  ]);

  if (!textoDestaques && !textoNovidades) return [];

  const filas: FilaDestaque[] = [];
  const vistosGlobal = new Set<string>();

  // 1. Registrar filmes e séries da Netflix, Sagas e Séries Premiadas na desduplicação global
  for (const n of ITENS_NETFLIX_CURADOS) {
    vistosGlobal.add(`${n.tipo}|${chaveDeDeduplicacao(n.titulo)}`);
  }
  filas.push({ titulo: 'Originais & Sucessos Netflix 🔴', itens: ITENS_NETFLIX_CURADOS });

  for (const s of ITENS_SAGAS_HEROIS) {
    vistosGlobal.add(`${s.tipo}|${chaveDeDeduplicacao(s.titulo)}`);
  }
  filas.push({ titulo: 'Grandes Sagas & Super-Heróis 🍿', itens: ITENS_SAGAS_HEROIS });

  for (const sp of ITENS_SERIES_PREMIADAS) {
    vistosGlobal.add(`${sp.tipo}|${chaveDeDeduplicacao(sp.titulo)}`);
  }
  filas.push({ titulo: 'Séries Aclamadas & HBO/Max 🏆', itens: ITENS_SERIES_PREMIADAS });

  // 2. Processar Novidades Recentes (sem repetir nada da Netflix, Sagas ou entre si)
  if (textoNovidades) {
    try {
      const novidades = JSON.parse(textoNovidades);
      const capaBase = novidades.capa || 'https://image.tmdb.org/t/p/w342';
      const recemAdicionados: ItemDestaque[] = [];
      const filmes2026: ItemDestaque[] = [];
      const series2026: ItemDestaque[] = [];
      const seriesNovas: ItemDestaque[] = [];

      for (const r of novidades.rodadas || []) {
        for (const ad of r.adicionados || []) {
          if (!ad.t || !ad.capa) continue;
          const chave = `${ad.tp || 'f'}|${chaveDeDeduplicacao(ad.t)}`;
          if (vistosGlobal.has(chave)) continue;
          vistosGlobal.add(chave);

          const item: ItemDestaque = {
            tipo: ad.tp || 'f',
            titulo: ad.t,
            letra: extrairLetra(ad.t),
            ano: ad.ano || '',
            capa: ad.capa.startsWith('http') ? ad.capa : `${capaBase}${ad.capa}`,
          };

          if (ad.ano === '2026' || ad.t.includes('2026')) {
            if (ad.tp === 's') {
              if (series2026.length < 100) series2026.push(item);
            } else {
              if (filmes2026.length < 300) filmes2026.push(item);
            }
          } else if (ad.tp === 's') {
            if (seriesNovas.length < 250) seriesNovas.push(item);
          } else {
            if (recemAdicionados.length < 250) recemAdicionados.push(item);
          }
        }

        for (const at of r.atualizados || []) {
          if (!at.t || !at.capa) continue;
          const chave = `${at.tp || 's'}|${chaveDeDeduplicacao(at.t)}`;
          if (vistosGlobal.has(chave)) continue;
          vistosGlobal.add(chave);

          const item: ItemDestaque = {
            tipo: at.tp || 's',
            titulo: at.t,
            letra: extrairLetra(at.t),
            ano: at.ano || '',
            capa: at.capa.startsWith('http') ? at.capa : `${capaBase}${at.capa}`,
          };
          if (at.ano === '2026' || at.t.includes('2026')) {
            if (series2026.length < 100) series2026.push(item);
          } else {
            if (seriesNovas.length < 250) seriesNovas.push(item);
          }
        }
      }

      if (filmes2026.length >= 4) {
        filas.push({ titulo: 'Lançamentos de Cinema 2026 🚀', itens: filmes2026 });
      }
      if (series2026.length >= 2) {
        filas.push({ titulo: 'Novas Séries de 2026 🍿', itens: series2026 });
      }
      if (recemAdicionados.length >= 4) {
        filas.push({ titulo: 'Recém-Adicionados no Acervo', itens: recemAdicionados });
      }
      if (seriesNovas.length >= 4) {
        filas.push({ titulo: 'Séries com Novos Episódios', itens: seriesNovas });
      }
    } catch {
      // Segue para destaques.txt se novidades.json falhar
    }
  }

  // 3. Processar Destaques do arquivo destaques.txt (puxando mais itens únicos sem repetir)
  if (textoDestaques) {
    let titulo: string | null = null;
    let itens: ItemDestaque[] = [];
    let base = '';

    const fechar = () => {
      if (titulo && itens.length) {
        filas.push({ titulo, itens });
      }
      itens = [];
    };

    for (const linha of textoDestaques.split('\n')) {
      if (!linha.trim() || linha.startsWith('#')) continue;
      if (linha.startsWith('capa:')) { base = linha.slice('capa:'.length).trim(); continue; }
      if (linha.startsWith('fila\t')) { fechar(); titulo = linha.slice('fila\t'.length).trim(); continue; }
      const campos = linha.split('\t');
      if (campos.length < 3) continue;
      const poster = campos[4] ?? '';
      const t = campos[1];
      const tipo = campos[0]?.charAt(0) || 'f';
      const chave = `${tipo}|${chaveDeDeduplicacao(t)}`;
      if (vistosGlobal.has(chave)) continue; // Elimina qualquer repetição de filme já exibido
      vistosGlobal.add(chave);

      itens.push({
        tipo,
        titulo: t,
        letra: campos[2],
        ano: campos[3] ?? '',
        capa: poster ? (poster.startsWith('http') ? poster : base + poster) : '',
      });
    }
    fechar();
  }

  filasEmMemoria = filas;
  return filas;
}

/**
 * O gênero de cada título: Ação, Terror, Animação, Comédia.
 *
 * O catálogo não tem gênero — as listas de origem trazem nome e endereço, nada
 * mais. Perguntar ao TMDB por trinta e quatro mil títulos, no navegador de cada
 * pessoa, é uma tela que nunca abre. A pergunta é feita uma vez no repositório
 * (`gerar_generos.py`) e chega aqui pronta, no mesmo arquivo que os aplicativos
 * leem.
 */
export interface Generos {
  /** "f|Nome" ou "s|Nome" -> os gêneros dele. */
  mapa: Map<string, string[]>;
  /** "f|Nome" ou "s|Nome" -> o endereço do pôster, quando o TMDB conhece. */
  capas: Map<string, string>;
  /**
   * "f|Nome" ou "s|Nome" -> o id do TMDB. Com ele, a ficha completa de um
   * título é um pedido só, sem busca por nome nem desempate.
   */
  ids: Map<string, number>;
  /**
   * O caminho inverso: id do TMDB -> título do acervo. É assim que a
   * filmografia de um ator vira uma lista clicável — só entra o que existe
   * aqui dentro. Série entra com o id negativo, para não colidir com o filme
   * de mesmo número.
   */
  porId: Map<number, string>;
  /** Todos os que aparecem no acervo, em ordem. */
  todos: string[];
}

let generosEmMemoria: Generos | null = null;

export async function generos(): Promise<Generos> {
  sincronizar();
  if (generosEmMemoria) return generosEmMemoria;
  const texto = await arquivo('fichas.txt');
  const mapa = new Map<string, string[]>();
  const capas = new Map<string, string>();
  const ids = new Map<string, number>();
  const porId = new Map<number, string>();
  const vistos = new Set<string>();
  let base = '';
  // tipo \t título \t id do TMDB \t pôster \t gêneros
  for (const linha of (texto ?? '').split('\n')) {
    if (!linha) continue;
    if (linha.startsWith('capa:')) { base = linha.slice('capa:'.length).trim(); continue; }
    if (linha.startsWith('#')) continue;
    const campos = linha.split('\t');
    if (campos.length < 5) continue;
    const chave = `${campos[0]}|${campos[1]}`;
    if (campos[3]) capas.set(chave, base + campos[3]);
    const id = Number(campos[2]);
    if (Number.isFinite(id) && id > 0) {
      ids.set(chave, id);
      const marca = campos[0] === 's' ? -id : id;
      // Um mesmo id pode aparecer duas vezes no acervo (o mesmo filme em duas
      // grafias); o primeiro basta.
      if (!porId.has(marca)) porId.set(marca, campos[1]);
    }
    const lista = campos[4].split(',').map((g) => g.trim()).filter(Boolean);
    if (!lista.length) continue;
    mapa.set(chave, lista);
    lista.forEach((g) => vistos.add(g));
  }
  generosEmMemoria = {
    mapa, capas, ids, porId,
    todos: [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
  return generosEmMemoria;
}

/** O título sem o ano final, que é como a lista de gêneros o guarda. */
export function semAno(titulo: string): string {
  return titulo.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

/**
 * A chave é o nome como o acervo o escreve — e o acervo escreve o ano dentro do
 * nome do filme, mas guarda o da série num campo à parte. Quem chama nem sempre
 * sabe de qual dos dois veio, então procura-se o nome como ele chegou e, não
 * achando, sem o ano.
 */
/** Chaves candidatas para casamento tolerante a pontuação e espaços em fichas.txt */
function chavesCandidatas(marca: string, titulo: string): string[] {
  const sAno = semAno(titulo);
  const chaves = new Set<string>();
  for (const t of [titulo, sAno]) {
    if (!t) continue;
    chaves.add(`${marca}|${t}`);
    // Variações de vírgula (com espaço / sem espaço)
    chaves.add(`${marca}|${t.replace(/,\s*/g, ', ')}`);
    chaves.add(`${marca}|${t.replace(/,\s*/g, ',')}`);
    // Variações de dois pontos
    chaves.add(`${marca}|${t.replace(/:\s*/g, ': ')}`);
    chaves.add(`${marca}|${t.replace(/:\s*/g, ':')}`);
    // Sem pontuação (dois pontos, traços - ex: Demon Slayer: Kimetsu no Yaiba -> Demon Slayer Kimetsu no Yaiba)
    chaves.add(`${marca}|${t.replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim()}`);
    chaves.add(`${marca}|${t.replace(/[:\-–—]/g, '').replace(/\s+/g, ' ').trim()}`);
    // Espaços em branco normais
    chaves.add(`${marca}|${t.replace(/\s+/g, ' ').trim()}`);
  }
  return [...chaves];
}

/**
 * O pôster de um título, pelo id que o gerador já resolveu.
 *
 * Antes a capa era procurada pelo nome no TMDB, no navegador de cada pessoa:
 * lento, e errado quando dois filmes se chamam igual. Quem não tem ficha fica
 * sem capa, e a tela põe uma marca no lugar.
 */
export function capaDaFicha(g: Generos, titulo: string, serie: boolean, tmdbId?: string | number): string | null {
  const marca = serie ? 's' : 'f';
  for (const c of chavesCandidatas(marca, titulo)) {
    const val = g.capas.get(c);
    if (val) return val;
  }
  if (tmdbId) {
    const numId = Number(tmdbId);
    if (Number.isFinite(numId) && numId > 0) {
      const orig = g.porId.get(serie ? -numId : numId);
      if (orig) {
        const val = g.capas.get(`${marca}|${orig}`);
        if (val) return val;
      }
    }
  }
  return null;
}

/** O id do TMDB de um título, quando o gerador o resolveu. */
export function idDaFicha(g: Generos, titulo: string, serie: boolean): number | null {
  const marca = serie ? 's' : 'f';
  for (const c of chavesCandidatas(marca, titulo)) {
    const val = g.ids.get(c);
    if (val) return val;
  }
  return null;
}

/** O título do acervo que corresponde a um id do TMDB, se houver. */
export function tituloDoId(g: Generos, id: number, serie: boolean): string | null {
  return g.porId.get(serie ? -id : id) ?? null;
}

export function temGenero(g: Generos, titulo: string, serie: boolean, genero: string, tmdbId?: string | number): boolean {
  if (!genero) return true;
  const marca = serie ? 's' : 'f';
  let lista: string[] | undefined;
  for (const c of chavesCandidatas(marca, titulo)) {
    lista = g.mapa.get(c);
    if (lista) break;
  }
  if (!lista && tmdbId) {
    const numId = Number(tmdbId);
    if (Number.isFinite(numId) && numId > 0) {
      const orig = g.porId.get(serie ? -numId : numId);
      if (orig) {
        lista = g.mapa.get(`${marca}|${orig}`);
      }
    }
  }
  if (!lista) return false;
  if (lista.includes(genero)) return true;
  // Casamento flexível para categorias compostas de TV do TMDB
  if (genero === 'Ação' || genero === 'Aventura') {
    return lista.includes('Ação e aventura') || lista.includes('Ação') || lista.includes('Aventura');
  }
  if (genero === 'Ficção científica' || genero === 'Fantasia') {
    return lista.includes('Ficção e fantasia') || lista.includes('Ficção científica') || lista.includes('Fantasia');
  }
  return false;
}
