import { useState } from 'react';
import { BarraTopo } from '../components/BarraTopo';
import './PlanosPage.css';

interface Plano {
  id: string;
  nome: string;
  desc: string;
  preco: string;
  periodo: string;
  destaque?: boolean;
  selo?: string;
  recursos: string[];
}

const PLANOS: Plano[] = [
  {
    id: 'mensal',
    nome: 'Mensal Pro',
    desc: 'Ideal para testar o ecossistema com liberdade e flexibilidade.',
    preco: '19,90',
    periodo: '/mês',
    recursos: [
      'Acesso completo a 408 canais ao vivo (HD/FHD)',
      'Catálogo completo de filmes e séries TMDb',
      'Guia de programação EPG de 7 dias',
      'Reprodução direta no navegador ou TV',
      '1 tela simultânea',
      'Suporte via Discord & Comunidade',
    ],
  },
  {
    id: 'trimestral',
    nome: 'Trimestral Boost',
    desc: 'O mais escolhido! Economize 16% com recursos VIP liberados.',
    preco: '49,90',
    periodo: '/trimestre (R$ 16,63/mês)',
    destaque: true,
    selo: 'Mais Popular ⭐',
    recursos: [
      'Tudo do Plano Mensal Pro',
      'CinePlay Boost: 4K AI Upscaling Shader liberado',
      'Zero Delay Esportes (sem atraso na comemoração)',
      'Áudio Inteligente com clareza vocal',
      '2 telas simultâneas',
      'Acesso antecipado a novas atualizações',
    ],
  },
  {
    id: 'vitalicio',
    nome: 'Vitalício CinePlay Black',
    desc: 'Pague uma única vez e tenha acesso perpétuo sem mensalidades.',
    preco: '147,00',
    periodo: 'pagamento único',
    selo: 'Melhor Custo-Benefício 🏆',
    recursos: [
      'Acesso Vitalício perpétuo sem renovação',
      'Todos os recursos CinePlay Boost VIP inclusos',
      '4 telas simultâneas para toda a família',
      'Zero Delay Esportes + 4K AI Upscaling',
      'Acesso prioritário a todos os apps (Android, TV Box, Windows, Mac, LG, Samsung, Roku)',
      'Suporte VIP Prioritário direto com os desenvolvedores',
    ],
  },
];

const PRODUTOS = [
  {
    id: 'tvbox',
    nome: 'CinePlay Box 4K Ultra Pro',
    desc: 'Android TV 12 oficial homologada, 4GB RAM + 64GB de memória, processador Quad-Core 2.0GHz e CinePlay pré-instalado. Ligue na TV e use.',
    preco: 'R$ 289,00',
    badge: 'Frete Grátis',
  },
  {
    id: 'stick',
    nome: 'CinePlay Stick 4K Portátil',
    desc: 'Plug & Play no HDMI com Wi-Fi 6 Dual Band. Leve para viagens ou use em qualquer TV com total discrição e velocidade.',
    preco: 'R$ 199,00',
    badge: 'Pronta Entrega',
  },
  {
    id: 'controle',
    nome: 'Controle Remoto CinePlay Voice',
    desc: 'Comando de voz, microfone de alta sensibilidade, botões de atalho dedicados para Ao Vivo, Filmes, Séries e volume inteligente.',
    preco: 'R$ 69,00',
    badge: 'Bluetooth 5.2',
  },
];

export function PlanosPage() {
  const [modalPix, setModalPix] = useState<Plano | null>(null);
  const [copiado, setCopiado] = useState(false);

  const abrirPix = (plano: Plano) => {
    setModalPix(plano);
    setCopiado(false);
  };

  const chavePixExemplo = '00020126580014br.gov.bcb.pix0136suporte@cineplay.tv5204000053039865802BR5915CINEPLAY BRASIL6009SAO PAULO62070503***6304';

  const copiarChave = () => {
    navigator.clipboard.writeText(chavePixExemplo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="planos-container">
      <BarraTopo autoHide={false} />

      <section className="planos-hero">
        <div className="planos-badge">
          <span>⚡ LOJA OFICIAL & ASSINATURAS CINEPLAY</span>
        </div>
        <h1 className="planos-titulo">
          Escolha o Plano Ideal para a sua <span className="grad">Experiência CinePlay</span>
        </h1>
        <p className="planos-subtitulo">
          Desbloqueie todo o potencial do player com mais de 400 canais, filmes, séries e as tecnologias exclusivas CinePlay Boost: 4K Upscaling e Zero Delay.
        </p>
      </section>

      {/* Grade de Planos */}
      <section className="planos-grade">
        {PLANOS.map((p) => (
          <div key={p.id} className={`plano-cartao ${p.destaque ? 'plano-destaque' : ''}`}>
            {p.selo && <span className="plano-selo-topo">{p.selo}</span>}
            <h3 className="plano-nome">{p.nome}</h3>
            <p className="plano-desc">{p.desc}</p>
            <div className="plano-preco-box">
              <div className="plano-preco">
                <span className="plano-cifrao">R$</span>
                <span className="plano-valor">{p.preco}</span>
                <span className="plano-periodo">{p.periodo}</span>
              </div>
            </div>
            <ul className="plano-recursos">
              {p.recursos.map((r, i) => (
                <li key={i}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`plano-botao ${p.destaque ? 'plano-btn-principal' : 'plano-btn-secundario'}`}
              onClick={() => abrirPix(p)}
            >
              <span>Assinar via PIX</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        ))}
      </section>

      {/* Loja de Aparelhos CinePlay */}
      <section className="loja-secao" id="aparelhos-loja">
        <div className="loja-cabecalho">
          <div className="planos-badge">
            <span>📦 HARDWARE & ACESSÓRIOS</span>
          </div>
          <h2 className="loja-titulo">
            Aparelhos Homologados <span className="grad">CinePlay Hardware</span>
          </h2>
          <p className="planos-subtitulo">
            Dispositivos testados e otimizados especialmente para o aplicativo CinePlay, com velocidade máxima e controle pelo controle remoto.
          </p>
        </div>

        <div className="loja-grade">
          {PRODUTOS.map((prod) => (
            <div key={prod.id} className="loja-produto">
              <div className="produto-imagem-box">
                <span className="produto-badge">{prod.badge}</span>
                {prod.id === 'tvbox' && (
                  <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="7" width="20" height="14" rx="3" />
                    <circle cx="12" cy="14" r="3" />
                    <line x1="12" y1="3" x2="12" y2="7" />
                  </svg>
                )}
                {prod.id === 'stick' && (
                  <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="16" rx="2" />
                    <rect x="9" y="18" width="6" height="4" />
                  </svg>
                )}
                {prod.id === 'controle' && (
                  <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="6" y="2" width="12" height="20" rx="3" />
                    <circle cx="12" cy="7" r="1.5" />
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="18" r="1" />
                  </svg>
                )}
              </div>
              <div className="produto-conteudo">
                <h3 className="produto-nome">{prod.nome}</h3>
                <p className="produto-desc">{prod.desc}</p>
                <div className="produto-rodape">
                  <span className="produto-preco">{prod.preco}</span>
                  <button
                    type="button"
                    className="plano-botao plano-btn-principal"
                    style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                    onClick={() =>
                      abrirPix({
                        id: prod.id,
                        nome: prod.nome,
                        desc: prod.desc,
                        preco: prod.preco.replace('R$ ', ''),
                        periodo: 'unidade',
                        recursos: [],
                      })
                    }
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal PIX */}
      {modalPix && (
        <div className="pix-overlay" onClick={() => setModalPix(null)}>
          <div className="pix-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pix-fechar" onClick={() => setModalPix(null)}>
              ✕
            </button>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>{modalPix.nome}</h3>
            <p style={{ margin: '0 0 1rem 0', color: '#a0a5b8', fontSize: '0.9rem' }}>
              Valor: <b>R$ {modalPix.preco}</b> · Ativação Imediata via PIX
            </p>

            <div className="pix-qr-box">
              <img src="/img/doacao-qr.png" alt="QR Code PIX" onError={(e) => {
                // fallback to svg representation
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} />
            </div>

            <div className="pix-copia-box">
              <span className="pix-chave-texto">{chavePixExemplo}</span>
              <button type="button" className="pix-btn-copiar" onClick={copiarChave}>
                {copiado ? '✓ Copiado!' : 'Copiar PIX'}
              </button>
            </div>

            <div className="pix-status">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38d996', display: 'inline-block' }} />
              <span>Aguardando confirmação bancária instantânea...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanosPage;
