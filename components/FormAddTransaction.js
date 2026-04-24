import useSWR from "swr";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";

import CloseIcon from "@/public/icons/close.svg";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";

export default function FormAddTransaction({
  initialCategoryId = "", // CategoryDetailsPage
  onTxAdded, // CategoryDetailsPage
  closeForm, // AddingPage + CategoryDetailsPage
}) {
  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ DATA-FETCH ]
  const { data: categories, error } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );

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
  if (error) return <h3>Failed to load data</h3>;
  if (!categories) return <h3>Loading ...</h3>;

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
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await onTxAdded?.(); // in CategoryDetailsPage: SWR-cache aktualisieren (transaction-list)
        closeForm();
        console.log("ADDING SUCCESSFUL! (transaction)");
      } else {
        throw new Error(
          `Failed to add new transaction (status: ${response.status})`
        );
      }
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
          min="0.01"
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

  button[type="submit"] {
    align-self: center;
    margin-top: 1.75rem; // Abstand zum letzten input
    padding-bottom: 2px; // text vertikal zentrierter

    width: 80px;
    height: 35px;
    border: none;
    border-radius: 30px;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--primary-text-color);
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
