import { useEffect, useRef } from "react";
import styled from "styled-components";

import CloseIcon from "@/public/icons/close.svg";
import { OverlayDelete, fixedCenteredStylesDelete } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";

export default function DeleteConfirmModal({
  confirmationMessage,
  confirmDelete,
  closeModal,
}) {
  // *** ESC-listener
  useEscapeClose(true, closeModal);

  // *** Fokus auf delete-button (enter / space)
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // ***************************************************

  return (
    <>
      <OverlayDelete onClick={closeModal} />

      <Modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
      >
        <Header>
          <h2 id="delete-confirm-title">Sure?</h2>

          <CloseButton
            type="button"
            aria-label="Close dialog"
            title="Close"
            onClick={closeModal}
          >
            <CloseIcon />
          </CloseButton>
        </Header>

        <section id="delete-confirm-desc">
          {confirmationMessage}
          <p className="warning">This cannot be undone.</p>
        </section>

        <button
          ref={confirmRef}
          type="button"
          aria-label="Confirm and delete"
          onClick={confirmDelete}
          className="delete"
        >
          Delete
        </button>
      </Modal>
    </>
  );
}

const Modal = styled.div`
  ${fixedCenteredStylesDelete}; // über overlay + zentriert

  width: min(92vw, 350px); // responsiv + max
  background-color: var(--delete-modal-background-color);
  border-radius: 30px; // abgerundete Ecken
  padding: 1.45rem 1.75rem 1.7rem 1.75rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  p {
    font-size: 1rem;
    color: var(--primary-text-color);
  }

  p.warning {
    font-size: 1.1rem;
    font-weight: bold;
    margin-top: 0.3rem; // Abstand confirmationMessage
  }

  button.delete {
    display: block; // für margin
    margin: 1.5rem auto 0 auto; // Abstand confirmationMessage-section + horizontal zentriert
    padding-bottom: 3px; // text vertikal zentrierter

    min-width: 80px;
    min-height: 35px;
    border: none;
    border-radius: 30px;
    background-color: var(--delete-button-background-color);
    color: var(--delete-button-text-color);
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--primary-text-color);
    }
  }
`;

const Header = styled.div`
  display: flex; // h2 + CloseButton nebeneinander
  margin-bottom: 0.75rem; // Abstand confirmationMessage-section

  h2 {
    flex: 1; // nimmt restlichen Platz in Header
    text-align: center;
    font-size: 1.5rem;
    line-height: 1;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  svg {
    width: 25px;
    height: 25px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: var(--delete-button-background-color);
  }
  svg path[class*="X"] {
    fill: var(--delete-button-text-color);
  }

  &:hover {
    transform: scale(1.07);

    svg path[class*="X"] {
      fill: var(--primary-text-color);
    }
  }
`;
