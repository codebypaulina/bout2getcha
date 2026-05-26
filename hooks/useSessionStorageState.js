import { useEffect, useState, useRef } from "react";

export default function useSessionStorageState(storageKey, defaultValue) {
  const [state, setState] = useState(defaultValue);
  const skipNextWrite = useRef(true);

  // *** [ abrufen ]
  useEffect(() => {
    skipNextWrite.current = true;

    if (!storageKey) {
      setState(defaultValue);
      return;
    } // kein key: default

    const storedValue = sessionStorage.getItem(storageKey);
    if (storedValue === null) {
      setState(defaultValue);
      return;
    } // key ohne Wert: default

    try {
      setState(JSON.parse(storedValue)); // key vorhanden + gültig: in state
    } catch {
      sessionStorage.removeItem(storageKey);
      setState(defaultValue);
    }
  }, [storageKey, defaultValue]);

  // *** [ speichern ]
  useEffect(() => {
    if (!storageKey) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    if (state === defaultValue) {
      sessionStorage.removeItem(storageKey);
      return;
    } // key default: nicht speichern

    sessionStorage.setItem(storageKey, JSON.stringify(state)); // key nicht default: speichern
  }, [storageKey, state, defaultValue]);

  return [state, setState];
}
