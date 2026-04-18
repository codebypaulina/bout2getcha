import { useEffect, useRef } from "react";
import styled from "styled-components";
import CloseIcon from "@/public/icons/close.svg";

export default function DeleteConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null); // für Fokus delete-button

  // *** ESC-listener
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown); // aktivieren
    return () => window.removeEventListener("keydown", handleKeyDown); // beim Schließen entfernen
  }, [open, onCancel]);

  // *** Fokus auf delete-button (per enter/space bedienbar)
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // ***************************************************
  if (!open) return null;

  return (
    <>
      <Overlay onClick={onCancel} />

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
            onClick={onCancel}
          >
            <CloseIcon />
          </CloseButton>
        </Header>

        <section id="delete-confirm-desc">
          {message}
          <p className="warning">This cannot be undone.</p>
        </section>

        <button
          ref={confirmRef}
          type="button"
          aria-label="Confirm and delete"
          onClick={onConfirm}
          className="delete"
        >
          Delete
        </button>
      </Modal>
    </>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0; // füllt gesamten viewport
  background: rgba(0, 0, 0, 0.9); // abgedunkelt
  z-index: 9; // über form, unter Modal
`;

const Modal = styled.div`
  width: min(92vw, 350px); // responsiv + max
  background-color: #ac2525;
  color: var(--button-text-color);
  padding: 1.3rem 1.5rem 1.5rem 1.5rem;
  border-radius: 1.5rem; // abgerundete Ecken
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); // zentriert
  z-index: 10; // Modal über overlay

  p {
    color: var(--primary-text-color);
  }

  p.warning {
    margin-top: 0.3rem; // Abstand message
    font-weight: bold;
    font-size: 0.9rem;
  }

  button.delete {
    display: block; // für margin
    margin: 1.5rem auto 0 auto; // Abstand message-section + horizontal zentriert

    border: none;
    border-radius: 20px;
    min-width: 70px;
    min-height: 30px;
    cursor: pointer;
    font-weight: bold;
    background-color: #fa6c6c;
    color: #ffffffd5;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.07);
      color: var(--primary-text-color);
    }
  }
`;

const Header = styled.div`
  display: flex; // h2 + CloseButton nebeneinander
  margin-bottom: 1rem; // Abstand message-section

  h2 {
    font-size: 1.3rem;
    flex: 1; // nimmt restlichen Platz in Header
    text-align: center;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  svg {
    width: 22px;
    height: 22px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: #fa6c6c;
  }
  svg path[class*="X"] {
    fill: #ffffffd5;
  }

  &:hover {
    transform: scale(1.07);

    svg path[class*="X"] {
      fill: var(--primary-text-color);
    }
  }
`;
