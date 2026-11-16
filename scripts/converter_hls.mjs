/**
 * Converte qualquer arquivo de vídeo (MP4/MKV) para HLS otimizado para streaming na web e Smart TVs.
 * Gera chunks segmentados em .m3u8 com áudio AAC estéreo de alta fidelidade.
 *
 * Exemplo de uso:
 *   node scripts/converter_hls.mjs "C:\\meus-videos\\filme.mp4" "meu-filme"
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log(`
Uso: node scripts/converter_hls.mjs "<caminho_do_video.mp4>" [nome_da_pasta_de_saida]
`);
  process.exit(1);
}

const arquivoEntrada = args[0];
const nomeSaida = args[1] || path.basename(arquivoEntrada, path.extname(arquivoEntrada));
const pastaSaida = path.resolve('streams', nomeSaida);

if (!fs.existsSync(pastaSaida)) {
  fs.mkdirSync(pastaSaida, { recursive: true });
}

console.log(`Convertendo "${arquivoEntrada}" para HLS em "${pastaSaida}"...`);

const ffmpegArgs = [
  '-i', arquivoEntrada,
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '160k',
  '-ac', '2',
  '-f', 'hls',
  '-hls_time', '6',
  '-hls_playlist_type', 'vod',
  '-hls_segment_filename', path.join(pastaSaida, 'segmento_%03d.ts'),
  path.join(pastaSaida, 'master.m3u8'),
];

const ff = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

ff.on('close', (code) => {
  if (code === 0) {
    console.log(`
✨ Conversão HLS concluída com sucesso!
Pasta gerada: ${pastaSaida}
Arquivo master: ${path.join(pastaSaida, 'master.m3u8')}

Próximos passos para subir no Cloudflare R2 / BunnyCDN:
1. Faça o upload da pasta "${nomeSaida}" para o seu bucket no Cloudflare R2.
2. A URL de acesso será: https://<SEU_DOMINIO_OU_R2>/${nomeSaida}/master.m3u8
3. Adicione o filme ao CinePlay rodando:
   node scripts/adicionar_filme.mjs "Nome do Filme" "https://<SEU_DOMINIO_OU_R2>/${nomeSaida}/master.m3u8"
`);
  } else {
    console.error(`Erro na conversão do ffmpeg (código ${code})`);
  }
});
