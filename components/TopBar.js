import styled from "styled-components";

export default function TopBar({ title, showTitle }) {
  return <Wrapper>{showTitle ? <Title>{title}</Title> : null}</Wrapper>;
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 50%; // linker Startpunkt (horizontale Mitte von viewport)
  transform: translateX(-50%); // 1/2 von eigener Breite zurück
  z-index: 2; // sonst unter ResponsivePie + PageContent

  width: 100%; // volle verfügbare Breite  (mobile)
  max-width: var(--app-max-width); // maximale Breite  (desktop)
  height: 57px; // wie BottomNav
  background-color: var(--button-background-color);

  display: flex; // für Zentrierung von Title
  align-items: center; // vertikal
  justify-content: center; // horizontal
`;

const Title = styled.span`
  color: var(--primary-text-color);
  font-size: 1.85rem; // wie h1
  font-weight: bold;
  line-height: 1;
  padding-bottom: 5px; // vertikal zentrierter
`;
