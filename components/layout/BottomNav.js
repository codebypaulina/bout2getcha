import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styled from "styled-components";

import HomeIcon from "../public/icons/home.svg";
import TransactionsIcon from "../public/icons/transactions.svg";
import AddIcon from "../public/icons/add.svg";
import CategoriesIcon from "../public/icons/categories.svg";
import ProfileIcon from "../public/icons/profile.svg";
import { DESKTOP_BREAKPOINT } from "@/utils/constants";

export default function BottomNav() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session) {
    return <Wrapper />;
  } // wenn ausgeloggt, keine actions

  const activeEdge =
    router.pathname === "/"
      ? "left"
      : router.pathname === "/profile"
        ? "right"
        : null; // Füllfläche

  return (
    <Wrapper $activeEdge={activeEdge}>
      <ul>
        <NavItem $isActive={router.pathname === "/"}>
          <StyledLink
            href="/"
            aria-label="Home"
            aria-current={router.pathname === "/" ? "page" : undefined}
          >
            <HomeIcon />
          </StyledLink>
        </NavItem>

        <NavItem $isActive={router.pathname === "/transactions"}>
          <StyledLink
            href="/transactions"
            aria-label="Transactions"
            aria-current={
              router.pathname === "/transactions" ? "page" : undefined
            }
          >
            <TransactionsIcon />
          </StyledLink>
        </NavItem>

        <NavItem $isActive={router.pathname === "/adding"}>
          <StyledLink
            href="/adding"
            aria-label="Add transaction or category"
            aria-current={router.pathname === "/adding" ? "page" : undefined}
          >
            <AddIcon />
          </StyledLink>
        </NavItem>

        <NavItem $isActive={router.pathname === "/categories"}>
          <StyledLink
            href="/categories"
            aria-label="Categories"
            aria-current={
              router.pathname === "/categories" ? "page" : undefined
            }
          >
            <CategoriesIcon />
          </StyledLink>
        </NavItem>

        <NavItem $isActive={router.pathname === "/profile"}>
          <StyledLink
            href="/profile"
            aria-label="Profile"
            aria-current={router.pathname === "/profile" ? "page" : undefined}
          >
            <ProfileIcon />
          </StyledLink>
        </NavItem>
      </ul>
    </Wrapper>
  );
}

const Wrapper = styled.nav`
  height: var(--bottomnav-height); // wie TopBar
  background-color: var(--button-background-color);

  ul {
    display: flex; // items nebeneinander
  }

  // *** [ Füllfläche links + rechts ] *************
  @media (min-width: ${DESKTOP_BREAKPOINT}) {
    position: relative;

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: calc(-1 * var(--page-radius));
      width: var(--page-radius);
      height: var(--page-radius);
      background-color: var(--button-active-color);
      display: none; // keine Füllfläche
    }

    &::before {
      left: 0;
      display: ${({ $activeEdge }) =>
        $activeEdge === "left" ? "block" : "none"};
    }

    &::after {
      right: 0;
      display: ${({ $activeEdge }) =>
        $activeEdge === "right" ? "block" : "none"};
    }

    ul {
      position: relative;
      z-index: 1; // über Füllfläche
    }
  }
`;

const NavItem = styled.li`
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
