import useSWR, { mutate } from "swr";
import { useRouter } from "next/router";
import { useEffect, useState } from "react"; // effect + state: category-Änderung -> type-Änderung // state: ConfirmModal open/!open
import styled from "styled-components";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CloseIcon from "@/public/icons/close.svg";

export default function FormEditTransaction() {
  const router = useRouter();
  const { id } = router.query; // transaction-ID aus URL

  // *** [ fetch ]
  const { data: transaction, error: errorTransaction } = useSWR(
    id ? `/api/transactions/${id}` : null
  );
  const { data: categories, error: errorCategories } =
    useSWR("/api/categories");

  // *** [ states ]
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // für DeleteConfirmModal
  const [currentCategoryId, setCurrentCategoryId] = useState(""); // category-state: ID für dropdown
  const [typeFilter, setTypeFilter] = useState(""); // category-state: type für dropdown-filter + ColorTag
  const [lastSelectedCategoryIdByType, setLastSelectedCategoryIdByType] =
    useState({
      Expense: "",
      Income: "",
    }); // category-state: zuletzt ausgewählte ID je type für dropdown-memory

  // *** [ sync category-states ]
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

  // *** [ guards ]
  if (errorTransaction || errorCategories) return <h3>Failed to load data</h3>;
  if (!transaction || !categories) return <h3>Loading ...</h3>;

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

  // *** [ X-button ]
  function handleCancel() {
    router.back();
  }

  // *** [ save-button ]
  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update transaction (status: ${response.status})`
        );
      }

      const updated = await response.json();
      mutate(`/api/transactions/${id}`, updated, false); // SWR-detail-cache: mit updated values überschreiben (reopened form)
      console.log("UPDATING SUCCESSFUL! (transaction)");
      router.back();
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
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("DELETING SUCCESSFUL! (transaction)");
        setIsConfirmOpen(false); //  Modal schließen
        router.back(); // zurück zur vorherigen page
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
    <PageWrapper>
      <FormContainer onSubmit={handleSubmit}>
        <FormHeader>
          <h1>Edit</h1>

          <CloseButton
            type="button"
            aria-label="Close form"
            title="Close"
            onClick={handleCancel}
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
          min="0.01"
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

      <DeleteConfirmModal
        open={isConfirmOpen} // state
        message={<p>Are you sure you want to delete this transaction?</p>}
        onConfirm={handleConfirmDelete} // transaction löschen
        onCancel={() => setIsConfirmOpen(false)} // schließen (X / ESC / Overlay)
      />
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

  display: flex;
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

const ButtonContainer = styled.div`
  margin-top: 2rem; // Abstand zum letzten input
  display: flex; // wegen Zentrierung
  justify-content: center; // buttons zentriert
  gap: 0.8rem;

  button {
    border: none;
    border-radius: 20px;
    min-width: 70px;
    min-height: 30px;
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
