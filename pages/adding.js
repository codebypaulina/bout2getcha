"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";

import PageShell from "@/components/layout/PageShell";
import FormAddTransaction from "@/components/FormAddTransaction";
import FormAddCategory from "@/components/FormAddCategory";

export default function AddingPage() {
  const pageTitle = "Add";

  const router = useRouter();
  const [selection, setSelection] = useState(null); // selection view / FormAddTransaction / FormAddCategory
  const resetSelection = () => setSelection(null); // für closeForm (selection view)

  // *** [ SELECTION ] *********************************************************************
  // *** [ preselection: transaction ]: wenn category-query (von CategoryDetailsPage)
  useEffect(() => {
    if (!router.isReady) return;
    if (!router.query.category) return;
    setSelection("transaction"); // FormAddTransaction, statt selection view
  }, [router.isReady, router.query.category]);

  // *** [ close FormAddTransaction ]
  function closeForm() {
    if (router.query.category) {
      router.back(); // wenn category-query, zurück zu CategoryDetailsPage
    } else {
      resetSelection(); // sonst zurück zu selection view
    }
  }

  // *** [ selection: transaction ]
  if (selection === "transaction") {
    return <FormAddTransaction onCancel={closeForm} onSuccess={closeForm} />;
  }

  // *** [ selection: category ]
  if (selection === "category") {
    return <FormAddCategory onCancel={resetSelection} />; // zurück zu selection view
  }

  // *** [ selection view ]
  return (
    <PageShell title={pageTitle} showPageTitle={false}>
      <ContentContainer>
        <h1>{pageTitle}</h1>

        <button type="button" onClick={() => setSelection("transaction")}>
          Transaction
        </button>

        <button type="button" onClick={() => setSelection("category")}>
          Category
        </button>
      </ContentContainer>
    </PageShell>
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
    border-radius: 20px;
    width: 108px;
    height: 40px;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.03);
      color: var(--primary-text-color);
    }
  }
`;
