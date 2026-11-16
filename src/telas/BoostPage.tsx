import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarraTopo } from '../components/BarraTopo';
import './BoostPage.css';

export function BoostPage() {
  const [upscaling, setUpscaling] = useState<'off' | 'hd' | '4k'>(() => {
    try {
      const v = localStorage.getItem('saimo-upscaling');
      return v ? JSON.parse(v) : '4k';
    } catch {
      return '4k';
    }
  });

  const [zeroDelay, setZeroDelay] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('saimo-zero-delay');
      return v !== null ? JSON.parse(v) : true;
    } catch {
      return true;
    }
  });

  const [audioInteligente, setAudioInteligente] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('saimo-audio-inteligente');
      return v !== null ? JSON.parse(v) : true;
    } catch {
      return true;
    }
  });

  const [multiTelas, setMultiTelas] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('saimo-upscaling', JSON.stringify(upscaling));
      document.documentElement.dataset.upscaling = upscaling;
      window.dispatchEvent(new Event('saimo-upscaling-mudou'));
    } catch {}
  }, [upscaling]);

  useEffect(() => {
    try {
      localStorage.setItem('saimo-zero-delay', JSON.stringify(zeroDelay));
    } catch {}
  }, [zeroDelay]);

  useEffect(() => {
    try {
      localStorage.setItem('saimo-audio-inteligente', JSON.stringify(audioInteligente));
    } catch {}
  }, [audioInteligente]);

  return (
    <div className="boost-container">
      <BarraTopo autoHide={false} />

      <section className="boost-hero">
        <div className="boost-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>CENTRAL DE TECNOLOGIA CINEPLAY BOOST</span>
        </div>
        <h1 className="boost-titulo">
          Turbine sua Transmissão com <span className="grad">CinePlay Boost VIP</span>
        </h1>
        <p className="boost-subtitulo">
          Ajuste fino de inteligência artificial de vídeo, aceleração de rede para eventos esportivos e processamento dinâmico de áudio diretamente no seu hardware.
        </p>
      </section>

      <div className="boost-painel">
        {/* Card 1: 4K AI Upscaling */}
        <div className="boost-card">
          <div className="boost-card-info">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c5cff" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>4K AI Upscaling Shader</span>
            </h3>
            <p>
              Filtro de convolução de matriz em hardware que aprimora contornos e restaura detalhes em transmissões de TV e filmes em tempo real. Não consome internet adicional.
            </p>
            <div className={`boost-status-tag ${upscaling !== 'off' ? 'boost-tag-on' : 'boost-tag-off'}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: upscaling !== 'off' ? '#38d996' : '#8c92a6' }} />
              <span>Modo Ativo: {upscaling === '4k' ? 'Ultra HD 4K' : upscaling === 'hd' ? 'Nitidez HD' : 'Desligado'}</span>
            </div>
          </div>
          <div className="boost-card-action">
            <span style={{ fontSize: '0.85rem', color: '#a0a5b8', fontWeight: 600 }}>Nível de Upscaling</span>
            <div className="boost-opcoes-botoes">
              <button
                type="button"
                className={`boost-btn-opt ${upscaling === 'off' ? 'ativo' : ''}`}
                onClick={() => setUpscaling('off')}
              >
                Off
              </button>
              <button
                type="button"
                className={`boost-btn-opt ${upscaling === 'hd' ? 'ativo' : ''}`}
                onClick={() => setUpscaling('hd')}
              >
                HD 1080p
              </button>
              <button
                type="button"
                className={`boost-btn-opt ${upscaling === '4k' ? 'ativo' : ''}`}
                onClick={() => setUpscaling('4k')}
              >
                4K UHD
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Zero Delay Esportes */}
        <div className="boost-card">
          <div className="boost-card-info">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4fe3d0" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <span>Zero-Delay Sports Mode</span>
            </h3>
            <p>
              Sincronização imediata com o último segmento do stream ao vivo. Reduz o atraso típico de 40 segundos para menos de 4 segundos, permitindo vibrar antes dos vizinhos.
            </p>
            <div className={`boost-status-tag ${zeroDelay ? 'boost-tag-on' : 'boost-tag-off'}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: zeroDelay ? '#38d996' : '#8c92a6' }} />
              <span>{zeroDelay ? 'Zero Delay Ativado (<4s)' : 'Buffer Padrão (25s)'}</span>
            </div>
          </div>
          <div className="boost-card-action">
            <span style={{ fontSize: '0.85rem', color: '#a0a5b8', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
              Latência Ultrabaixa
            </span>
            <div
              className={`boost-toggle-switch ${zeroDelay ? 'ativo' : ''}`}
              onClick={() => setZeroDelay(!zeroDelay)}
            >
              <div className="boost-toggle-knob" />
            </div>
          </div>
        </div>

        {/* Card 3: Áudio Inteligente */}
        <div className="boost-card">
          <div className="boost-card-info">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffb454" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>Áudio Inteligente & Clareza Vocal</span>
            </h3>
            <p>
              Compressão dinâmica que eleva falas e diálogos baixos enquanto suaviza tiros, explosões e efeitos estridentes. Perfeito para assistir de madrugada.
            </p>
            <div className={`boost-status-tag ${audioInteligente ? 'boost-tag-on' : 'boost-tag-off'}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: audioInteligente ? '#38d996' : '#8c92a6' }} />
              <span>{audioInteligente ? 'Equalização Vocal Ativa' : 'Áudio Original'}</span>
            </div>
          </div>
          <div className="boost-card-action">
            <span style={{ fontSize: '0.85rem', color: '#a0a5b8', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
              Clareza de Diálogos
            </span>
            <div
              className={`boost-toggle-switch ${audioInteligente ? 'ativo' : ''}`}
              onClick={() => setAudioInteligente(!audioInteligente)}
            >
              <div className="boost-toggle-knob" />
            </div>
          </div>
        </div>

        {/* Card 4: Multi-Telas */}
        <div className="boost-card">
          <div className="boost-card-info">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c779ff" strokeWidth="2">
                <rect x="2" y="3" width="9" height="18" rx="2" />
                <rect x="13" y="3" width="9" height="18" rx="2" />
              </svg>
              <span>Multi-Telas Simultâneas</span>
            </h3>
            <p>
              Divida sua tela em 2 transmissões ao mesmo tempo no player. Acompanhe múltiplos jogos de futebol simultaneamente no computador ou TV.
            </p>
            <div className={`boost-status-tag ${multiTelas ? 'boost-tag-on' : 'boost-tag-off'}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: multiTelas ? '#38d996' : '#8c92a6' }} />
              <span>{multiTelas ? 'Multi-Telas Ativo no Player' : 'Tela Única'}</span>
            </div>
          </div>
          <div className="boost-card-action">
            <span style={{ fontSize: '0.85rem', color: '#a0a5b8', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
              Divisão Lado a Lado
            </span>
            <div
              className={`boost-toggle-switch ${multiTelas ? 'ativo' : ''}`}
              onClick={() => setMultiTelas(!multiTelas)}
            >
              <div className="boost-toggle-knob" />
            </div>
          </div>
        </div>

        {/* Botão para testar no Player */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/tv" className="boost-action-btn-link" style={{ maxWidth: 360, margin: '0 auto' }}>
            <span>Abrir Player com Ajustes Boost Aplicados</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BoostPage;
