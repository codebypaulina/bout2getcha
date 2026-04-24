import useSWR from "swr";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import Link from "next/link";

import FormAddTransaction from "@/components/FormAddTransaction";
import CloseIcon from "/public/icons/close.svg";
import SettingsIcon from "/public/icons/settings.svg";
import PrevIcon from "/public/icons/previous.svg";
import NextIcon from "/public/icons/next.svg";
import AddIcon from "/public/icons/addNEU.svg";
import {
  parseDateString,
  getDefaultRange,
  getRangeBounds,
} from "@/utils/dateFilter";

export default function CategoryDetailsPage() {
  const router = useRouter();
  const { id, from, dateFrom, dateTo, navKey } = router.query;

  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ DATA-FETCH ]
  const { data: category, error: errorCategory } = useSWR(
    id && userId ? `/api/categories/${id}?u=${userId}` : null
  );
  const {
    data: transactions,
    error: errorTransactions,
    mutate: mutateTransactions, // für FormAddTransaction (nach save cache aktualisieren)
  } = useSWR(userId ? `/api/transactions?u=${userId}` : null);

  // *** [ STATE ]
  const [isFormAddTxOpen, setIsFormAddTxOpen] = useState(false);

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

  const dateRangeQuery =
    dateFrom && dateTo
      ? `${fromQuery ? "&" : "?"}dateFrom=${encodeURIComponent(
          dateFrom
        )}&dateTo=${encodeURIComponent(dateTo)}`
      : ""; // back & < > nav

  const navKeyQuery = navKey
    ? `${fromQuery || dateRangeQuery ? "&" : "?"}navKey=${encodeURIComponent(navKey)}`
    : ""; // < > nav

  // *** [ nav actions ] *******************************************************************
  function closeCatDetails() {
    const dateRangeQuery =
      dateFrom && dateTo
        ? `?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
        : "";

    router.replace(
      from ? `${from}${dateRangeQuery}` : `/categories${dateRangeQuery}` // HomePage / CategoriesPage + active date range
    );
  }

  function editCatDetails() {
    router.push(`/categories/${id}/edit${fromQuery}`); // für FormEditCategory nach category-delete
  }

  const goToPrevCat = useCallback(() => {
    if (!prevId) return;
    router.push(
      `/categories/${prevId}${fromQuery}${dateRangeQuery}${navKeyQuery}`
    );
  }, [prevId, fromQuery, dateRangeQuery, navKeyQuery, router]);

  const goToNextCat = useCallback(() => {
    if (!nextId) return;
    router.push(
      `/categories/${nextId}${fromQuery}${dateRangeQuery}${navKeyQuery}`
    );
  }, [nextId, fromQuery, dateRangeQuery, navKeyQuery, router]);

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
  // *** [ 1. active date range ]: aus url *************************************************
  const parsedDateFrom = parseDateString(dateFrom);
  const parsedDateTo = parseDateString(dateTo);
  const defaultRange = getDefaultRange();

  const activeDateRange =
    parsedDateFrom &&
    parsedDateTo &&
    parsedDateFrom.getTime() <= parsedDateTo.getTime()
      ? getRangeBounds(parsedDateFrom, parsedDateTo)
      : getRangeBounds(defaultRange.from, defaultRange.to); // sonst aktueller Monat

  // *** [ 2. transactions ] ***************************************************************
  const filteredTransactions = transactions
    .filter((transaction) => {
      const transactionDate = new Date(transaction.date).getTime();

      return (
        transactionDate >= activeDateRange.startTime &&
        transactionDate <= activeDateRange.endTime
      );
    }) // nur active date range
    .filter((transaction) => transaction.category?._id === id) // nur active category
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Datum aufsteigend

  // ***************************************************************************************

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
        <p className="empty-state">No transactions in this category yet.</p>
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
        onClick={() => setIsFormAddTxOpen(true)}
      >
        <AddIcon />
      </AddButton>

      {isFormAddTxOpen && (
        <FormAddTransaction
          initialCategoryId={id}
          closeForm={() => setIsFormAddTxOpen(false)}
          onTransactionAdded={mutateTransactions}
        />
      )}
    </ContentContainer>
  );
}

const ContentContainer = styled.main`
  padding: 2rem; // Abstand Bildschirmrand
  margin: 0 auto; // horizontal zentriert
  max-width: var(--app-max-width);

  .empty-state {
    text-align: center;
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
  margin-bottom: 1rem; // Abstand list / empty-state
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
  margin: 1rem auto 0; // Abstand list / empty-state + zentriert

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
