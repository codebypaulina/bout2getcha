import GlobalStyle from "../styles";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import styled from "styled-components";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <SWRConfig
      value={{
        fetcher: async (key) => {
          // key:  SWR-key für useSWR

          const url = Array.isArray(key) ? key[0] : key;
          // key array:  ["/api/categories", userId]  -> fetch("/api/categories")
          // key string:  "/api/categories"           -> fetch("/api/categories")

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Request to ${url} failed.`);
          }

          return await response.json();
        },
      }}
    >
      <SessionProvider session={session}>
        <GlobalStyle />

        <DesktopShell>
          <AppViewport>
            <Component {...pageProps} />
          </AppViewport>
        </DesktopShell>
      </SessionProvider>
    </SWRConfig>
  );
}

// *** [ außerhalb App-Fläche ]: background grau, App zentriert
const DesktopShell = styled.div`
  height: 100dvh; // wie viewport
  width: 100%; // volle verfügbare Breite
  background-color: var(--desktop-shell-background-color);

  display: flex; // für Zentrierung von AppViewport
  justify-content: center; // horizontal
  overflow: hidden; // kein scroll außerhalb App-Fläche
`;

// *** [ innere App-Fläche ]:  Breite mobile voll, desktop begrenzt
const AppViewport = styled.div`
  height: 100%; // wie DesktopShell
  width: 100%; // volle verfügbare Breite  (mobile)
  max-width: var(--app-max-width); // maximale Breite  (desktop)
`;
