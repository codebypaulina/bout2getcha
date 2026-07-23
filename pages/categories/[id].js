import useSWR, { mutate } from "swr";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styled from "styled-components";

import PageShell from "@/components/layout/PageShell";
import StatusMessage from "@/components/layout/StatusMessage";
import NavArrowButton from "@/components/NavArrowButton";
import FormEditTransaction from "@/components/FormEditTransaction";
import FormAddTransaction from "@/components/FormAddTransaction";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

import CloseIcon from "@/public/icons/close.svg";
import TrashIcon from "@/public/icons/trash.svg";
import AddIcon from "@/public/icons/addNEU.svg";

import {
  getCategoryKey,
  getCategoriesKey,
  getTransactionsKey,
} from "@/utils/swrKeys";
import { CAT_NAME_MAX_LENGTH } from "@/utils/constants";
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
  const {
    data: category,
    error: errorCategory,
    mutate: mutateCategory,
  } = useSWR(getCategoryKey(id, userId));
  const {
    data: transactions,
    error: errorTransactions,
    mutate: mutateTransactions,
  } = useSWR(getTransactionsKey(userId));

  // *** [ STATES ]
  const [navIds, setNavIds] = useState(null); // für < > nav (snapshot ID-Reihenfolge category-list)

  const [isFormAddTxOpen, setIsFormAddTxOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);

  const [isEditingCatName, setIsEditingCatName] = useState(false);
  const [catName, setCatName] = useState("");
  const [catNameError, setCatNameError] = useState("");
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // *** [ SYNC ] **************************************************************************
  // *** [ category name ]: bei Änderung ***************************************************
  useEffect(() => {
    if (!category?.name) return;
    setCatName(category.name);
    setCatNameError("");
  }, [category?.name]);

  // *** [ < > nav ] ***********************************************************************
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
      const isEditableElement =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target.isContentEditable;

      if (isEditableElement) return; // nur, wenn nicht in NameInput

      if (event.key === "ArrowLeft") goToPrevCat();
      if (event.key === "ArrowRight") goToNextCat();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevCat, goToNextCat]);

  // *** [ GUARDS ] ************************************************************************
  if (errorCategory || errorTransactions) {
    return (
      <PageShell title="" showPageTitle={false} showBottomNav={false}>
        <StatusMessage variant="error" message="Failed to load data." />
      </PageShell>
    );
  }

  if (!category || !transactions) {
    return (
      <PageShell title="" showPageTitle={false} showBottomNav={false}>
        <StatusMessage message="Loading ..." />
      </PageShell>
    );
  }

  // *** [ DERIVED DATA ] ******************************************************************
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

  // *** [ HANDLERS ] **********************************************************************
  async function updateCategory(updatedFields) {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields),
      });

      if (response.ok) {
        await mutateCategory(); // header aktualisieren
        await mutate(getCategoriesKey(userId)); // category-list
        await mutateTransactions(); // transaction-list
      } else {
        throw new Error(
          `Failed to update category (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error updating category: ", error);
      throw error;
    }
  }

  // *** [ type-button ]
  async function handleTypeChange() {
    const newType = category.type === "Expense" ? "Income" : "Expense";
    await updateCategory({ type: newType });
  }

  // *** [ color-input ]
  async function handleColorChange(event) {
    await updateCategory({ color: event.target.value });
  }

  // *** [ name-input ] *************************
  function startCatNameEditing() {
    setCatName(category.name);
    setCatNameError("");
    setIsEditingCatName(true);
  }

  function cancelCatNameEditing() {
    setCatName(category.name);
    setCatNameError("");
    setIsEditingCatName(false);
  }

  async function saveCatName() {
    const trimmedName = catName.trim();

    if (!trimmedName) {
      setCatNameError("Name is required.");
      setIsEditingCatName(true);
      return;
    }

    if (trimmedName === category.name) {
      setCatNameError("");
      setIsEditingCatName(false);
      return;
    }

    try {
      await updateCategory({ name: trimmedName });
      setCatNameError("");
      setIsEditingCatName(false);
    } catch (error) {
      setCatNameError("Could not save name.");
      setIsEditingCatName(true);
    }
  }

  function handleCatNameKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCatName();
    }

    if (event.key === "Escape") {
      cancelCatNameEditing();
    }
  }

  // *** [ delete ] *****************************
  async function handleCatDelete() {
    const hasTransactions = category.transactionCount > 0; // Anzahl tx aus API

    try {
      // cascade delete
      const url = hasTransactions
        ? `/api/categories/${id}?cascade=true` // erst enthaltene transaction(s)
        : `/api/categories/${id}`; // nur category (leer)

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsConfirmDeleteOpen(false); // Modal schließen
        await mutate(getCategoriesKey(userId)); // category-list aktualisieren
        await mutateTransactions(); // transaction-list
        closeCatDetails(); // zurück zur vorherigen page
      } else {
        throw new Error(
          `Failed to delete category (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error deleting category: ", error);
      setIsConfirmDeleteOpen(false); // Modal schließen, damit user nicht festhängt
    }
  }

  // ***************************************************************************************

  return (
    <PageShell title="" showPageTitle={false} showBottomNav={false}>
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

        <NameNavRow>
          <NavArrowButton
            direction="prev"
            ariaLabel="Go to previous category"
            title="Previous"
            disabled={!prevId}
            onClick={goToPrevCat}
            buttonSize={25}
            iconSize={12}
          />

          <NameContainer>
            {isEditingCatName ? (
              <>
                <NameInput
                  type="text"
                  aria-label="Update category name"
                  title="Category name"
                  value={catName}
                  maxLength={CAT_NAME_MAX_LENGTH}
                  onChange={(event) => {
                    setCatName(event.target.value);
                    setCatNameError("");
                  }}
                  onKeyDown={handleCatNameKeyDown}
                  onBlur={saveCatName}
                  autoFocus
                  enterKeyHint="done"
                />

                {catNameError && <NameError>{catNameError}</NameError>}
              </>
            ) : (
              <NameButton
                type="button"
                aria-label="Edit category name"
                title="Edit category name"
                onClick={startCatNameEditing}
              >
                {category.name}
              </NameButton>
            )}
          </NameContainer>

          <NavArrowButton
            direction="next"
            ariaLabel="Go to next category"
            title="Next"
            disabled={!nextId}
            onClick={goToNextCat}
            buttonSize={25}
            iconSize={12}
          />
        </NameNavRow>

        <ActionsRow>
          <TrashButton
            type="button"
            aria-label="Delete category"
            title="Delete"
            onClick={() => setIsConfirmDeleteOpen(true)}
          >
            <TrashIcon />
          </TrashButton>

          <ColorInput
            type="color"
            aria-label="Update category color"
            title="Update category color"
            value={category.color}
            onChange={handleColorChange}
          />

          <TypeButton
            type="button"
            aria-label="Switch category type"
            title={`${category.type} (click to switch)`}
            onClick={handleTypeChange}
            $categoryType={category.type}
          />
        </ActionsRow>

        {filteredTransactions.length === 0 ? (
          <p className="empty-state">No transactions in this category yet.</p>
        ) : (
          <ul>
            {filteredTransactions.map((transaction) => (
              <li key={transaction._id}>
                <TransactionButton
                  type="button"
                  aria-label={`Edit transaction: ${transaction.description}`}
                  title="Edit transaction"
                  onClick={() => setEditingTxId(transaction._id)}
                >
                  <p className="date">
                    {new Date(transaction.date).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
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
                </TransactionButton>
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

        {isConfirmDeleteOpen && (
          <DeleteConfirmModal
            confirmationMessage={
              category.transactionCount > 0 ? (
                <p>
                  Are you sure you want to delete this category & all included
                  transactions?
                </p>
              ) : (
                <p>Are you sure you want to delete this category?</p>
              )
            }
            confirmDelete={handleCatDelete} // category löschen
            closeModal={() => setIsConfirmDeleteOpen(false)} // X / ESC / Overlay
          />
        )}

        {editingTxId && (
          <FormEditTransaction
            transactionId={editingTxId}
            onTxCategoryChanged={mutateCategory} // category-detail-cache aktualisieren (wg transactionCount)
            onTxDeleted={mutateCategory} // wg transactionCount
            closeForm={() => setEditingTxId(null)}
          />
        )}

        {isFormAddTxOpen && (
          <FormAddTransaction
            initialCategoryId={id}
            closeForm={() => setIsFormAddTxOpen(false)}
            onTxAdded={mutateCategory} // category-detail-cache aktualisieren (wg transactionCount)
          />
        )}
      </ContentContainer>
    </PageShell>
  );
}

const ContentContainer = styled.div`
  padding: 1.55rem 1rem 2rem 1rem; // Abstand Bildschirmrand / PageShell
`;

const ContentHeader = styled.div`
  display: flex; // h1 + CloseButton nebeneinander
  align-items: center; // CloseButton vertikal
  margin-bottom: 1.5rem; // Abstand NameNavRow

  h1 {
    flex: 1; // nimmt restlichen Platz in header
    text-align: center;
    font-size: 1.5rem;
    color: var(--color-text-secondary);
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex; // vertikal zentriert in ContentHeader

  svg {
    width: 25px;
    height: 25px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: var(--color-button-bg);
  }
  svg path[class*="X"] {
    fill: var(--color-button-text);
  }

  &:hover {
    transform: scale(1.07);

    svg path[class*="X"] {
      fill: var(--color-text-primary);
    }
  }
`;

// **************************************************************

const NameNavRow = styled.div`
  display: grid; //      NavArrowButton | NameContainer | NavArrowButton
  grid-template-columns: 25px minmax(0, 1fr) 25px;
  column-gap: 1rem; // Abstand items
  align-items: center; // vertikal
  margin-bottom: 1rem; // Abstand ActionsRow
`;

const NameContainer = styled.div`
  min-width: 0; // für ellipsis in grid
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const NameButton = styled.button`
  width: 100%; // volle verfügbare Breite in grid
  background: transparent;
  border: 1px solid transparent; // wie NameInput (springt nicht)
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 1.15rem;
  font-weight: bold;
  cursor: pointer;
  padding: 3px 0 6px 0; // wie NameInput (springt nicht)

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    transform: scale(1.03);
    color: var(--color-text-primary);
  }
`;

const NameInput = styled.input`
  width: 100%; // volle verfügbare Breite in grid
  background: transparent;
  border: 1px solid var(--color-text-primary);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 1.15rem;
  font-weight: bold;
  text-align: center;
  outline: none;
  padding: 3px 0 6px 0; // text vertikal zentrierter
`;

const NameError = styled.p`
  margin-top: 0.25rem;
  color: var(--color-expense);
  font-size: 0.75rem;
`;

// **************************************************************

const ActionsRow = styled.div`
  display: grid; //      TrashButton | ColorInput | TypeButton
  grid-template-columns: 1fr auto auto;
  align-items: center; // TrashButton vertikal zentiert
  gap: 1rem; // Abstand zw. ColorInput + TypeButton
  margin-bottom: 1.5rem; // Abstand list / empty.state
`;

const TrashButton = styled.button`
  width: 25px;
  background: transparent;
  border: none;
  cursor: pointer;

  display: flex; // icon vertikal zentriert
  justify-content: center; // horizontal

  svg {
    height: 20px;
    fill: var(--color-danger-button-bg);
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }

  &:hover {
    transform: scale(1.07);
  }
`;

const ColorInput = styled.input`
  width: 25px;
  height: 25px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-text-primary);
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);
  background-color: ${(props) => props.value};

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  } // [Chrome]

  &::-webkit-color-swatch {
    border: none;
  } // [Chrome]

  &::-moz-color-swatch {
    border: none;
  } // [Firefox]

  &:hover {
    transform: scale(1.07);
  }
`;

const TypeButton = styled.button`
  width: 25px;
  height: 25px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  background-color: ${({ $categoryType }) =>
    $categoryType === "Income"
      ? "var(--color-income)"
      : "var(--color-expense)"};

  &:hover {
    transform: scale(1.07);
  }
`;

// **************************************************************

const AddButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  display: block; // wegen Zentrierung
  margin: 1.5rem auto 0; // Abstand list / empty-state + zentriert

  svg {
    width: 25px;
    height: 25px;
    filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Ecken
  }
  svg path[class*="circle"] {
    fill: var(--color-button-bg);
  }
  svg rect[class*="plus"] {
    fill: var(--color-button-text);
  }

  &:hover {
    transform: scale(1.07);

    svg rect[class*="plus"] {
      fill: var(--color-text-primary);
    }
  }
`;

const TransactionButton = styled.button`
  width: 100%; // wie ContentContainer
  background: transparent;
  border: none;
  cursor: pointer;

  display: grid; //      date | description | amount
  grid-template-columns: minmax(33px, 50px) minmax(0, 1fr) max-content;
  column-gap: 0.5rem; // Abstand items
  padding-bottom: 0.2rem; // Abstand zw. Zeilen

  p {
    text-align: left;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  p.date {
    overflow: hidden;
  }

  p.description {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.amount {
    text-align: right;
    font-weight: bold;
  }

  &:hover {
    p {
      transform: scale(1.03);
      color: var(--color-text-primary);
    }

    p.description {
      transform-origin: left center; // sonst zu arg links
    }
  }
`;
