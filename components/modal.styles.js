import styled, { css } from "styled-components";

// *** FormAddTransaction, FormAddCategory **********
// *** FormEditTransaction
// *** DatePicker
export const Overlay = styled.div`
  position: fixed;
  inset: 0; // füllt gesamten viewport
  background: rgba(0, 0, 0, 0.9); // abgedunkelt
  z-index: 9; // über page, unter component
`;

export const fixedCenteredStyles = css`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); // zentriert
  z-index: 10; // über overlay
`;

// *** DeleteConfirmModal ***************************
export const OverlayDelete = styled.div`
  position: fixed;
  inset: 0; // füllt gesamten viewport
  background: rgba(0, 0, 0, 0.9); // abgedunkelt
  z-index: 19; // über page + edit forms, unter modal
`;

export const fixedCenteredStylesDelete = css`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); // zentriert
  z-index: 20; // über overlay
`;
