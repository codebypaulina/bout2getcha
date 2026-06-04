import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { mutate } from "swr";

import PageShell from "@/components/layout/PageShell";
import LoginSection from "@/components/LoginSection";

export default function ProfilePage() {
  const router = useRouter();

  const { data: session } = useSession();
  const userId = session?.user?.userId;

  const pageTitle = session ? "Profile" : "bout2getcha";

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
    <PageShell title={pageTitle}>
      <LoginSection callbackUrl={callbackUrl} />
    </PageShell>
  );
}
