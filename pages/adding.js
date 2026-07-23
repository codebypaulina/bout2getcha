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
      <PageShell title={pageTitle} centerContent>
        <ButtonContainer>
          <AddButton type="button" onClick={() => setActiveForm("transaction")}>
            Transaction
          </AddButton>

          <AddButton type="button" onClick={() => setActiveForm("category")}>
            Category
          </AddButton>
        </ButtonContainer>
      </PageShell>

      {activeForm === "transaction" && (
        <FormAddTransaction initialCategoryId="" closeForm={closeForm} />
      )}

      {activeForm === "category" && <FormAddCategory closeForm={closeForm} />}
    </>
  );
}

const ButtonContainer = styled.div`
  display: flex; // nebeneinander
  flex-direction: column; // untereinander
  align-items: center; // horizontal
  gap: 1rem;
`;

const AddButton = styled.button`
  width: 108px;
  height: 40px;
  border: none;
  border-radius: var(--radius-md);
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
`;
