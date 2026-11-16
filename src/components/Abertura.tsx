/**
 * Abertura animada oficial do CinePlay.
 *
 * Apresenta a vinheta cinematográfica em 1080p do CinePlay (faixa de filme 3D,
 * botão play luminoso e o logotipo CinePlay) com som e transição suave ao final.
 * Clique, toque ou qualquer tecla pula a vinheta imediatamente.
 */
import { useEffect, useRef, useState } from 'react';
import './Abertura.css';

const VIDEO_SRC = `${import.meta.env.BASE_URL}abertura/cineplay-abertura.mp4`;
const POSTER_SRC = `${import.meta.env.BASE_URL}abertura/poster.jpg`;
const SAIDA_MS = 350;

export function Abertura() {
  const [saindo, setSaindo] = useState(false);
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
    const v = videoRef.current;
    if (!v) return;

    // Tenta reproduzir com áudio; se a política do navegador bloquear autoplay sonoro, inicia mudo
    v.play().catch(() => {
      v.muted = true;
      setMudo(true);
      v.play().catch(() => {
        // Se até autoplay silencioso for impedido, encerra logo para não travar a experiência
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
  }, []);

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
