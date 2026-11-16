import { useState, useRef } from 'react';
import { BarraTopo } from '../components/BarraTopo';
import { useNavigate } from 'react-router-dom';
import './Studio.css';

interface FilmePublicado {
  id: string;
  titulo: string;
  ano: string;
  versao: string;
  streamUrl: string;
  posterUrl: string;
  data: string;
}

const FILMES_INICIAIS: FilmePublicado[] = [
  {
    id: 'cineplay-a-origem-2026',
    titulo: 'CinePlay: A Origem (2026)',
    ano: '2026',
    versao: 'DUB',
    streamUrl: 'https://kqfmahrxjuqlvxngeurj.supabase.co/storage/v1/object/public/cineplay-videos/cineplay-a-origem-2026/master.m3u8',
    posterUrl: 'https://kqfmahrxjuqlvxngeurj.supabase.co/storage/v1/object/public/cineplay-videos/cineplay-a-origem-2026/poster.jpg',
    data: 'Hoje',
  },
];

const SUPABASE_URL = 'https://kqfmahrxjuqlvxngeurj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm1haHJ4anVxbHZ4bmdldXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDY2MTcsImV4cCI6MjA5MzgyMjYxN30.hQUfMD0TJIG-RE5SAlKaXBiR4HQQrH2JQZyQx4mASvs';

export function Studio() {
  const navigate = useNavigate();
  const [filmes, setFilmes] = useState<FilmePublicado[]>(() => {
    try {
      const salvo = localStorage.getItem('cineplay-studio-filmes');
      return salvo ? JSON.parse(salvo) : FILMES_INICIAIS;
    } catch {
      return FILMES_INICIAIS;
    }
  });

  const [titulo, setTitulo] = useState('');
  const [ano, setAno] = useState('2026');
  const [versao, setVersao] = useState<'DUB' | 'LEG'>('DUB');
  const [streamUrl, setStreamUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [arquivoVideo, setArquivoVideo] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const salvarFilmes = (novos: FilmePublicado[]) => {
    setFilmes(novos);
    localStorage.setItem('cineplay-studio-filmes', JSON.stringify(novos));
  };

  const handleUploadEAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setEnviando(true);
    setProgresso(10);

    try {
      let finalStreamUrl = streamUrl.trim();
      let finalPosterUrl = posterUrl.trim();
      const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Se enviou arquivo direto pelo browser, sobe no Supabase Storage
      if (arquivoVideo) {
        setProgresso(30);
        const caminhoRemoto = `${slug}/${arquivoVideo.name}`;
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/cineplay-videos/${caminhoRemoto}`, {
          method: 'POST',
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': arquivoVideo.type || 'video/mp4',
            'x-upsert': 'true',
          },
          body: arquivoVideo,
        });

        if (!res.ok) {
          throw new Error('Falha no upload do arquivo');
        }
        setProgresso(80);
        finalStreamUrl = `${SUPABASE_URL}/storage/v1/object/public/cineplay-videos/${caminhoRemoto}`;
      }

      if (!finalPosterUrl) {
        finalPosterUrl = '/abertura/poster.jpg';
      }

      const novoFilme: FilmePublicado = {
        id: slug || Date.now().toString(),
        titulo: titulo.includes(`(${ano})`) ? titulo : `${titulo} (${ano})`,
        ano,
        versao,
        streamUrl: finalStreamUrl,
        posterUrl: finalPosterUrl,
        data: 'Agora',
      };

      const listaAtualizada = [novoFilme, ...filmes];
      salvarFilmes(listaAtualizada);

      setProgresso(100);
      setMsgSucesso(`✨ Filme "${novoFilme.titulo}" adicionado com sucesso!`);
      setTitulo('');
      setStreamUrl('');
      setPosterUrl('');
      setArquivoVideo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        setProgresso(null);
        setEnviando(false);
      }, 1500);
    } catch (err: any) {
      alert(`Erro ao adicionar filme: ${err.message}`);
      setEnviando(false);
      setProgresso(null);
    }
  };

  return (
    <div className="studio-container">
      <BarraTopo />
      <div className="studio-conteudo">
        <div className="studio-cabecalho">
          <div>
            <h1 className="studio-titulo">🎬 CinePlay Studio</h1>
            <p className="studio-subtitulo">Central de controle e hospedagem própria de filmes e séries.</p>
          </div>
          <button className="studio-btn-voltar" onClick={() => navigate('/')}>
            ‹ Voltar ao CinePlay
          </button>
        </div>

        {/* Status da Infraestrutura */}
        <div className="studio-status-grid">
          <div className="studio-card-status ativo">
            <div className="status-icone">☁️</div>
            <div className="status-info">
              <span className="status-label">Servidor de Vídeo (Storage)</span>
              <span className="status-valor">Supabase Cloud (São Paulo, BR)</span>
              <span className="status-sub">Bucket: cineplay-videos • 0ms latência</span>
            </div>
          </div>

          <div className="studio-card-status ativo">
            <div className="status-icone">🌐</div>
            <div className="status-info">
              <span className="status-label">Catálogo Global</span>
              <span className="status-valor">GitHub + jsDelivr CDN</span>
              <span className="status-sub">uppiapp/cineplay-catalogo • 38.000+ títulos</span>
            </div>
          </div>

          <div className="studio-card-status ativo">
            <div className="status-icone">⚡</div>
            <div className="status-info">
              <span className="status-label">Plataforma Web</span>
              <span className="status-valor">Vercel Production</span>
              <span className="status-sub">cineplay-rust.vercel.app • HTTPS / CORS Ativo</span>
            </div>
          </div>
        </div>

        {/* Formulário de Adição */}
        <div className="studio-secao">
          <h2 className="secao-titulo">Publicar Novo Filme</h2>
          <form className="studio-form" onSubmit={handleUploadEAdd}>
            <div className="form-grid">
              <div className="campo">
                <label>Título do Filme</label>
                <input
                  type="text"
                  placeholder="Ex: Avatar 3 ou Meu Filme Exclusivo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="campo pequeno">
                <label>Ano</label>
                <input
                  type="text"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  required
                />
              </div>

              <div className="campo pequeno">
                <label>Áudio Padrão</label>
                <select value={versao} onChange={(e) => setVersao(e.target.value as 'DUB' | 'LEG')}>
                  <option value="DUB">🇧🇷 Português (Dublado)</option>
                  <option value="LEG">🇺🇸 Legendado</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="campo">
                <label>Arquivo de Vídeo (MP4 direto)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => setArquivoVideo(e.target.files?.[0] || null)}
                />
                <span className="dica">Faz upload direto para seus servidores na nuvem.</span>
              </div>

              <div className="campo">
                <label>Ou URL direta de Vídeo / HLS (.m3u8)</label>
                <input
                  type="url"
                  placeholder="https://.../master.m3u8 ou .mp4"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>URL do Pôster / Capa (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://.../poster.jpg"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                />
              </div>
            </div>

            {progresso !== null && (
              <div className="progresso-container">
                <div className="barra-progresso" style={{ width: `${progresso}%` }}></div>
                <span>{progresso}% Concluído</span>
              </div>
            )}

            {msgSucesso && <div className="aviso-sucesso">{msgSucesso}</div>}

            <div className="form-acoes">
              <button type="submit" className="btn-publicar" disabled={enviando}>
                {enviando ? 'Enviando...' : '🚀 Publicar no CinePlay'}
              </button>
            </div>
          </form>
        </div>

        {/* Gerenciador de Linha de Comando */}
        <div className="studio-secao box-terminal">
          <h2 className="secao-titulo">⚙️ Publicação Automatizada via Terminal (FFmpeg + HLS)</h2>
          <p>Para arquivos grandes de alta definição, converta em HLS e publique em 1 único comando no seu terminal:</p>
          <div className="codigo-box">
            <code>node scripts/publicar_filme_completo.mjs "caminho/do/filme.mp4" "Nome do Filme (2026)" 2026 dub</code>
          </div>
        </div>

        {/* Filmes Hospedados */}
        <div className="studio-secao">
          <h2 className="secao-titulo">Filmes Próprios Publicados ({filmes.length})</h2>
          <div className="filmes-grid">
            {filmes.map((f) => (
              <div key={f.id} className="filme-card">
                <img src={f.posterUrl} alt={f.titulo} className="filme-poster" onError={(e) => { (e.target as HTMLImageElement).src = '/abertura/poster.jpg'; }} />
                <div className="filme-detalhes">
                  <div className="filme-badges">
                    <span className="badge-ano">{f.ano}</span>
                    <span className="badge-audio">{f.versao === 'DUB' ? '🇧🇷 Dublado' : 'Legendado'}</span>
                    <span className="badge-cloud">☁️ Nuvem Própria</span>
                  </div>
                  <h3 className="filme-nome">{f.titulo}</h3>
                  <p className="filme-url" title={f.streamUrl}>{f.streamUrl}</p>
                  <div className="filme-acoes">
                    <button className="btn-assistir" onClick={() => window.open(f.streamUrl, '_blank')}>
                      ▶ Testar Stream
                    </button>
                    <button className="btn-copiar" onClick={() => { navigator.clipboard.writeText(f.streamUrl); alert('URL copiada!'); }}>
                      📋 Copiar URL
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
export default Studio;
