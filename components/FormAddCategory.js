import { useRouter } from "next/router";
import { useState } from "react";
import styled from "styled-components";

import CloseIcon from "@/public/icons/close.svg";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";

export default function FormAddCategory({ closeForm }) {
  const router = useRouter();

  // *** [ type-state ]
  const [categoryType, setCategoryType] = useState("Expense");

  // *** [ ESC-listener ]
  useEscapeClose(true, closeForm);

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
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await router.push(`/categories?type=${categoryType}`); // zu CategoriesPage mit type-filter = type neuer category
        console.log("ADDING SUCCESSFUL! (category)");
      } else {
        throw new Error(
          `Failed to add new category (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Error adding new category: ", error);
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
            onClick={closeForm} // AddingPage selection view
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
            aria-label="Enter category name"
            title="Name"
            placeholder=" ..."
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
          aria-label="Select category color"
          title="Color"
          defaultValue="#ffffff"
          required
        />

        <button type="submit" aria-label="Save category" title="Save">
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

const NameTypeRow = styled.div`
  display: flex; // name-input + ColorTag nebeneinander
  align-items: center; // ColorTag vertikal zentriert
  gap: 0.75rem; // Abstand name-input + ColorTag
  margin-bottom: 0.8rem; // Abstand Block Color

  input {
    width: 155px; // sonst viel zu kurz

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
