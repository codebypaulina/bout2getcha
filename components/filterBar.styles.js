import styled from "styled-components";

export const FilterBar = styled.div`
  margin-bottom: 1.5rem;
  background-color: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
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
  color: var(--color-button-bg);
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
    color: var(--color-button-active-bg);
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

export const DateNav = styled.div`
  display: flex; // buttons nebeneinander
  align-items: center; // vertikal zentriert
  gap: 0.5rem;
`;

export const RangeButton = styled.button`
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 5px 8px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    background-color: var(--color-button-active-bg);
    color: var(--color-button-active-text);
  }
`;

export const TypeButton = styled.button`
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  background-color: ${({ $backgroundColor }) => $backgroundColor};

  &:hover {
    transform: scale(1.07);
  }
`;
