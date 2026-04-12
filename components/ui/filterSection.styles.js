import styled from "styled-components";

export const FilterSection = styled.div`
  margin-bottom: 1.5rem;
  background-color: #232323;
  border-radius: 30px;
  height: 45px;
  padding: 0.7rem 1rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);

  display: flex; // items nebeneinander
  justify-content: space-between; // verteilt
  align-items: center; // vertikal zentriert
`;

export const ChartButton = styled.button`
  border: none;
  background: transparent;
  color: var(--button-background-color);
  line-height: 0;
  cursor: pointer;

  svg {
    width: 21px;
    height: 21px;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 1));
  }

  &:hover {
    transform: scale(1.07);
  }

  &.active {
    color: var(--button-active-color);
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

export const ArrowButton = styled.button`
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background-color: var(--button-background-color);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  svg {
    width: 10px;
    height: 10px;
    stroke: var(--button-text-color);
  }

  .prev {
    margin-right: 2px;
  }

  .next {
    margin-left: 2px;
  }

  &:hover {
    transform: scale(1.07);
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;

    svg {
      stroke: #cccccc4f;
    }
  }
`;

export const DateNav = styled.div`
  display: flex; // buttons nebeneinander
  align-items: center; // vertikal zentriert
  gap: 0.5rem;
`;

export const RangeButton = styled.button`
  border: none;
  border-radius: 20px;
  background-color: var(--button-background-color);
  color: var(--button-text-color);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 5px 8px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    background-color: var(--button-active-color);
    color: var(--button-active-text-color);
  }
`;

export const TypeButton = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  background-color: ${({ $backgroundColor }) => $backgroundColor};

  &:hover {
    transform: scale(1.07);
  }
`;
