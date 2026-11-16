import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ehAudioPortugues,
  ehAudioIngles,
  ehAudioEspanhol,
  selecionarAudioPortugues,
  formatarRotuloAudio,
} from '../src/utils/audioIdiomas.ts';

test('detecta áudio em português por código ou nome', () => {
  assert.equal(ehAudioPortugues({ lang: 'por', name: 'Portuguese' }), true);
  assert.equal(ehAudioPortugues({ lang: 'pt-BR', name: 'Português' }), true);
  assert.equal(ehAudioPortugues({ lang: 'pob', name: 'Brazilian' }), true);
  assert.equal(ehAudioPortugues({ lang: '', name: 'Dublado' }), true);
  assert.equal(ehAudioPortugues({ lang: 'spa', name: 'Spanish' }), false);
});

test('detecta áudio em inglês e espanhol', () => {
  assert.equal(ehAudioIngles({ lang: 'en', name: 'English' }), true);
  assert.equal(ehAudioIngles({ lang: 'eng', name: 'Original' }), true);
  assert.equal(ehAudioEspanhol({ lang: 'es', name: 'Spanish' }), true);
  assert.equal(ehAudioEspanhol({ lang: 'spa', name: 'Español' }), true);
});

test('seleciona automaticamente a faixa em português para La Casa de Papel e outros', () => {
  const tracksLaCasaDePapel = [
    { lang: 'spa', name: 'Spanish' },
    { lang: 'por', name: 'Portuguese' },
  ];
  assert.equal(selecionarAudioPortugues(tracksLaCasaDePapel), 1);

  const tracksNetflix = [
    { lang: 'eng', name: 'English (Original)' },
    { lang: 'spa', name: 'Spanish' },
    { lang: 'pt-BR', name: 'Portuguese (Brazil)' },
  ];
  assert.equal(selecionarAudioPortugues(tracksNetflix), 2);
});

test('formata rótulos de áudio com bandeiras e nomes amigáveis', () => {
  assert.equal(formatarRotuloAudio({ lang: 'por', name: 'Portuguese' }, 0), '🇧🇷 Português (Dublado)');
  assert.equal(formatarRotuloAudio({ lang: 'eng', name: 'English' }, 1), '🇺🇸 Inglês (Original)');
  assert.equal(formatarRotuloAudio({ lang: 'spa', name: 'Spanish' }, 2), '🇪🇸 Espanhol');
});
