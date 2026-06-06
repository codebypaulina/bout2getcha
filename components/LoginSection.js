import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginSection({ callbackUrl = "/" }) {
  // callbackUrl von ProfilePage

  const { data: session } = useSession();

  // [eingeloggt]: Logout -> ProfilePage
  if (session) {
    return (
      <>
        Signed in as {session.user.name} <br />
        <button onClick={() => signOut({ callbackUrl: "/profile" })}>
          Sign out
        </button>
      </>
    );
  }

  // [nicht eingeloggt]: Login -> callbackUrl
  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn(undefined, { callbackUrl })}>
        Sign in
      </button>
    </>
  );
}
