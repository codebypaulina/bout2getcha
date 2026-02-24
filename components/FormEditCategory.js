import useSWR, { mutate } from "swr";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import styled from "styled-components";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CloseIcon from "@/public/icons/close.svg";

export default function FormEditCategory() {
  const router = useRouter();
  const { id, from } = router.query; // from für back navigation nach category-delete

  // *** [ fetch ]
  const { data: category, error } = useSWR(id ? `/api/categories/${id}` : null);

  // *** [ states ]
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // für DeleteConfirmModal
  const [categoryType, setCategoryType] = useState("");

  // *** [ sync type-state ]
  useEffect(() => {
    if (!category?.type) return;
    setCategoryType((prev) => prev || category.type);
  }, [category?.type]);

  // *** [ guards ]
  if (error) return <h3>Failed to load category</h3>;
  if (!category) return <h3>Loading ...</h3>;

  // *** [ type-button ] *******************************************************************
  function toggleCategoryType() {
    setCategoryType((prev) => (prev === "Expense" ? "Income" : "Expense"));
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
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update category (status: ${response.status})`
        );
      }

      // SWR-detail-cache: revalidieren, um category.transactionCount nicht zu überschreiben
      // -> values geupdated (CategoryDetailsPage + reopened form)
      mutate(`/api/categories/${id}`);
      console.log("UPDATING SUCCESSFUL! (category)");
      router.back();
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
    // transactionCount aus API: Fall A (leere ca) / Fall B (ca + zugehörige ta)
    const hasTransactions = category.transactionCount > 0;

    try {
      // wählt endpoint-URL abhängig davon, ob cascade-delete nötig
      const url = hasTransactions
        ? `/api/categories/${id}?cascade=true`
        : `/api/categories/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("DELETING SUCCESSFUL! (category)");
        setIsConfirmOpen(false); //  Modal schließen
        router.push(from || "/categories"); // zurück zu from (CategoryDetailsPage), sonst zu CategoriesPage
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

      <DeleteConfirmModal
        open={isConfirmOpen} // state
        message={
          category.transactionCount > 0 ? (
            <p>
              Are you sure you want to delete this category & all included
              transactions?
            </p>
          ) : (
            <p>Are you sure you want to delete this category?</p>
          )
        }
        onConfirm={handleConfirmDelete} // category löschen
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

  display: flex; // content vertikal
  flex-direction: column; // content untereinander
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  label {
    font-weight: bold;
    margin-bottom: 0.5rem; // Abstand zw. label & jeweiligem input
  }

  input {
    border-radius: 0.5rem; // abgerundete Ecken
    border: 0.07rem solid var(--button-hover-color);
    height: 1.5rem;
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

const NameTypeRow = styled.div`
  display: flex; // name-input + ColorTag nebeneinander
  align-items: center; // ColorTag vertikal zentriert
  gap: 0.75rem; // Abstand name-input + ColorTag
  margin-bottom: 0.8rem; // Abstand Block Color

  input {
    max-width: 126px; // sonst breiter als form

    // Firefox: wenn Feld angeklickt, kein blauer Rahmen:
    accent-color: var(--button-hover-color);
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
  gap: 0.8rem; // Abstand zw. buttons

  button {
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
