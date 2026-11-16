import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './VSLSection.css';

interface DemoClip {
  id: string;
  titulo: string;
  subtitulo: string;
  url: string;
  badge: string;
}

const CLIPS: DemoClip[] = [
  {
    id: 'intro',
    titulo: 'Apresentação Oficial Saimo TV',
    subtitulo: 'Conheça o ecossistema com 408 canais, guia EPG e catálogo sob demanda',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    badge: '4K ULTRA HD',
  },
  {
    id: 'cinema',
    titulo: 'Cinema 4K & Séries (Upscaling AI)',
    subtitulo: 'Milhares de títulos organizados por letra com metadados TMDb e filtros dinâmicos',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    badge: 'CINEMA 4K',
  },
  {
    id: 'esportes',
    titulo: 'Transmissão Esportiva Zero Delay',
    subtitulo: 'Buffer otimizado para transmissões ao vivo de futebol, basquete e lutas',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    badge: 'ZERO DELAY',
  },
];

export function VSLSection() {
  const [clipIndex, setClipIndex] = useState(0);
  const clipAtual = CLIPS[clipIndex];
  const [tocando, setTocando] = useState(false);
  const [mutado, setMutado] = useState(true);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerBoxRef = useRef<HTMLDivElement | null>(null);

  // Troca de clipe com reset seguro
  const trocarClip = (index: number) => {
    setClipIndex(index);
    setTempo(0);
    setDuracao(0);
    if (videoRef.current) {
      videoRef.current.src = CLIPS[index].url;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setTocando(true);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setTocando(true);
      } else {
        videoRef.current.pause();
        setTocando(false);
      }
    }
  };

  const desmutarAudio = () => {
    setMutado(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current.play().catch(() => {});
      setTocando(true);
    }
  };

  const alternarMudo = () => {
    if (videoRef.current) {
      const novo = !mutado;
      videoRef.current.muted = novo;
      setMutado(novo);
    }
  };

  const aoAtualizarTempo = () => {
    if (videoRef.current) {
      setTempo(videoRef.current.currentTime);
      if (!duracao && videoRef.current.duration) {
        setDuracao(videoRef.current.duration);
      }
    }
  };

  const aoCarregarMetadados = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuracao(videoRef.current.duration);
    }
  };

  const aoBuscarTempo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const novoTempo = clickPos * (duracao || 100);
    setTempo(novoTempo);
    if (videoRef.current) {
      videoRef.current.currentTime = novoTempo;
    }
  };

  const toggleFullscreen = () => {
    const el = playerBoxRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatarTempo = (segundos: number) => {
    if (!segundos || isNaN(segundos)) return '0:00';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const pct = duracao > 0 ? (tempo / duracao) * 100 : 0;

  return (
    <section className="vsl-secao" id="vsl">
      <div className="vsl-aura" aria-hidden="true" />

      <div className="vsl-cabecalho">
        <div className="vsl-tag">
          <i /> Apresentação Oficial Saimo TV
        </div>
        <h2 className="vsl-titulo">
          Como transformar qualquer tela em uma <span className="grad">Central de Streaming 4K</span>
        </h2>
        <p className="vsl-subtitulo">
          Assista à demonstração interativa e descubra como o ecossistema Saimo organiza mais de 400 canais ao vivo, filmes, séries e esportes sem travamentos e com tecnologia Zero Delay.
        </p>
      </div>

      {/* Seletor de Demonstrações / VSL */}
      <div className="vsl-clip-abas" role="tablist" aria-label="Cenas de demonstração">
        {CLIPS.map((clip, idx) => (
          <button
            key={clip.id}
            type="button"
            role="tab"
            aria-selected={clipIndex === idx}
            className={`vsl-aba-btn ${clipIndex === idx ? 'ativa' : ''}`}
            onClick={() => trocarClip(idx)}
          >
            <span className="vsl-aba-num">0{idx + 1}</span>
            <span className="vsl-aba-text">{clip.titulo}</span>
          </button>
        ))}
      </div>

      <div className="vsl-player-container">
        <div className="vsl-moldura" ref={playerBoxRef}>
          <video
            ref={videoRef}
            className="vsl-video-player"
            src={clipAtual.url}
            poster="/img/fundo.jpg"
            playsInline
            autoPlay
            muted={mutado}
            onTimeUpdate={aoAtualizarTempo}
            onLoadedMetadata={aoCarregarMetadados}
            onDurationChange={aoCarregarMetadados}
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onEnded={() => setTocando(false)}
            onClick={togglePlay}
          />

          {mutado && (
            <button type="button" className="vsl-audio-aviso" onClick={desmutarAudio} aria-label="Ativar som do vídeo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>Seu vídeo começou! Clique para ativar o áudio 🔊</span>
            </button>
          )}

          <div className="vsl-badge-flutuante vsl-badge-top-left">
            <span className="vsl-badge-dot" />
            <span>AO VIVO · STREAMING ULTRA HD</span>
          </div>

          <div className="vsl-badge-flutuante vsl-badge-bottom-right">
            <span>⚡ {clipAtual.badge}</span>
          </div>

          {!tocando && (
            <button type="button" className="vsl-play-big-center" onClick={togglePlay} aria-label="Reproduzir vídeo">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
          )}

          {/* Barra de Controles Interativa */}
          <div className="vsl-controles">
            <button type="button" className="vsl-btn-ctrl" onClick={togglePlay} aria-label={tocando ? 'Pausar' : 'Reproduzir'}>
              {tocando ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button type="button" className="vsl-btn-ctrl" onClick={alternarMudo} aria-label={mutado ? 'Ativar som' : 'Silenciar'}>
              {mutado ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <div className="vsl-barra-progresso" onClick={aoBuscarTempo} title="Avançar / Retroceder">
              <div className="vsl-progresso-preenchido" style={{ width: `${pct}%` }} />
            </div>

            <div className="vsl-tempo">
              {formatarTempo(tempo)} / {formatarTempo(duracao || 120)}
            </div>

            <span className="vsl-selo-4k">4K HDR</span>

            <button type="button" className="vsl-btn-ctrl" onClick={toggleFullscreen} title="Tela Cheia">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>

            <button
              type="button"
              className="vsl-btn-ctrl"
              onClick={() => {
                try { localStorage.setItem('saimo-entrou', '1'); } catch {}
                navigate('/browser');
              }}
              title="Abrir no Player Web Completo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cartões de Destaque Tecnológico */}
      <div className="vsl-recursos-grid">
        <div className="vsl-cartao-recurso">
          <div className="vsl-recurso-ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h4>Zero Delay Esportivo</h4>
          <p>Buffer otimizado para futebol e eventos ao vivo. Grite gol sem spoilers dos vizinhos ou transmissões atrasadas.</p>
        </div>

        <div className="vsl-cartao-recurso">
          <div className="vsl-recurso-ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h4>Upscaling 4K com IA</h4>
          <p>Filtros de convolução em tempo real no hardware que aumentam o contraste, nitidez e fidelidade das transmissões.</p>
        </div>

        <div className="vsl-cartao-recurso">
          <div className="vsl-recurso-ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h4>Multi-Telas Simultâneas</h4>
          <p>Assista a dois canais lado a lado para acompanhar múltiplas partidas e coberturas sem alternar de tela.</p>
        </div>

        <div className="vsl-cartao-recurso">
          <div className="vsl-recurso-ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h4>Privacidade & Descentralização</h4>
          <p>Sem servidores intermediários nem coleta de dados. Suas credenciais e histórico ficam 100% no seu aparelho.</p>
        </div>
      </div>

      {/* Botões de Ação Imediata */}
      <div className="vsl-acoes">
        <button
          type="button"
          className="vsl-btn-destaque"
          onClick={() => {
            try { localStorage.setItem('saimo-entrou', '1'); } catch {}
            navigate('/browser');
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Abrir no Navegador (/browser)</span>
        </button>

        <Link to="/plan" className="vsl-btn-secundario">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 6v2m0 8v2" />
          </svg>
          <span>Loja SAIMO & Planos (/plan)</span>
        </Link>

        <Link to="/boost" className="vsl-btn-secundario">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>Saimo Boost VIP (/boost)</span>
        </Link>

        <Link to="/goal" className="vsl-btn-secundario">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="m12 7 4 3-1.5 5h-5L8 10z" />
          </svg>
          <span>Jogos Ao Vivo (/goal)</span>
        </Link>
      </div>
    </section>
  );
}
