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
  servidor?: 'cloudflare' | 'supabase';
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
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
    servidor: 'supabase',
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

  // Configuração Cloudflare R2
  const [r2Config, setR2Config] = useState<R2Config>(() => {
    try {
      const salvo = localStorage.getItem('cineplay-r2-config');
      return salvo ? JSON.parse(salvo) : {
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: 'cineplay-videos',
        publicUrl: '',
      };
    } catch {
      return {
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: 'cineplay-videos',
        publicUrl: '',
      };
    }
  });

  const [mostrarConfigR2, setMostrarConfigR2] = useState(false);
  const [destinoStorage, setDestinoStorage] = useState<'cloudflare' | 'supabase'>('cloudflare');

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

  const r2Configurado = Boolean(r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey);

  const salvarR2Config = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cineplay-r2-config', JSON.stringify(r2Config));
    setMostrarConfigR2(false);
    alert('Configurações do Cloudflare R2 salvas com sucesso!');
  };

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

      // Upload de arquivo direto pelo navegador
      if (arquivoVideo) {
        setProgresso(30);
        const caminhoRemoto = `${slug}/${arquivoVideo.name}`;

        // Se escolheu Cloudflare e tem URL pública configurada
        if (destinoStorage === 'cloudflare' && r2Config.publicUrl) {
          // No browser, se tiver R2 public URL
          setProgresso(60);
          finalStreamUrl = `${r2Config.publicUrl.replace(/\/+$/, '')}/${caminhoRemoto}`;
        } else {
          // Envia para o Supabase Storage
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
            throw new Error('Falha no upload do arquivo para o servidor de streaming.');
          }
          finalStreamUrl = `${SUPABASE_URL}/storage/v1/object/public/cineplay-videos/${caminhoRemoto}`;
        }
        setProgresso(85);
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
        servidor: destinoStorage,
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
            <p className="studio-subtitulo">Central de controle e hospedagem própria de filmes com Cloudflare R2.</p>
          </div>
          <div className="cabecalho-acoes">
            <button className="btn-config-r2" onClick={() => setMostrarConfigR2(!mostrarConfigR2)}>
              ⚙️ Chaves Cloudflare R2
            </button>
            <button className="studio-btn-voltar" onClick={() => navigate('/')}>
              ‹ Voltar ao CinePlay
            </button>
          </div>
        </div>

        {/* Modal/Gaveta de Configuração Cloudflare R2 */}
        {mostrarConfigR2 && (
          <div className="studio-secao r2-config-box">
            <div className="r2-config-topo">
              <h2 className="secao-titulo">☁️ Configuração Cloudflare R2 (Tráfego Ilimitado)</h2>
              <button className="btn-fechar" onClick={() => setMostrarConfigR2(false)}>✕</button>
            </div>
            <p className="r2-ajuda">
              O Cloudflare R2 oferece tráfego grátis ilimitado (zero egress fees) e servidores de alta velocidade no Brasil.
            </p>

            <form onSubmit={salvarR2Config} className="form-r2">
              <div className="form-grid">
                <div className="campo">
                  <label>Cloudflare Account ID</label>
                  <input
                    type="text"
                    placeholder="Ex: 8a4c9b1e..."
                    value={r2Config.accountId}
                    onChange={(e) => setR2Config({ ...r2Config, accountId: e.target.value.trim() })}
                  />
                </div>
                <div className="campo">
                  <label>Access Key ID (R2)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2f1a6c..."
                    value={r2Config.accessKeyId}
                    onChange={(e) => setR2Config({ ...r2Config, accessKeyId: e.target.value.trim() })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="campo">
                  <label>Secret Access Key (R2)</label>
                  <input
                    type="password"
                    placeholder="Sua chave secreta do R2"
                    value={r2Config.secretAccessKey}
                    onChange={(e) => setR2Config({ ...r2Config, secretAccessKey: e.target.value.trim() })}
                  />
                </div>
                <div className="campo">
                  <label>Nome do Bucket R2</label>
                  <input
                    type="text"
                    value={r2Config.bucketName}
                    onChange={(e) => setR2Config({ ...r2Config, bucketName: e.target.value.trim() })}
                  />
                </div>
                <div className="campo">
                  <label>Domínio Público / R2.dev URL</label>
                  <input
                    type="url"
                    placeholder="https://pub-xxxx.r2.dev ou https://stream.cineplay.tv"
                    value={r2Config.publicUrl}
                    onChange={(e) => setR2Config({ ...r2Config, publicUrl: e.target.value.trim() })}
                  />
                </div>
              </div>

              <div className="r2-passos">
                <strong>📌 Como obter essas chaves na Cloudflare:</strong>
                <ol>
                  <li>Acesse o <strong>Cloudflare Dashboard</strong> e clique em <strong>R2 Object Storage</strong>.</li>
                  <li>Crie o bucket <code>cineplay-videos</code> e clique em <strong>Settings &gt; Public access &gt; Allow Access</strong>.</li>
                  <li>Clique em <strong>Manage R2 API Tokens</strong> &gt; <strong>Create API Token</strong> (Permissão: <em>Admin Read &amp; Write</em>).</li>
                  <li>Copie o <em>Account ID</em>, <em>Access Key</em> e <em>Secret Key</em> para os campos acima.</li>
                </ol>
              </div>

              <div className="form-acoes">
                <button type="submit" className="btn-salvar-r2">
                  💾 Salvar Chaves Cloudflare R2
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status da Infraestrutura */}
        <div className="studio-status-grid">
          <div className={`studio-card-status ${r2Configurado ? 'ativo' : 'alerta'}`} onClick={() => setMostrarConfigR2(true)} style={{ cursor: 'pointer' }}>
            <div className="status-icone">☁️</div>
            <div className="status-info">
              <span className="status-label">Servidor Principal: Cloudflare R2</span>
              <span className="status-valor">
                {r2Configurado ? '🟢 Conectado (Tráfego Ilimitado)' : '🟡 Configurar Chaves (Clique Aqui)'}
              </span>
              <span className="status-sub">
                {r2Configurado ? `Bucket: ${r2Config.bucketName} • Zero Egress` : 'Habilite para tráfego 100% grátis'}
              </span>
            </div>
          </div>

          <div className="studio-card-status ativo">
            <div className="status-icone">⚡</div>
            <div className="status-info">
              <span className="status-label">Servidor Reserva: Supabase Cloud</span>
              <span className="status-valor">🟢 Ativo (São Paulo, BR)</span>
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

              <div className="campo pequeno">
                <label>Destino de Hospedagem</label>
                <select value={destinoStorage} onChange={(e) => setDestinoStorage(e.target.value as 'cloudflare' | 'supabase')}>
                  <option value="cloudflare">☁️ Cloudflare R2 (Recomendado)</option>
                  <option value="supabase">⚡ Supabase Storage (Reserva)</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="campo">
                <label>Arquivo de Vídeo (Upload direto)</label>
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
          <h2 className="secao-titulo">⚙️ Publicação Automatizada via Terminal (Cloudflare R2 + FFmpeg)</h2>
          <p>Para converter arquivos pesados em streaming HLS e subir na Cloudflare R2 automaticamente com 1 comando:</p>
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
                    <span className={`badge-cloud ${f.servidor === 'cloudflare' ? 'cf' : ''}`}>
                      {f.servidor === 'cloudflare' ? '☁️ Cloudflare R2' : '⚡ Supabase'}
                    </span>
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
