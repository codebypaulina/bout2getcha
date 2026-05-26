import useSWR from "swr";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";

import CloseIcon from "@/public/icons/close.svg";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";

export default function FormEditCategory({
  categoryId,
  onCatUpdated,
  onCatDeleted,
  closeForm,
}) {
  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // für data-fetch, SWR cache-key

  // *** [ DATA-FETCH ]
  const { data: category, error } = useSWR(
    categoryId && userId ? `/api/categories/${categoryId}?u=${userId}` : null
  );

  // *** [ STATES ]
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // für DeleteConfirmModal
  const [categoryType, setCategoryType] = useState("");

  // *** [ SYNC ] **************************************************************************
  // *** [ type-state ]
  useEffect(() => {
    if (!category?.type) return;
    setCategoryType((prev) => prev || category.type);
  }, [category?.type]);

  // *** [ ESC-listener ]
  useEscapeClose(!isConfirmOpen, closeForm);

  // *** [ GUARDS ] ************************************************************************
  if (error) return <h3>Failed to load category</h3>;
  if (!category) return <h3>Loading ...</h3>;

  // *** [ HANDLERS ] **********************************************************************
  // *** [ type-button ]
  function toggleCategoryType() {
    setCategoryType((prev) => (prev === "Expense" ? "Income" : "Expense"));
  }

  // *** [ save-button ]
  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await onCatUpdated?.(); // in CategoryDetailsPage: SWR-cache aktualisieren (category- + transaction-list)
        closeForm();
        console.log("UPDATING SUCCESSFUL! (category)");
      } else {
        throw new Error(
          `Failed to update category (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error updating category: ", error);
    }
  }

  // *** [ delete ]
  // *** [1. button]: DeleteConfirmModal öffnen
  function handleDelete() {
    setIsConfirmOpen(true);
  }

  // *** [2. confirm-button]: category löschen
  async function handleConfirmDelete() {
    const hasTransactions = category.transactionCount > 0; // Anzahl transactions aus API

    try {
      // cascade delete
      const url = hasTransactions
        ? `/api/categories/${categoryId}?cascade=true` // erst enthaltene transaction(s)
        : `/api/categories/${categoryId}`; // nur category (leer)

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsConfirmOpen(false); // Modal schließen
        await onCatDeleted?.(); // in CategoryDetailsPage: SWR-cache aktualisieren (category- + transaction-list) + back nav
        console.log("DELETING SUCCESSFUL! (category)");
      } else {
        throw new Error(
          `Failed to delete category (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error deleting category: ", error);
      setIsConfirmOpen(false); // Modal schließen, damit user nicht festhängt
    }
  }

  return (
    <>
      <Overlay onClick={closeForm} />

      <FormContainer onSubmit={handleSubmit}>
        <FormHeader>
          <h2>Category</h2>

          <CloseButton
            type="button"
            aria-label="Close form"
            title="Close"
            onClick={closeForm} // CategoryDetailsPage
          >
            <CloseIcon />
          </CloseButton>
        </FormHeader>

        <label htmlFor="name">Name</label>
        <NameTypeRow>
          <input
            type="text"
            id="name"
            name="name"
            aria-label="Update category name"
            title="Name"
            defaultValue={category.name}
            required
          />

          <input type="hidden" name="type" value={categoryType} />
          <ColorTag
            type="button"
            aria-label="Switch category type"
            title={`${categoryType} (click to switch)`}
            onClick={toggleCategoryType}
            $categoryType={categoryType}
          />
        </NameTypeRow>

        <label htmlFor="color">Color</label>
        <input
          type="color"
          id="color"
          name="color"
          aria-label="Update category color"
          title="Color"
          defaultValue={category.color}
          required
        />

        <ButtonContainer>
          <button
            type="button"
            aria-label="Delete category"
            title="Delete"
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
            category.transactionCount > 0 ? (
              <p>
                Are you sure you want to delete this category & all included
                transactions?
              </p>
            ) : (
              <p>Are you sure you want to delete this category?</p>
            )
          }
          confirmDelete={handleConfirmDelete} // category löschen
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

  input {
    height: 1.75rem;
    border: 0.07rem solid var(--button-hover-color);
    border-radius: 20px; // abgerundete Ecken
  }

  input[type="text"] {
    padding-left: 5px;
  }

  input[type="color"] {
    cursor: pointer;
    width: 100%; // so breit wie container
  }
  /******************** Chrome **********************/
  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type="color"]::-webkit-color-swatch {
    border: none;
  }
  /**************************************************/
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

const NameTypeRow = styled.div`
  display: flex; // name-input + ColorTag nebeneinander
  align-items: center; // ColorTag vertikal zentriert
  gap: 0.75rem; // Abstand name-input + ColorTag
  margin-bottom: 0.8rem; // Abstand Block Color

  input {
    width: 155px; // sonst breiter als form

    // Firefox: wenn Feld angeklickt, kein blauer Rahmen:
    accent-color: var(--button-hover-color);
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
  gap: 1.5rem; // Abstand zw. buttons

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
