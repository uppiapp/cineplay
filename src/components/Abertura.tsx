/**
 * Abertura animada oficial do CinePlay.
 *
 * Apresenta a vinheta cinematográfica em 1080p do CinePlay apenas no desktop
 * (uma vez por sessão), proporcionando uma experiência de cinema limpa.
 * No celular, a vinheta é desativada para que a navegação seja instantânea,
 * rápida e sem faixas pretas de proporção 16:9 em telas verticais.
 */
import { useEffect, useRef, useState } from 'react';
import './Abertura.css';

const VIDEO_SRC = `${import.meta.env.BASE_URL}abertura/cineplay-abertura.mp4`;
const POSTER_SRC = `${import.meta.env.BASE_URL}abertura/poster.jpg`;
const SAIDA_MS = 350;

function ehDispositivoMovel(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || (window.matchMedia('(pointer: coarse)').matches && window.innerHeight <= 600);
}

export function Abertura() {
  const [saindo, setSaindo] = useState(false);
  // No mobile, desativa completamente para não atrapalhar a experiência.
  // No desktop, exibe apenas uma vez por visita/sessão.
  const [fim, setFim] = useState(() => {
    if (ehDispositivoMovel()) return true;
    try {
      if (sessionStorage.getItem('cineplay-abertura-vista')) return true;
      sessionStorage.setItem('cineplay-abertura-vista', '1');
      return false;
    } catch {
      return false;
    }
  });

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

    // Tenta reproduzir com som; se o navegador bloquear autoplay sonoro, inicia mudo
    v.play().catch(() => {
      v.muted = true;
      setMudo(true);
      v.play().catch(() => {
        encerrar();
      });
    });

    // Timeout de segurança caso o evento ended demore
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
      aria-label="CinePlay"
    >
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
      <div className="abertura-acoes">
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
          title="Pular abertura"
        >
          Pular ›
        </button>
      </div>
    </div>
  );
}
