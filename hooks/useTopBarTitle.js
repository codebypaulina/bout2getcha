import { useRef, useState, useEffect } from "react";

export default function useTopBarTitle() {
  const pageTitleRef = useRef(null); // um Scroll-Position von h1 zu messen
  const [showTopBarTitle, setShowTopBarTitle] = useState(false);

  useEffect(() => {
    function updateTopBarTitle() {
      if (!pageTitleRef.current) return;

      const titleRect = pageTitleRef.current.getBoundingClientRect(); // aktuelle Position + Höhe h1
      const topBarHeight = 50; // Höhe TopBar in px (ab hier h1 nicht sichtbar)
      const shouldShowTitle = titleRect.bottom <= topBarHeight; // true = h1-bottom auf Höhe TopBar / drüber

      setShowTopBarTitle(shouldShowTitle); // h1 nicht sichtbar -> in TopBar
    }

    updateTopBarTitle(); // prüft direkt bei 1. render

    window.addEventListener("scroll", updateTopBarTitle); // scrollen
    window.addEventListener("resize", updateTopBarTitle); // zoomen

    return () => {
      window.removeEventListener("scroll", updateTopBarTitle);
      window.removeEventListener("resize", updateTopBarTitle);
    };
  }, []);

  return { pageTitleRef, showTopBarTitle }; // an pages
}
