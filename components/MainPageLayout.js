import styled from "styled-components";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default function MainPageLayout({
  title,
  showTitle,
  contentMaxWidth = "350px",
  children,
}) {
  return (
    <>
      <TopBar title={title} showTitle={showTitle} />
      <PageBackgroundSurface />
      <PageContent $contentMaxWidth={contentMaxWidth}>{children}</PageContent>
      <BottomNav />
    </>
  );
}

const PageBackgroundSurface = styled.div`
  position: fixed; // feste Hintergrundfläche zw TopBar + BottomNav
  top: 57px; // Start direkt unter TopBar
  bottom: 57px; // Ende direkt über BottomNav
  left: 50%; // horizontal mittig im viewport
  transform: translateX(-50%); // Zentrierung App-Breite
  width: 100%; // volle verfügbare Breite  (mobile)
  max-width: var(--app-max-width); // auf App-Breite begrenzt  (desktop)
  background-color: var(--background-color); // App-Fläche
  z-index: 0; // unter PageContent, über DesktopShell

  @media (min-width: 431px) {
    // [app-max-width: 430px]
    border-radius: 30px; // runde Ecken (in pages mit TopBar + BottomNav)
  }
`;

const PageContent = styled.div`
  position: relative; // damit über PageBackgroundSurface
  padding: 5rem 20px; // Abstand zu TopBar + BottomNav
  margin: 0 auto; // content innerhalb App horizontal zentriert

  // Standardbreite, pro page überschreibbar:
  max-width: ${({ $contentMaxWidth }) => $contentMaxWidth};
`;
