import useSWR, { useSWRConfig } from "swr";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";

import StatusMessage from "./layout/StatusMessage";
import CloseIcon from "@/public/icons/close.svg";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";
import { getCategoriesKey, getTransactionsKey } from "@/utils/swrKeys";
import { TX_DESCRIPTION_MAX_LENGTH, TX_AMOUNT_MIN } from "@/utils/constants";

export default function FormAddTransaction({
  initialCategoryId = "", // CategoryDetailsPage
  onTxAdded, // CategoryDetailsPage
  closeForm, // AddingPage + CategoryDetailsPage
}) {
  // *** [ SWR-CACHE ]
  const { mutate } = useSWRConfig(); // um tx-list zu aktualisieren

  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ DATA-FETCH ]
  const { data: categories, error } = useSWR(getCategoriesKey(userId));

  // *** [ STATES ]
  const [currentCategoryId, setCurrentCategoryId] = useState(initialCategoryId); // ID für dropdown
  const [typeFilter, setTypeFilter] = useState("Expense"); // type für dropdown-filter + ColorTag
  const [lastSelectedCategoryIdByType, setLastSelectedCategoryIdByType] =
    useState({
      Expense: "",
      Income: "",
    }); // zuletzt ausgewählte ID je type für dropdown-memory

  // *** [ SYNC ] **************************************************************************
  // *** [1. type-filter + memory]: aus aktueller category
  useEffect(() => {
    if (!categories) return;
    if (!currentCategoryId) return;

    const currentCategory = categories.find(
      (category) => category._id === currentCategoryId
    );
    if (!currentCategory) return;

    setTypeFilter(currentCategory.type);
    setLastSelectedCategoryIdByType((prev) => ({
      ...prev,
      [currentCategory.type]: currentCategoryId,
    }));
  }, [categories, currentCategoryId]);

  // *** [ 2. ESC-listener ]
  useEscapeClose(true, closeForm);

  // *** [ GUARDS ] ************************************************************************
  if (error) {
    return (
      <>
        <Overlay onClick={closeForm} />

        <FormContainer as="section">
          <StatusMessage variant="error" message="Failed to load data." />
        </FormContainer>
      </>
    );
  }

  if (!categories) {
    return (
      <>
        <Overlay onClick={closeForm} />

        <FormContainer as="section">
          <StatusMessage message="Loading ..." />
        </FormContainer>
      </>
    );
  }

  // *** [ DERIVED DATA ] ******************************************************************
  // *** [categories sortieren]: A-Z (für dropdown)
  // undefined: user-locale // sensitivity: case- & accent-insensitive
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // *** [categories filtern]: nach type (für dropdown)
  const filteredCategories = sortedCategories.filter(
    (category) => category.type === typeFilter
  );

  // *** [ HANDLERS ] **********************************************************************
  // *** [ category-select ]
  function handleCategoryChange(event) {
    const selectedId = event.target.value;
    setCurrentCategoryId(selectedId); // ausgewählte ID als aktuelle category

    if (selectedId) {
      setLastSelectedCategoryIdByType((prev) => ({
        ...prev,
        [typeFilter]: selectedId,
      }));
    } // wenn ID ausgewählt, dann diese in memory für aktiven type-filter
  }

  // *** [ type-filter-button ]
  function toggleTypeFilter() {
    const toggledType = typeFilter === "Expense" ? "Income" : "Expense";

    setTypeFilter(toggledType);
    setCurrentCategoryId(lastSelectedCategoryIdByType[toggledType] || ""); // memory für type / "Select"
  }

  // *** [ save-button ]
  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const transactionData = Object.fromEntries(formData); // form data -> object

    try {
      // *** [ db ]: tx speichern
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to add new transaction (status: ${response.status})`
        );
      }

      const createdTransaction = await response.json(); // neue tx

      // *** [ swr-cache ]: tx-list aktualisieren
      const transactionsKey = getTransactionsKey(userId); // key tx-list

      await mutate(
        transactionsKey,

        // bisherige tx-list aus cache:
        (currentTransactions) => {
          if (currentTransactions === undefined) {
            return undefined;
          } // wenn keine list, nicht list mit nur neuer tx anlegen

          return [...currentTransactions, createdTransaction]; // aktualisierter cache: bisherige list + neue tx
        },

        { revalidate: false } // nicht zusätzl GET, weil neue tx von POST
      );

      await onTxAdded?.(); // parent data: CategoryDetailsPage aktualisiert detail-cache, AddingPage nicht nötig

      closeForm(); // zu CategoryDetailsPage / AddingPage
    } catch (error) {
      console.error("Error adding new transaction: ", error);
    }
  }

  // ***************************************************************************************

  return (
    <>
      <Overlay onClick={closeForm} />

      <FormContainer onSubmit={handleSubmit}>
        <FormHeader>
          <h2>Transaction</h2>

          <CloseButton
            type="button"
            aria-label="Close form"
            title="Close"
            onClick={closeForm} // AddingPage selection view / CategoryDetailsPage
          >
            <CloseIcon />
          </CloseButton>
        </FormHeader>

        <label htmlFor="category">Category</label>
        <CategoryGroup>
          <select
            id="category"
            name="category"
            aria-label="Select category"
            title="Category"
            value={currentCategoryId} // state
            onChange={handleCategoryChange}
            required
          >
            <option value="" disabled>
              Select
            </option>

            {filteredCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <ColorTag
            type="button"
            aria-label="Switch category filter"
            title={`${typeFilter} (click to switch)`}
            onClick={toggleTypeFilter}
            $categoryType={typeFilter}
          />
        </CategoryGroup>

        <label htmlFor="description">Description</label>
        <input
          type="text"
          id="description"
          name="description"
          aria-label="Enter description"
          title="Description"
          placeholder=" ..."
          maxLength={TX_DESCRIPTION_MAX_LENGTH}
          required
        />

        <label htmlFor="amount">Amount</label>
        <input
          type="number"
          id="amount"
          name="amount"
          aria-label="Enter amount"
          title="Amount"
          placeholder=" 0,00 €"
          inputMode="decimal"
          min={TX_AMOUNT_MIN}
          step="any" // Kommazahlen (in FormEditTransaction geht 0.01 nicht)
          required
        />

        <label htmlFor="date">Date</label>
        <input
          type="date"
          id="date"
          name="date"
          aria-label="Select date"
          title="Date"
          defaultValue={new Date().toISOString().slice(0, 10)} // heute
          required
        />

        <button type="submit" aria-label="Save transaction" title="Save">
          Save
        </button>
      </FormContainer>
    </>
  );
}

const FormContainer = styled.form`
  ${fixedCenteredStyles}; // über overlay + zentriert

  width: 250px;
  background-color: var(--color-background-page);
  border-radius: var(--radius-lg);
  padding: 1.55rem 1.75rem 2rem 1.75rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  display: flex; // content vertikal
  flex-direction: column; // untereinander

  label {
    font-size: 1.15rem;
    font-weight: bold;
    color: var(--color-text-primary);
    margin: 0 0 0.55rem 0.25rem; // Abstand input
  }

  select,
  input[type="text"],
  input[type="number"],
  input[type="date"] {
    height: 1.75rem;
    border: 0.07rem solid var(--color-button-bg);
    border-radius: var(--radius-md);
    padding-left: 5px;

    // Firefox: wenn Feld angeklickt, kein blauer Rahmen:
    accent-color: var(--color-button-bg);
  }

  select {
    width: 155px;
  }

  input[type="text"],
  input[type="number"] {
    margin-bottom: 0.8rem; // Abstand zw. Blöcken
  }

  input[type="date"] {
    cursor: text;
  }

  button[type="submit"] {
    align-self: center;
    margin-top: 1.75rem; // Abstand zum letzten input
    padding-bottom: 2px; // text vertikal zentrierter

    width: 80px;
    height: 35px;
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--color-button-bg);
    color: var(--color-button-text);
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--color-text-primary);
    }
  }
`;

const FormHeader = styled.div`
  display: flex; // h2 + CloseButton nebeneinander
  margin-bottom: 1rem; // Abstand zum ersten label

  h2 {
    flex: 1; // nimmt restlichen Platz in FormHeader
    text-align: center;
    font-size: 1.5rem;
    line-height: 1;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

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

const CategoryGroup = styled.div`
  display: flex; // select + ColorTag nebeneinander
  align-items: center; // ColorTag vertikal zentriert
  gap: 0.75rem; // Abstand select + ColorTag
  margin-bottom: 0.8rem; // Abstand Block Description

  select {
    flex: 1; // nimmt restlichen Platz in CategoryGroup
    cursor: pointer;
  }
`;

const ColorTag = styled.button`
  width: 25px;
  height: 25px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  background-color: ${({ $categoryType }) =>
    $categoryType === "Expense"
      ? "var(--color-expense)"
      : "var(--color-income)"};

  &:hover {
    transform: scale(1.07);
  }
`;
