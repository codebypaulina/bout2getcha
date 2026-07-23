import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import styled from "styled-components";

export default function LoginSection({ session, callbackUrl = "/" }) {
  // session + callbackUrl von ProfilePage

  // [eingeloggt]: Logout -> ProfilePage
  if (session) {
    return (
      <Wrapper>
        <Message $signedIn>
          Signed in as <span className="user">{session.user.name}</span>.
        </Message>

        <SignOutButton
          type="button"
          onClick={() => signOut({ callbackUrl: "/profile" })}
        >
          Sign out
        </SignOutButton>
      </Wrapper>
    );
  }

  // [nicht eingeloggt]: Login -> callbackUrl
  return (
    <Wrapper>
      <Message>
        Sign in to solve the mystery of where your money sneaks off to every
        month. 💫✨
      </Message>

      <ButtonContainer>
        <ProviderButton
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
        >
          <Image src="/icons/google.svg" alt="" width={24} height={24} />
          Google
        </ProviderButton>

        <ProviderButton
          type="button"
          onClick={() => signIn("github", { callbackUrl })}
        >
          <Image src="/icons/github.svg" alt="" width={24} height={24} />
          GitHub
        </ProviderButton>
      </ButtonContainer>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  margin-top: 1rem; // zusätzl. Abstand page title
`;

const Message = styled.p`
  align-self: ${({ $signedIn }) => ($signedIn ? "stretch" : "auto")};
  text-align: ${({ $signedIn }) => ($signedIn ? "left" : "center")};
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-secondary);

  .user {
    font-weight: bold;
    color: var(--color-income);
  }
`;

const Button = styled.button`
  border: none;
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  &:hover {
    transform: scale(1.03);
    color: var(--color-text-primary);
  }
`;

const SignOutButton = styled(Button)`
  min-width: 90px;
  min-height: 40px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
`;

const ButtonContainer = styled.div`
  width: min(100%, 140px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ProviderButton = styled(Button)`
  width: 100%;
  min-height: 50px;
  border-radius: var(--radius-lg);
  font-size: 1.2rem;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
`;
