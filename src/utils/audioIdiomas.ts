/**
 * Utilitários para seleção e padronização de faixas de áudio em Português (Dublado).
 * Garante que filmes, séries e canais de TV iniciem em Português por padrão,
 * permitindo ao usuário alternar para Inglês, Espanhol ou outros idiomas.
 */

export interface FaixaAudioInfo {
  id?: number;
  lang?: string;
  language?: string;
  name?: string;
  label?: string;
}

export function ehAudioPortugues(t: FaixaAudioInfo): boolean {
  if (!t) return false;
  const l = (t.lang || t.language || '').toLowerCase().trim();
  const n = (t.name || t.label || '').toLowerCase().trim();
  return (
    l === 'por' ||
    l === 'pt' ||
    l === 'pt-br' ||
    l === 'pt-pt' ||
    l === 'por-br' ||
    l === 'pob' ||
    l === 'ptb' ||
    l.startsWith('pt') ||
    l.startsWith('por') ||
    n.includes('portugu') ||
    n.includes('dublado') ||
    n.includes('brasil') ||
    n.includes('brazil') ||
    n.includes('dub')
  );
}

export function ehAudioIngles(t: FaixaAudioInfo): boolean {
  if (!t) return false;
  const l = (t.lang || t.language || '').toLowerCase().trim();
  const n = (t.name || t.label || '').toLowerCase().trim();
  return (
    l === 'eng' ||
    l === 'en' ||
    l === 'en-us' ||
    l === 'en-gb' ||
    l.startsWith('en') ||
    n.includes('engl') ||
    n.includes('ingl') ||
    n.includes('original')
  );
}

export function ehAudioEspanhol(t: FaixaAudioInfo): boolean {
  if (!t) return false;
  const l = (t.lang || t.language || '').toLowerCase().trim();
  const n = (t.name || t.label || '').toLowerCase().trim();
  return (
    l === 'spa' ||
    l === 'es' ||
    l === 'es-es' ||
    l === 'es-la' ||
    l === 'es-mx' ||
    l.startsWith('es') ||
    n.includes('span') ||
    n.includes('espanh') ||
    n.includes('español') ||
    n.includes('castellano')
  );
}

/**
 * Encontra o índice da melhor faixa de áudio em Português na lista de faixas.
 * Retorna o índice da faixa em português, ou -1 se não houver.
 */
export function selecionarAudioPortugues(tracks: ReadonlyArray<FaixaAudioInfo>): number {
  if (!tracks || tracks.length === 0) return -1;

  // 1. Prioridade máxima: Faixa explicitamente em Português (Dublado ou Brasil)
  const idxPt = tracks.findIndex(ehAudioPortugues);
  if (idxPt >= 0) return idxPt;

  // 2. Se nenhuma foi marcada como Português, mas existem faixas marcadas como
  // Espanhol ou Inglês, evita-as se houver uma faixa sem idioma definido (geralmente áudio local/dublado)
  const idxNaoEspNemIng = tracks.findIndex((t) => !ehAudioEspanhol(t) && !ehAudioIngles(t));
  if (idxNaoEspNemIng >= 0) return idxNaoEspNemIng;

  return -1;
}

/**
 * Formata o rótulo da faixa de áudio com bandeira e texto claro para o usuário.
 */
export function formatarRotuloAudio(t: FaixaAudioInfo, id: number): string {
  if (ehAudioPortugues(t)) {
    return '🇧🇷 Português (Dublado)';
  }
  if (ehAudioIngles(t)) {
    return '🇺🇸 Inglês (Original)';
  }
  if (ehAudioEspanhol(t)) {
    return '🇪🇸 Espanhol';
  }

  const l = (t.lang || t.language || '').toLowerCase().trim();
  const n = (t.name || t.label || '').toLowerCase().trim();

  if (l === 'fra' || l === 'fr' || n.includes('franc')) return '🇫🇷 Francês';
  if (l === 'ita' || l === 'it' || n.includes('ital')) return '🇮🇹 Italiano';
  if (l === 'jpn' || l === 'ja' || n.includes('jap')) return '🇯🇵 Japonês';
  if (l === 'kor' || l === 'ko' || n.includes('core')) return '🇰🇷 Coreano';
  if (l === 'deu' || l === 'ger' || l === 'de' || n.includes('alem')) return '🇩🇪 Alemão';
  if (l === 'rus' || l === 'ru' || n.includes('russ')) return '🇷🇺 Russo';
  if (l === 'zho' || l === 'chi' || l === 'zh' || n.includes('chin')) return '🇨🇳 Chinês';

  const nomeExibicao = t.name || t.label || t.lang || t.language;
  return nomeExibicao ? `🗣️ ${nomeExibicao}` : `🗣️ Áudio ${id + 1}`;
}
