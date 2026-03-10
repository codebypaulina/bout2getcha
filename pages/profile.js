import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import LoginSection from "@/components/LoginSection";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const callbackUrl =
    typeof router.query.callbackUrl === "string" && router.query.callbackUrl
      ? router.query.callbackUrl // vorhanden: nach Login dahin
      : "/"; // sonst: HomePage

  return (
    <>
      <ContentContainer>
        <h1>Profile</h1>

        <LoginSection callbackUrl={callbackUrl} />
      </ContentContainer>

      {session && <Navbar />}
    </>
  );
}

const ContentContainer = styled.div`
  padding: 20px 20px 83px 20px; // Nav 75px // Abstand Bildschirmrand
  max-width: 350px; // Breite von list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;
