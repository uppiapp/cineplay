import { Navigate } from 'react-router-dom';

/**
 * A antiga landing page institucional foi removida.
 * Redireciona diretamente para a experiência CinePlay.
 */
export function Landing() {
  return <Navigate to="/" replace />;
}

export default Landing;
