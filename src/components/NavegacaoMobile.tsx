import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EventsModal } from './EventsModal';
import './NavegacaoMobile.css';

/*
 * A barra de baixo do celular, a mesma em todas as telas — como nos apps.
 *
 * Antes cada tela tinha o seu topo, parte só com ícones, e para ir da TV ao
 * catálogo era preciso achar a casinha, voltar ao início e escolher de novo.
 * Aqui as seções ficam a um toque do polegar, com nome escrito.
 *
 * Some sozinha (pelo CSS) quando um vídeo ocupa a tela inteira.
 */

interface Item {
  /** Seção da barra; "#eventos" não é rota, abre o painel de eventos. */
  caminho: string;
  rotulo: string;
  icone: React.ReactNode;
}

const ICONE = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const ITENS: Item[] = [
  {
    caminho: '/home',
    rotulo: 'Início',
    icone: <svg {...ICONE}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></svg>,
  },
  {
    caminho: '/tv',
    rotulo: 'Ao vivo',
    icone: <svg {...ICONE}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="m17 2-5 5-5-5" /></svg>,
  },
  {
    caminho: '#eventos',
    rotulo: 'Jogos/Goal',
    icone: <svg {...ICONE}><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 5h-5L8 10z" /></svg>,
  },
  {
    caminho: '/movies',
    rotulo: 'Filmes',
    icone: <svg {...ICONE}><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5" /></svg>,
  },
  {
    caminho: '/plan',
    rotulo: 'Loja/Planos',
    icone: <svg {...ICONE}><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 6v2m0 8v2" /></svg>,
  },
];

export function NavegacaoMobile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [eventos, setEventos] = useState(false);

  return (
    <>
    <nav className="navegacao-mobile" aria-label="Seções">
      {ITENS.map((item) => {
        const ativa = item.caminho === '#eventos'
          ? eventos
          : item.caminho === '/home' ? (pathname === '/home' || pathname === '/') : pathname.startsWith(item.caminho);
        return (
          <button
            key={item.caminho}
            type="button"
            className={`navegacao-mobile-item${ativa ? ' ativa' : ''}`}
            aria-current={ativa ? 'page' : undefined}
            onClick={() => {
              if (item.caminho === '#eventos') {
                setEventos(true);
                return;
              }
              if (ativa) {
                // Tocar na seção em que já se está volta ao topo dela.
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              navigate(item.caminho);
            }}
          >
            {item.icone}
            <span>{item.rotulo}</span>
          </button>
        );
      })}
    </nav>
    {eventos && (
      <EventsModal onClose={() => setEventos(false)} onWatch={(id) => navigate(`/tv/${id}`)} />
    )}
    </>
  );
}
