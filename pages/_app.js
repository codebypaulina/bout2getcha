import GlobalStyle from "../styles";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import styled from "styled-components";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <>
      <SWRConfig
        value={{
          fetcher: async (...args) => {
            const response = await fetch(...args);
            if (!response.ok) {
              throw new Error(`Request with ${JSON.stringify(args)} failed.`);
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
    </>
  );
}

// *** [ äußerer Vollbild-Wrapper ]   (Außenhintergrund + App zentriert)
const DesktopShell = styled.div`
  min-height: 100dvh; // mind. so hoch wie viewport
  width: 100%; // volle verfügbare Breite
  background-color: var(--desktop-shell-background-color); // außerhalb App
  // background-color innerhalb App in PageBackgroundSurface

  display: flex; // für Zentrierung von AppViewport
  justify-content: center; // horizontal
`;

// *** [ innere App-Fläche ]   (begrenzte Breite)
const AppViewport = styled.div`
  min-height: 100dvh;
  width: 100%; // volle verfügbare Breite  (mobile)
  max-width: var(--app-max-width); // maximale Breite  (desktop)

  @media (min-width: 431px) {
    // [app-max-width: 430px]
    border-radius: 30px; // runde Ecken (in pages ohne TopBar + BottomNav)
  }
`;
