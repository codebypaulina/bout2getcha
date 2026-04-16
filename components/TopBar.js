import styled from "styled-components";

export default function TopBar() {
  return <Wrapper />;
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: 100%;
  height: 50px; // kleiner als Navbar (57px)
  background-color: var(--button-background-color);
  z-index: 10; // sonst unter ResponsivePie
`;
