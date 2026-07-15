import styled from "styled-components";

export default function TopBar({ title, showTitle }) {
  return <Wrapper>{showTitle ? <Title>{title}</Title> : null}</Wrapper>;
}

const Wrapper = styled.header`
  height: var(--top-bar-height); // wie BottomNav
  background-color: var(--color-button-bg);

  display: flex; // für Zentrierung von Title
  align-items: center; // vertikal
  justify-content: center; // horizontal
`;

const Title = styled.span`
  color: var(--color-text-primary);
  font-size: 1.85rem; // wie h1
  font-weight: bold;
  line-height: 1;
  padding-bottom: 5px; // vertikal zentrierter
`;
