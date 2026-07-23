import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { mutate } from "swr";

import PageShell from "@/components/layout/PageShell";
import StatusMessage from "@/components/layout/StatusMessage";
import LoginSection from "@/components/LoginSection";

import { getCategoriesKey, getTransactionsKey } from "@/utils/swrKeys";

export default function ProfilePage() {
  const router = useRouter();

  const { data: session, status } = useSession();
  const userId = session?.user?.userId;

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
          mutate(getCategoriesKey(userId));
          mutate(getTransactionsKey(userId));
        }
      } catch (error) {
        console.error("Bootstrap failed");
      }
    }

    runBootstrap();
  }, [userId]);

  // *** [ SESSION LOADING ] *****************************************************
  // während auth-Prüfung: loading state (kein flash)
  if (status === "loading") {
    return (
      <PageShell title="" showPageTitle={false} centerContent>
        <StatusMessage message="Loading ..." />
      </PageShell>
    );
  }

  // nach auth-Prüfung: profile view
  const isAuthenticated = status === "authenticated";
  const pageTitle = isAuthenticated ? "Profile" : "bout2getcha";

  return (
    <PageShell title={pageTitle} centerContent={!isAuthenticated}>
      <LoginSection session={session} callbackUrl={callbackUrl} />
    </PageShell>
  );
}
