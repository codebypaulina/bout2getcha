// HomePage + CategoriesPage

import Link from "next/link";
import styled from "styled-components";

export const CategoryLink = styled(Link)`
  text-decoration: none;
  background-color: var(--list-item-background);
  border-radius: 30px;
  height: 2rem;
  width: 100%; // link füllt Platz in list-Breite
  padding: 0 1rem; // Abstand Rand
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.02)" : "none"};

  display: grid; //      ColorTag | name | amount
  grid-template-columns: 8px minmax(0, 1fr) max-content;
  align-items: center; // vertikal
  column-gap: 0.5rem; // Abstand items

  p.name,
  p.amount {
    font-size: 1rem;
    color: ${({ $isHighlighted }) =>
      $isHighlighted
        ? "var(--primary-text-color)"
        : "var(--secondary-text-color)"};
  }

  p.name {
    white-space: nowrap; // in 1 Zeile
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.amount {
    margin-left: auto; // rechts
    font-weight: bold;
    white-space: nowrap;
  }
`;

export const ColorTag = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $isHidden, $categoryColor }) =>
    $isHidden ? "#5a5a5a" : $categoryColor};
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.2)" : "none"};
`;
