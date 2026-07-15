"use client";
import { useState } from "react";
import styled from "styled-components";

import PageShell from "@/components/layout/PageShell";
import FormAddTransaction from "@/components/FormAddTransaction";
import FormAddCategory from "@/components/FormAddCategory";

export default function AddingPage() {
  const pageTitle = "Add";

  const [activeForm, setActiveForm] = useState(null);
  const closeForm = () => setActiveForm(null);

  return (
    <>
      <PageShell title={pageTitle} showPageTitle={false}>
        <ContentContainer>
          <h1>{pageTitle}</h1>

          <button type="button" onClick={() => setActiveForm("transaction")}>
            Transaction
          </button>

          <button type="button" onClick={() => setActiveForm("category")}>
            Category
          </button>
        </ContentContainer>
      </PageShell>

      {activeForm === "transaction" && (
        <FormAddTransaction initialCategoryId="" closeForm={closeForm} />
      )}

      {activeForm === "category" && <FormAddCategory closeForm={closeForm} />}
    </>
  );
}

const ContentContainer = styled.div`
  height: 100%;
  display: flex; // content nebeneinander
  flex-direction: column; // untereinander
  align-items: center; // horizontal
  justify-content: center; // vertikal
  gap: 1rem;

  h1 {
    margin-bottom: 1rem;
  }

  button {
    border: none;
    border-radius: var(--radius-md);
    width: 108px;
    height: 40px;
    background-color: var(--color-button-bg);
    color: var(--color-button-text);
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.03);
      color: var(--color-text-primary);
    }
  }
`;
