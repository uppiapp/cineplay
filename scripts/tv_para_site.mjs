import { mkdirSync, writeFileSync } from 'node:fs';

try {
  mkdirSync('dist/tv', { recursive: true });
  const headers = `/tv/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=60
/telemetria.json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=600
/fontes-desativadas.json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=600
/eventos-extra.json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=600
`;
  writeFileSync('dist/_headers', headers, 'utf8');
  console.log('✓ dist/tv e dist/_headers configurados com sucesso.');
} catch (e) {
  console.warn('Aviso tv_para_site:', e.message);
}
