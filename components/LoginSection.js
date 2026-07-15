import { useSession, signIn, signOut } from "next-auth/react";
import styled from "styled-components";

export default function LoginSection({ callbackUrl = "/" }) {
  // callbackUrl von ProfilePage

  const { data: session } = useSession();

  // [eingeloggt]: Logout -> ProfilePage
  if (session) {
    return (
      <Wrapper>
        <Message $signedIn>
          Signed in as <span className="user">{session.user.name}</span>.
        </Message>

        <Button
          type="button"
          onClick={() => signOut({ callbackUrl: "/profile" })}
        >
          Sign out
        </Button>
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
        <Button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          $provider
        >
          Google
        </Button>

        <Button
          type="button"
          onClick={() => signIn("github", { callbackUrl })}
          $provider
        >
          GitHub
        </Button>
      </ButtonContainer>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
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
  min-width: ${({ $provider }) => ($provider ? "115px" : "108px")};
  min-height: ${({ $provider }) => ($provider ? "50px" : "40px")};
  border: none;
  border-radius: ${({ $provider }) =>
    $provider ? "var(--radius-lg)" : "var(--radius-md)"};
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  font-size: ${({ $provider }) => ($provider ? "1.25rem" : "0.85rem")};
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  &:hover {
    transform: scale(1.03);
    color: var(--color-text-primary);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;
