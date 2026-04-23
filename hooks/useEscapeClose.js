import { useEffect } from "react";

export default function useEscapeClose(enabled, onClose) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}
