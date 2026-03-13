import useSWR from "swr";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import Link from "next/link";
import CloseIcon from "/public/icons/close.svg";
import SettingsIcon from "/public/icons/settings.svg";
import PrevIcon from "/public/icons/previous.svg";
import NextIcon from "/public/icons/next.svg";
import AddIcon from "/public/icons/addNEU.svg";

export default function CategoryDetailsPage() {
  const router = useRouter();
  const { id, from, month, navKey } = router.query;

  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ data-fetch ]
  const { data: category, error: errorCategory } = useSWR(
    id && userId ? `/api/categories/${id}?u=${userId}` : null
  );
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );

  // *** [ < > nav ] ***********************************************************************
  // *** [ state ]: snapshot ID-Reihenfolge category-list
  const [navIds, setNavIds] = useState(null);

  // *** [ session storage ]: snapshot abrufen
  useEffect(() => {
    if (!router.isReady) return;
    if (!navKey) return;

    const storedIds = sessionStorage.getItem(navKey);
    if (!storedIds) return;

    try {
      const parsedIds = JSON.parse(storedIds);
      if (Array.isArray(parsedIds)) setNavIds(parsedIds);
    } catch {}
  }, [router.isReady, navKey]);

  // *** [ nav IDs ]: prev / next **********************************************************
  const index = navIds ? navIds.indexOf(id) : -1; // aktuelle ID im array
  const prevId = index > 0 ? navIds[index - 1] : null; // vorherige (sonst < disabled)
  const nextId =
    index >= 0 && navIds && index < navIds.length - 1
      ? navIds[index + 1]
      : null; // nächste (sonst > disabled)

  console.log({ navKey, id, navIds, index, prevId, nextId });

  // *** [ nav routes ] ********************************************************************
  const fromQuery = from ? `?from=${encodeURIComponent(from)}` : ""; // back nav (HomePage / CategoriesPage)
  const monthQuery = month
    ? `${fromQuery ? "&" : "?"}month=${encodeURIComponent(month)}`
    : ""; // active month bei < > nav
  const navKeyQuery = navKey
    ? `${fromQuery || monthQuery ? "&" : "?"}navKey=${encodeURIComponent(navKey)}`
    : ""; // < > nav

  // *** [ nav actions ] *******************************************************************
  function closeCatDetails() {
    if (from) {
      const targetUrl = month
        ? `${from}?month=${encodeURIComponent(month)}` // HomePage / CategoriesPage mit active month
        : from; // HomePage / CategoriesPage
      router.replace(targetUrl);
    } else {
      const fallbackUrl = month
        ? `/categories?month=${encodeURIComponent(month)}`
        : "/categories";
      router.replace(fallbackUrl);
    }
  }

  function editCatDetails() {
    router.push(`/categories/${id}/edit${fromQuery}`); // für FormEditCategory nach category-delete
  }

  const goToPrevCat = useCallback(() => {
    if (!prevId) return;
    router.push(`/categories/${prevId}${fromQuery}${monthQuery}${navKeyQuery}`);
  }, [prevId, fromQuery, monthQuery, navKeyQuery, router]);

  const goToNextCat = useCallback(() => {
    if (!nextId) return;
    router.push(`/categories/${nextId}${fromQuery}${monthQuery}${navKeyQuery}`);
  }, [nextId, fromQuery, monthQuery, navKeyQuery, router]);

  // *** [ keyboard nav ] ******************************************************************
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "ArrowLeft") goToPrevCat();
      if (event.key === "ArrowRight") goToNextCat();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevCat, goToNextCat]);

  // *** [ guards ] ************************************************************************
  if (errorCategory || errorTransactions) return <h3>Failed to load data</h3>;
  if (!category || !transactions) return <h3>Loading ...</h3>;

  // *** [ ABGELEITETE DATEN ] *************************************************************
  // *** [ 1. active month ]: aus url ******************************************************
  let activeMonthDate = new Date();

  if (typeof month === "string") {
    const [yearString, monthString] = month.split("-"); // "2026-02" -> "2026" + "02"
    const parsedYear = Number(yearString); // "2026" -> 2026
    const parsedMonthIndex = Number(monthString) - 1; // "02" => 2 => -1 => 1

    if (
      Number.isInteger(parsedYear) &&
      Number.isInteger(parsedMonthIndex) &&
      parsedMonthIndex >= 0 &&
      parsedMonthIndex <= 11
    ) {
      activeMonthDate = new Date(parsedYear, parsedMonthIndex, 1); // 1. Tag von url-month
    }
  }

  const activeYear = activeMonthDate.getFullYear();
  const activeMonth = activeMonthDate.getMonth();

  // *** [ 2. transactions ] ***************************************************************
  // *** [nur aus active month]
  const activeMonthTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);

    return (
      transactionDate.getFullYear() === activeYear &&
      transactionDate.getMonth() === activeMonth
    );
  });

  // *** [filtern + sortieren]
  const filteredTransactions = activeMonthTransactions
    .filter((transaction) => transaction.category?._id === id) // nur aktuelle category
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Datum aufsteigend

  return (
    <ContentContainer>
      <ContentHeader>
        <h1>Category Details</h1>

        <CloseButton
          type="button"
          aria-label="Close category details"
          title="Close"
          onClick={closeCatDetails}
        >
          <CloseIcon />
        </CloseButton>
      </ContentHeader>

      <DetailsRow>
        <ColorTag
          color={
            category.type === "Income"
              ? "var(--income-color)"
              : "var(--expense-color)"
          }
        />
        <ColorTag color={category.color} />

        <h2>{category.name}</h2>

        <SettingsButton
          type="button"
          aria-label="Edit category details"
          title="Edit"
          onClick={editCatDetails}
        >
          <SettingsIcon />
        </SettingsButton>
      </DetailsRow>

      <NavRow>
        <NavButton
          type="button"
          aria-label="Previous category"
          title="Previous"
          disabled={!prevId}
          onClick={goToPrevCat}
        >
          <PrevIcon className="prev" />
        </NavButton>

        <NavButton
          type="button"
          aria-label="Next category"
          title="Next"
          disabled={!nextId}
          onClick={goToNextCat}
        >
          <NextIcon className="next" />
        </NavButton>
      </NavRow>

      {filteredTransactions.length === 0 ? (
        <p className="no-transaction">No transactions in this category yet.</p>
      ) : (
        <ul>
          {filteredTransactions.map((transaction) => (
            <li key={transaction._id}>
              <StyledLink href={`/transactions/${transaction._id}`}>
                <p className="date">
                  {new Date(transaction.date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>

                <p className="description">{transaction.description}</p>

                <p className="amount">
                  {transaction.amount.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
              </StyledLink>
            </li>
          ))}
        </ul>
      )}

      <AddButton
        type="button"
        aria-label="Add transaction"
        title="Add"
        onClick={() => router.push(`/adding?category=${id}`)}
      >
        <AddIcon />
      </AddButton>
    </ContentContainer>
  );
}

const ContentContainer = styled.div`
  padding: 2rem; // Abstand Bildschirmrand
  margin: 0 auto; // horizontal zentriert
  max-width: 450px;

  .no-transaction {
    text-align: center;
  }

  ul {
    list-style: none;
  }
`;

const ContentHeader = styled.div`
  display: flex; // h1 + CloseButton nebeneinander
  margin-bottom: 1rem; // Abstand DetailsRow

  h1 {
    font-size: 1.5rem;
    flex: 1; // nimmt restlichen Platz in header
    text-align: center;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  svg {
    width: 22px;
    height: 23px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: var(--button-background-color);
  }
  svg path[class*="X"] {
    fill: var(--button-text-color);
  }

  &:hover {
    transform: scale(1.07);

    svg path[class*="X"] {
      fill: var(--primary-text-color);
    }
  }
`;

const DetailsRow = styled.div`
  display: flex;
  justify-content: center; // ColorTags + {category.name} horizontal zentriert
  align-items: center; // ColorTags vertikal zentriert
  gap: 0.5rem;
`;

const ColorTag = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%; // rund
  background-color: ${(props) => props.color};
`;

const SettingsButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  display: flex; // icon vertikal zentriert
  margin-left: 0.5rem; // Abstand {category.name}

  svg {
    width: 23px;
    height: 23px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="gear"] {
    fill: var(--button-background-color);
  }
  svg path[class*="gear-ring"] {
    fill: var(--button-text-color);
  }

  &:hover {
    transform: scale(1.07);

    svg path[class*="gear-ring"] {
      fill: var(--primary-text-color);
    }
  }
`;

const NavRow = styled.div`
  display: flex; // buttons nebeneinander
  justify-content: space-between; // prev links, next rechts
  margin-bottom: 1rem; // Abstand list / no-transaction
`;

const NavButton = styled.button`
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background-color: var(--button-background-color);
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  svg {
    height: 10px;
    width: 10px;
    stroke: var(--button-text-color);
  }
  .prev {
    margin-right: 2px;
  }
  .next {
    margin-left: 2px;
  }

  &:hover {
    transform: scale(1.07);

    svg {
      stroke: var(--primary-text-color);
    }
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

const AddButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  display: block; // wegen Zentrierung
  margin: 1rem auto 0; // Abstand list / no-transaction + zentriert

  svg {
    width: 23px;
    height: 22px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: var(--button-background-color);
  }
  svg rect[class*="plus"] {
    fill: var(--button-text-color);
  }

  &:hover {
    transform: scale(1.07);

    svg rect[class*="plus"] {
      fill: var(--primary-text-color);
    }
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  display: flex;
  gap: 1rem; // Abstand items
  padding-bottom: 0.2rem; // Abstand zw. Zeilen

  p {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  p.date {
    overflow: hidden;
    min-width: 33px;
  }

  p.description {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 60px;
  }

  p.amount {
    margin-left: auto; // rechts
    font-weight: bold;
  }

  &:hover {
    p {
      transform: scale(1.03);
      color: var(--primary-text-color);
    }
  }
`;
