import useSWR from "swr";
import { useEffect, useState } from "react"; // effect + state: category-Änderung -> type-Änderung // state: ConfirmModal open/!open
import { useSession } from "next-auth/react";
import styled from "styled-components";

import CloseIcon from "@/public/icons/close.svg";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";
import { TX_DESCRIPTION_MAX_LENGTH, TX_AMOUNT_MIN } from "@/utils/constants";

export default function FormEditTransaction({
  transactionId,
  onTxUpdated,
  onTxDeleted,
  closeForm,
}) {
  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ DATA-FETCH ]
  const {
    data: transaction,
    error: errorTransaction,
    mutate: mutateTransaction,
  } = useSWR(
    transactionId && userId
      ? `/api/transactions/${transactionId}?u=${userId}`
      : null
  );
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );

  // *** [ STATES ]
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(""); // category-state: ID für dropdown
  const [typeFilter, setTypeFilter] = useState(""); // category-state: type für dropdown-filter + ColorTag
  const [lastSelectedCategoryIdByType, setLastSelectedCategoryIdByType] =
    useState({
      Expense: "",
      Income: "",
    }); // category-state: zuletzt ausgewählte ID je type für dropdown-memory

  // *** [ SYNC ] **************************************************************************
  // *** [ category-states ]
  useEffect(() => {
    if (!transaction?.category) return;

    setCurrentCategoryId(transaction.category._id);
    setTypeFilter(transaction.category.type);
    setLastSelectedCategoryIdByType({
      Expense:
        transaction.category.type === "Expense" ? transaction.category._id : "",
      Income:
        transaction.category.type === "Income" ? transaction.category._id : "",
    });
  }, [transaction]);

  // *** [ ESC-listener ]
  useEscapeClose(!isConfirmOpen, closeForm);

  // *** [ GUARDS ] ************************************************************************
  if (errorTransaction || errorCategories) return <h3>Failed to load data</h3>;
  if (!transaction || !categories) return <h3>Loading ...</h3>;

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
    const selectedCategory = categories.find(
      (category) => category._id === selectedId
    );

    setCurrentCategoryId(selectedId);
    setTypeFilter(selectedCategory.type);
    setLastSelectedCategoryIdByType((prev) => ({
      ...prev,
      [selectedCategory.type]: selectedId,
    }));
  }

  // *** [ type-filter-button ]
  function toggleTypeFilter() {
    const toggledType = typeFilter === "Expense" ? "Income" : "Expense";

    setTypeFilter(toggledType);
    setCurrentCategoryId(lastSelectedCategoryIdByType[toggledType]);
  }

  // *** [ save-button ]
  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        await mutateTransaction(updatedTransaction, { revalidate: false }); // in form: SWR-detail-cache von tx aktualisieren (reopened)
        await onTxUpdated?.(); // in HomePage + CategoryDetailsPage: SWR-cache aktualisieren (transaction-list)
        closeForm();
        console.log("UPDATING SUCCESSFUL! (transaction)");
      } else {
        throw new Error(
          `Failed to update transaction (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error updating transaction: ", error);
    }
  }

  // *** [ delete ]
  // *** [1. button]: DeleteConfirmModal öffnen
  function handleDelete() {
    setIsConfirmOpen(true);
  }

  // *** [2. confirm-button]: transaction löschen
  async function handleConfirmDelete() {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsConfirmOpen(false); // Modal schließen
        await onTxDeleted?.(); // in HomePage + CategoryDetailsPage: SWR-cache aktualisieren (transaction-list)
        closeForm();
        console.log("DELETING SUCCESSFUL! (transaction)");
      } else {
        throw new Error(
          `Failed to delete transaction (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      setIsConfirmOpen(false); // Modal schließen, damit user nicht festhängt
    }
  }

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
            onClick={closeForm} // TransactionsPage / CategoryDetailsPage
          >
            <CloseIcon />
          </CloseButton>
        </FormHeader>

        <label htmlFor="category">Category</label>
        <CategoryGroup>
          <select
            id="category"
            name="category"
            aria-label="Update category"
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
          aria-label="Update description"
          title="Description"
          defaultValue={transaction.description}
          maxLength={TX_DESCRIPTION_MAX_LENGTH}
          required
        />

        <label htmlFor="amount">Amount</label>
        <input
          type="number"
          id="amount"
          name="amount"
          aria-label="Update amount"
          title="Amount"
          defaultValue={transaction.amount}
          inputMode="decimal"
          min={TX_AMOUNT_MIN}
          step="any" // Kommazahlen (0.01 geht nicht)
          required
        />

        <label htmlFor="date">Date</label>
        <input
          type="date"
          id="date"
          name="date"
          aria-label="Update date"
          title="Date"
          defaultValue={transaction.date.slice(0, 10)} // nur YYYY-MM-DD
          required
        />

        <ButtonContainer>
          <button
            type="button"
            aria-label="Delete transaction"
            title="Delete transaction"
            onClick={handleDelete}
          >
            Delete
          </button>

          <button type="submit" aria-label="Save changes" title="Save">
            Save
          </button>
        </ButtonContainer>
      </FormContainer>

      {isConfirmOpen && (
        <DeleteConfirmModal
          confirmationMessage={
            <p>Are you sure you want to delete this transaction?</p>
          }
          confirmDelete={handleConfirmDelete} // transaction löschen
          closeModal={() => setIsConfirmOpen(false)} // X / ESC / Overlay
        />
      )}
    </>
  );
}

const FormContainer = styled.form`
  ${fixedCenteredStyles}; // über overlay + zentriert

  width: 250px;
  background-color: var(--background-color);
  border-radius: 30px; // abgerundete Ecken
  padding: 1.55rem 1.75rem 2rem 1.75rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  display: flex; // content vertikal
  flex-direction: column; // untereinander

  label {
    font-size: 1.15rem;
    font-weight: bold;
    color: var(--primary-text-color);
    margin: 0 0 0.55rem 0.25rem; // Abstand input
  }

  select,
  input[type="text"],
  input[type="number"],
  input[type="date"] {
    height: 1.75rem;
    border: 0.07rem solid var(--button-hover-color);
    border-radius: 20px; // abgerundete Ecken
    padding-left: 5px;

    // Firefox: wenn Feld angeklickt, kein blauer Rahmen:
    accent-color: var(--button-hover-color);
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
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  background-color: ${({ $categoryType }) =>
    $categoryType === "Expense"
      ? "var(--expense-color)"
      : "var(--income-color)"};

  &:hover {
    transform: scale(1.07);
  }
`;

const ButtonContainer = styled.div`
  margin-top: 2rem; // Abstand zum letzten input
  display: flex; // wegen Zentrierung
  justify-content: center; // buttons zentriert
  gap: 1.5rem;

  button {
    width: 80px;
    height: 35px;
    border: none;
    border-radius: 30px;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--primary-text-color);
    }
  }
`;
