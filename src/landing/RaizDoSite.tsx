import type { ReactNode } from 'react';

/**
 * A raiz do site abre diretamente no aplicativo CinePlay.
 */
export function RaizDoSite({ app }: { app: ReactNode }) {
  return <>{app}</>;
}
