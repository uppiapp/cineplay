/**
 * Abertura animada oficial do CinePlay em formato Loading Overlay.
 *
 * Apresenta a vinheta 3D do CinePlay com fundo translúcido e efeito de desfoque
 * (estilo loading screen), onde o fundo do site fica visível por trás e a animação
 * 3D flutua no centro. Exibida toda vez que o site é aberto/carregado.
 */
import { useEffect, useRef, useState } from 'react';
import './Abertura.css';

const VIDEO_SRC = `${import.meta.env.BASE_URL}abertura/cineplay-abertura.mp4`;
const POSTER_SRC = `${import.meta.env.BASE_URL}abertura/poster.jpg`;
const SAIDA_MS = 320;

function ehDispositivoMovel(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || (window.matchMedia('(pointer: coarse)').matches && window.innerHeight <= 600);
}

export function Abertura() {
  const [saindo, setSaindo] = useState(false);
  // Exibida toda vez como tela de carregamento (loading overlay)
  const [fim, setFim] = useState(false);
  const [mudo, setMudo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const encerradoRef = useRef(false);

  const encerrar = () => {
    if (encerradoRef.current) return;
    encerradoRef.current = true;
    setSaindo(true);
    window.setTimeout(() => setFim(true), SAIDA_MS);
  };

  useEffect(() => {
    if (fim) return;
    const v = videoRef.current;
    if (!v) return;

    // No celular, inicia mudo para garantir autoplay imediato pelo navegador
    if (ehDispositivoMovel()) {
      v.muted = true;
      setMudo(true);
    }

    const prom = v.play();
    if (prom !== undefined) {
      prom.catch(() => {
        // Se o navegador bloquear autoplay com som no desktop, roda mudo
        v.muted = true;
        setMudo(true);
        v.play().catch(() => {
          encerrar();
        });
      });
    }

    // Timeout de segurança após o término da animação (~3.9s)
    const timerSeguranca = window.setTimeout(encerrar, 4800);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        encerrar();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timerSeguranca);
      window.removeEventListener('keydown', onKey);
    };
  }, [fim]);

  const alternarMudo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMudo(v.muted);
  };

  if (fim) return null;

  return (
    <div
      className={`abertura ${saindo ? 'saindo' : ''}`}
      onClick={encerrar}
      role="presentation"
      aria-label="CinePlay Carregando"
    >
      <div className="abertura-conteudo" onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          className="abertura-video"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          autoPlay
          preload="auto"
          disablePictureInPicture
          onEnded={encerrar}
        />
        <div className="abertura-loading-info">
          <div className="abertura-barra-progresso">
            <div className="abertura-barra-preenchimento" />
          </div>
          <span className="abertura-loading-label">Carregando catálogo...</span>
        </div>
      </div>

      <div className="abertura-acoes" onClick={(e) => e.stopPropagation()}>
        {mudo && (
          <button
            type="button"
            className="abertura-btn"
            onClick={alternarMudo}
            title="Ativar som da vinheta"
          >
            🔊 Ativar Som
          </button>
        )}
        <button
          type="button"
          className="abertura-btn"
          onClick={(e) => {
            e.stopPropagation();
            encerrar();
          }}
          title="Pular carregamento"
        >
          Pular ›
        </button>
      </div>
    </div>
  );
}
