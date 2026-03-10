import useSWR from "swr";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import CloseIcon from "@/public/icons/close.svg";

export default function FormAddTransaction({ onCancel, onSuccess }) {
  const router = useRouter();
  const { category: queryCategoryId } = router.query;

  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  const { data: categories, error } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  ); // data-fetch

  // *** [ states ]
  const [currentCategoryId, setCurrentCategoryId] = useState(""); // ID für dropdown
  const [typeFilter, setTypeFilter] = useState("Expense"); // type für dropdown-filter + ColorTag
  const [lastSelectedCategoryIdByType, setLastSelectedCategoryIdByType] =
    useState({
      Expense: "",
      Income: "",
    }); // zuletzt ausgewählte ID je type für dropdown-memory

  // *** [ sync states ]
  // *** [1. aktuelle category]: aus url (ID preselected aus CategoryDetailsPage)
  useEffect(() => {
    if (!router.isReady) return;
    if (!queryCategoryId) return;
    setCurrentCategoryId(queryCategoryId);
  }, [router.isReady, queryCategoryId]);

  // *** [2. type-filter & memory]: aus aktueller category (für preselection)
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

  // *** [ guards ]
  if (error) return <h3>Failed to load data</h3>;
  if (!categories) return <h3>Loading ...</h3>;

  // *** [ abgeleitete Daten ] *************************************************************
  // *** [categories sortieren]: A-Z (für dropdown)
  // undefined: user-locale // sensitivity: case- & accent-insensitive
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // *** [categories filtern]: nach type (für dropdown)
  const filteredCategories = sortedCategories.filter(
    (category) => category.type === typeFilter
  );

  // *** [ category-select ] ***************************************************************
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
        console.log("ADDING SUCCESSFUL! (transaction)");
        onSuccess(); // von AddingPage (selection view / CategoryDetailsPage)
      } else {
        throw new Error(
          `Failed to add new transaction (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error adding new transaction: ", error);
    }
  }

  return (
    <PageWrapper>
      <FormContainer onSubmit={handleSubmit}>
        <FormHeader>
          <h1>Add</h1>

          <CloseButton
            type="button"
            aria-label="Close form"
            title="Close"
            onClick={onCancel} // von AddingPage (selection view / CategoryDetailsPage)
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
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  min-height: 100vh; // wrapper mind. wie viewport
  display: flex; // wegen Zentrierung von form
  align-items: center; // form vertikal zentriert
  justify-content: center; // form horizontal zentriert
`;

const FormContainer = styled.form`
  max-width: 250px;
  background-color: var(--background-color);
  padding: 1.5rem 2rem 2rem 2rem;
  border-radius: 1.5rem; // abgerundete Ecken

  display: flex; // content vertikal
  flex-direction: column; // content untereinander
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  label {
    font-weight: bold;
    margin-bottom: 0.5rem; // Abstand zw. label & jeweiligem input
  }

  select,
  input[type="text"],
  input[type="number"],
  input[type="date"] {
    border-radius: 0.5rem; // abgerundete Ecken
    border: 0.07rem solid var(--button-hover-color);
    height: 1.5rem;

    // Firefox: wenn Feld angeklickt, kein blauer Rahmen:
    accent-color: var(--button-hover-color);
  }

  input[type="text"],
  input[type="number"] {
    margin-bottom: 0.8rem; // Abstand zw. Blöcken
  }

  input[type="date"] {
    cursor: text;
  }

  button[type="submit"] {
    margin-top: 2rem; // Abstand zum letzten input
    align-self: center;

    border: none;
    border-radius: 20px;
    width: 70px;
    height: 30px;
    cursor: pointer;
    font-weight: bold;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.07);
      color: var(--primary-text-color);
    }
  }
`;

const FormHeader = styled.div`
  display: flex; // h1 + CloseButton nebeneinander
  align-items: center; // h1 + CloseButton vetikal zentriert
  margin-bottom: 1rem; // Abstand zum ersten label

  h1 {
    font-size: 1.5rem;
    flex: 1; // nimmt restlichen Platz in FormHeader
    text-align: center;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;

  svg {
    width: 22px;
    height: 22px;
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
  width: 20px;
  height: 20px;
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
