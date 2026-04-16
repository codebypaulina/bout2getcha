import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styled from "styled-components";

import HomeIcon from "../public/icons/home.svg";
import TransactionsIcon from "../public/icons/transactions.svg";
import AddIcon from "../public/icons/add.svg";
import CategoriesIcon from "../public/icons/categories.svg";
import ProfileIcon from "../public/icons/profile.svg";

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session) {
    return <Wrapper />;
  } // wenn ausgeloggt, keine actions

  return (
    <Wrapper>
      <ul>
        <NavbarItem $isActive={router.pathname === "/"}>
          <StyledLink
            href="/"
            aria-label="Home"
            aria-current={router.pathname === "/" ? "page" : undefined}
          >
            <HomeIcon />
          </StyledLink>
        </NavbarItem>

        <NavbarItem $isActive={router.pathname === "/transactions"}>
          <StyledLink
            href="/transactions"
            aria-label="Transactions"
            aria-current={
              router.pathname === "/transactions" ? "page" : undefined
            }
          >
            <TransactionsIcon />
          </StyledLink>
        </NavbarItem>

        <NavbarItem $isActive={router.pathname === "/adding"}>
          <StyledLink
            href="/adding"
            aria-label="Add transaction or category"
            aria-current={router.pathname === "/adding" ? "page" : undefined}
          >
            <AddIcon />
          </StyledLink>
        </NavbarItem>

        <NavbarItem $isActive={router.pathname === "/categories"}>
          <StyledLink
            href="/categories"
            aria-label="Categories"
            aria-current={
              router.pathname === "/categories" ? "page" : undefined
            }
          >
            <CategoriesIcon />
          </StyledLink>
        </NavbarItem>

        <NavbarItem $isActive={router.pathname === "/profile"}>
          <StyledLink
            href="/profile"
            aria-label="Profile"
            aria-current={router.pathname === "/profile" ? "page" : undefined}
          >
            <ProfileIcon />
          </StyledLink>
        </NavbarItem>
      </ul>
    </Wrapper>
  );
}

const Wrapper = styled.nav`
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 57px; // größer als TopBar (50px)
  background-color: var(--button-background-color);

  ul {
    list-style: none;
    display: flex; // items nebeneinander
  }
`;

const NavbarItem = styled.li`
  padding: 1rem;
  flex: 1; // ausgefüllt, keine Lücken
  background-color: ${({ $isActive }) =>
    $isActive
      ? "var(--button-active-color)"
      : "var(--button-background-color)"};

  svg {
    width: 25px;
    height: 25px;
    fill: ${({ $isActive }) =>
      $isActive
        ? "var(--button-active-text-color)"
        : "var(--button-text-color)"};
  }

  &:hover svg {
    transform: scale(1.1);
  }
`;

const StyledLink = styled(Link)`
  display: flex;
  justify-content: center; // svg horizontal zentriert
`;
