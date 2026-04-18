import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { mutate } from "swr";
import styled from "styled-components";

import MainPageLayout from "@/components/MainPageLayout";
import LoginSection from "@/components/LoginSection";
import useTopBarTitle from "@/hooks/useTopBarTitle";

export default function ProfilePage() {
  const router = useRouter();

  const { data: session } = useSession();
  const userId = session?.user?.userId;

  // *** [ PAGE TITLE ]: TopBar **************************************************
  const pageTitle = session ? "Profile" : "gotcha";
  const { pageTitleRef, showTopBarTitle } = useTopBarTitle();

  // *** [ LOGIN REDIRECT ] ******************************************************
  const callbackUrl =
    typeof router.query.callbackUrl === "string" && router.query.callbackUrl
      ? router.query.callbackUrl // vorhanden: nach Login dahin
      : "/"; // sonst: HomePage

  // *** [ BOOTSTRAP SEEDING ]: default categories + transactions ****************
  useEffect(() => {
    if (!userId) return;

    async function runBootstrap() {
      try {
        const response = await fetch("/api/bootstrap", { method: "POST" });
        const data = await response.json();

        // nach seed: SWR-cache ohne reload aktualisieren
        if (!data.alreadySeeded) {
          mutate(`/api/categories?u=${userId}`);
          mutate(`/api/transactions?u=${userId}`);
        }
      } catch (error) {
        console.error("Bootstrap failed");
      }
    }

    runBootstrap();
  }, [userId]);

  return (
    <MainPageLayout title={pageTitle} showTitle={showTopBarTitle}>
      <ContentContainer>
        <h1 ref={pageTitleRef}>{pageTitle}</h1>

        <LoginSection callbackUrl={callbackUrl} />
      </ContentContainer>
    </MainPageLayout>
  );
}

const ContentContainer = styled.div`
  // padding: 5rem 20px; // Abstand Bildschirmrand (TopBar + BottomNav: 57px)
  max-width: 350px; // Breite von list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;
