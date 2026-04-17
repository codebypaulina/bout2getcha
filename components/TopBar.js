import styled from "styled-components";

export default function TopBar({ title, showTitle }) {
  return <Wrapper>{showTitle ? <Title>{title}</Title> : null}</Wrapper>;
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: 100%;
  height: 50px; // kleiner als BottomNav (57px)
  background-color: var(--button-background-color);
  z-index: 10; // sonst unter ResponsivePie

  display: flex;
  align-items: center; // zentriert Titel vertikal innerhalb TopBar
  justify-content: center; // zentriert Titel horizontal innerhalb TopBar
`;

const Title = styled.span`
  color: var(--primary-text-color);
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
  padding-bottom: 5px; // vertikal zentrierter
`;
