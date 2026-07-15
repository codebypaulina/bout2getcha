import { useRef, useState, useEffect } from "react";
import styled from "styled-components";

import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import { DESKTOP_BREAKPOINT } from "@/utils/constants";

export default function PageShell({
  title,
  children,
  showPageTitle = true, // für AddingPage
  showBottomNav = true, // für CategoryDetailsPage
}) {
  const pageTitleRef = useRef(null); // h1 in PageContent
  const pageContentRef = useRef(null); // PageContent
  const [showTopBarTitle, setShowTopBarTitle] = useState(false); // PageTitle in TopBar

  useEffect(() => {
    function updateTopBarTitle() {
      if (!showPageTitle || !pageTitleRef.current || !pageContentRef.current)
        return;

      const titleRect = pageTitleRef.current.getBoundingClientRect(); // h1-Position im viewport
      const contentTop = pageContentRef.current.getBoundingClientRect().top; // PageContent-top
      const isTitleOutOfView = titleRect.bottom <= contentTop; // true = h1-bottom auf/über PageContent-top

      setShowTopBarTitle(isTitleOutOfView);
    }

    const contentElement = pageContentRef.current; // PageContent
    updateTopBarTitle();

    contentElement?.addEventListener("scroll", updateTopBarTitle);
    window.addEventListener("resize", updateTopBarTitle);

    return () => {
      contentElement?.removeEventListener("scroll", updateTopBarTitle);
      window.removeEventListener("resize", updateTopBarTitle);
    };
  }, [showPageTitle]);

  return (
    <PageLayout>
      <TopBar title={title} showTitle={showTopBarTitle} />

      <PageContent ref={pageContentRef}>
        {showPageTitle ? (
          <PageTitle ref={pageTitleRef}>{title}</PageTitle>
        ) : null}

        {children}
      </PageContent>

      {showBottomNav ? <BottomNav /> : null}
    </PageLayout>
  );
}

const PageLayout = styled.div`
  height: 100%; // wie AppViewport
  display: grid; //   TopBar | PageContent (scrollbar) | BottomNav
  grid-template-rows: var(--top-bar-height) minmax(0, 1fr) var(
      --bottom-nav-height
    );

  @media (min-width: ${DESKTOP_BREAKPOINT}) {
    padding: 25px 0 40px 0; // äußerer Abstand (über TopBar + unter BottomNav)
  }
`;

// [ innere App-Fläche ]: background dunkel, runde Ecken, scrollbar
const PageContent = styled.main`
  min-height: 0; // für grid (damit scrollbar)
  background-color: var(--color-background-page);
  padding: 20px 30px 30px 30px; // innerer Abstand (zw. TopBar + BottomNav + seitlich)
  overflow-y: auto; // vertikal scrollbar
  overflow-x: hidden; // horizontal nicht scrollbar

  .empty-state {
    text-align: center;
  }

  @media (min-width: ${DESKTOP_BREAKPOINT}) {
    position: relative; // für BottomNav
    z-index: 2; // über BottomNav-Füllfläche (overlay von FormEditTransaction + DatePicker über BottomNav)
    border-radius: var(--radius-page);
  }
`;

const PageTitle = styled.h1`
  text-align: center;
  margin-bottom: 1.5rem;
`;
