import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const saida = join(mkdtempSync(join(tmpdir(), 'saimo-feat-')), 'bundle.mjs');
buildSync({
  stdin: {
    contents: "export * from './src/services/listas.ts'; export * from './src/services/eventos.ts';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: saida,
  logLevel: 'error',
});

const { PADRAO_CANAIS, PADRAO_FILMES, linkCanais, linkFilmes, buscarJogos } = await import(pathToFileURL(saida).href);

test('PADRAO_CANAIS e PADRAO_FILMES estão configurados para os novos endpoints', () => {
  assert.equal(PADRAO_CANAIS, 'https://canais-saimo.pages.dev/');
  assert.equal(PADRAO_FILMES, 'https://cdn.jsdelivr.net/gh/uppiapp/cineplay-catalogo@main/');
});

test('linkCanais e linkFilmes utilizam os endpoints padrão quando localStorage está vazio ou ausente', () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  assert.equal(linkCanais(), 'https://canais-saimo.pages.dev/');
  assert.equal(linkFilmes(), 'https://cdn.jsdelivr.net/gh/uppiapp/cineplay-catalogo@main/');
});

test('buscarJogos retorna eventos da ESPN com canais esportivos mapeados quando streaming está vazio', async () => {
  const canaisMock = [
    { id: 'espn-1', name: 'ESPN', url: 'https://cdn.exemplo/espn.m3u8', category: 'Esportes', channelNumber: 1, sources: [] },
    { id: 'premiere-1', name: 'Premiere Clubes', url: 'https://cdn.exemplo/premiere.m3u8', category: 'Esportes', channelNumber: 2, sources: [] },
    { id: 'sportv-1', name: 'SporTV HD', url: 'https://cdn.exemplo/sportv.m3u8', category: 'Esportes', channelNumber: 3, sources: [] },
  ];

  globalThis.fetch = async (url) => {
    if (String(url).includes('eventos-extra.json')) {
      return { ok: true, json: async () => [] };
    }
    if (String(url).includes('scoreboard')) {
      return {
        ok: true,
        json: async () => ({
          leagues: [{ name: 'Brasileirão Betano', abbreviation: 'BRA1', logos: [{ href: 'https://logo.exemplo/bra1.png' }] }],
          events: [
            {
              date: new Date(Date.now() + 3600000).toISOString(),
              status: { type: { state: 'pre', shortDetail: '16:00' } },
              competitions: [
                {
                  competitors: [
                    { homeAway: 'home', score: '0', team: { name: 'Flamengo', logo: 'https://logo.exemplo/fla.png' } },
                    { homeAway: 'away', score: '0', team: { name: 'Palmeiras', logo: 'https://logo.exemplo/pal.png' } },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return { ok: false };
  };

  const jogos = await buscarJogos(canaisMock);
  assert.ok(Array.isArray(jogos));
  assert.ok(jogos.length > 0);
  const flaXPal = jogos.find(j => j.casa === 'Flamengo' && j.fora === 'Palmeiras');
  assert.ok(flaXPal, 'Encontrou jogo do Flamengo x Palmeiras');
  assert.equal(flaXPal.canal.name, 'Premiere Clubes');
  assert.equal(flaXPal.casaLogo, 'https://logo.exemplo/fla.png');
  assert.equal(flaXPal.foraLogo, 'https://logo.exemplo/pal.png');
  assert.equal(flaXPal.liga, 'Brasileirão Betano');
});
