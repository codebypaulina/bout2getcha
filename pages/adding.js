"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import FormAddTransaction from "@/components/FormAddTransaction";
import FormAddCategory from "@/components/FormAddCategory";

export default function AddingPage() {
  const router = useRouter();

  const [selection, setSelection] = useState(null); // selection view / FormAddTransaction / FormAddCategory
  const resetSelection = () => setSelection(null); // für closeForm (selection view)

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
    <>
      <TopBar />
      <ContentContainer>
        <h1>Add</h1>

        <button type="button" onClick={() => setSelection("transaction")}>
          Transaction
        </button>

        <p>or</p>

        <button type="button" onClick={() => setSelection("category")}>
          Category
        </button>
      </ContentContainer>
      <Navbar />
    </>
  );
}

const ContentContainer = styled.div`
  height: calc(100vh - 50px - 57px); // wie viewport (TopBar 50px / Navbar 57px)
  display: flex; // content nebeneinander
  flex-direction: column; // untereinander
  align-items: center; // horizontal
  justify-content: center; // vertikal

  h1 {
    margin-bottom: 2rem;
  }

  p {
    font-size: 1.85rem;
    font-weight: bold;
    color: var(--primary-text-color);
    margin: 0.2rem 0 0.7rem 0;
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
      transform: scale(1.07);
      color: var(--primary-text-color);
    }
  }
`;
