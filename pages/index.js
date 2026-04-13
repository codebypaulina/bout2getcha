import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import styled from "styled-components";

import Navbar from "@/components/Navbar";
import ChartCard from "@/components/ChartCard";
import EyeIcon from "@/public/icons/eye.svg";
import EyeSlashIcon from "@/public/icons/eye-slash.svg";
import ChartIcon from "@/public/icons/chart.svg";
import { FilterBar, ChartButton } from "@/components/ui/filterBar.styles";

export default function HomePage() {
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [isChartOpen, setIsChartOpen] = useState(false);

  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // user-ID (für local + session storage / data-fetch)

  // *** [ data-fetch ]
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );

  // *** [ LOCAL STORAGE ] hidden categories ***********************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:hiddenCategories`;
    const storedHiddenCategories = localStorage.getItem(key);
    if (!storedHiddenCategories) return;

    try {
      const parsedHiddenCategories = JSON.parse(storedHiddenCategories);
      if (Array.isArray(parsedHiddenCategories)) {
        setHiddenCategories(parsedHiddenCategories);
      } // state setzen, nur wenn array okay
    } catch {
      // ignorieren -> default
    }
  }, [userId]);

  // *** [speichern]: nur wenn array nicht leer
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:hiddenCategories`;

    if (hiddenCategories.length !== 0) {
      localStorage.setItem(key, JSON.stringify(hiddenCategories));
    } else {
      localStorage.removeItem(key);
    }
  }, [userId, hiddenCategories]);

  // *** [ SESSION STORAGE ] chart-state ***************************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:home:isChartOpen`;
    const storedChartState = sessionStorage.getItem(key);
    if (storedChartState) setIsChartOpen(true);
  }, [userId]);

  // *** [speichern]: bei Änderung (= open)
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:home:isChartOpen`;

    if (isChartOpen) {
      sessionStorage.setItem(key, "true");
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, isChartOpen]);

  // *** [ guards ] ************************************************************************
  if (errorCategories || errorTransactions) return <h3>Failed to load data</h3>;
  if (!categories || !transactions) return <h3>Loading ...</h3>;

  // *** [ ABGELEITETE DATEN ] *************************************************************
  // *** [ 1. transactions ]: nur aus aktuellem Monat **************************************
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);

    return (
      transactionDate.getFullYear() === currentYear &&
      transactionDate.getMonth() === currentMonth
    );
  });

  // *** [ 2. categories ] *****************************************************************
  // *** [mit totals]
  const categoriesWithTotals = categories.map((category) => {
    const totalAmount = currentMonthTransactions
      .filter((transaction) => {
        const categoryId =
          typeof transaction.category === "string"
            ? transaction.category
            : transaction.category?._id;

        return categoryId === category._id;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return { ...category, totalAmount };
  });

  // *** [filtern]: alle expense + nicht leer
  const expenseCategories = categoriesWithTotals.filter(
    (category) => category.type === "Expense" && category.totalAmount > 0
  );

  // *** [sortieren]: visibility
  const sortedCategories = [...expenseCategories].sort((a, b) => {
    const isHiddenA = hiddenCategories.includes(a._id);
    const isHiddenB = hiddenCategories.includes(b._id);

    if (isHiddenA === isHiddenB) return b.totalAmount - a.totalAmount; // visibility gleich: total amount absteigend
    return isHiddenA - isHiddenB; // visibility ungleich: hidden nach unten
  });

  // *** [filtern]: nur visible expense (für chart + total expense)
  const visibleCategories = sortedCategories.filter(
    (category) => !hiddenCategories.includes(category._id)
  );

  // *** [ 2. ID-Reihenfolge category-list ] ***********************************************
  // *** [snapshot]
  const navKey = `u:${userId}:catNav:/`; // sessionStorage-key
  const navIds = sortedCategories.map((category) => category._id); // ID-array

  // *** [snapshot]: in sessionStorage speichern (für < > nav in CategoryDetailsPage)
  function storeCatNavSnapshot() {
    sessionStorage.setItem(navKey, JSON.stringify(navIds));
  }

  // *** [ 3. chart ] **********************************************************************
  // *** [chart-data]
  const chartData = visibleCategories.map((category) => ({
    id: category._id,
    label: category.name,
    value: category.totalAmount,
    color: category.color,
  }));

  // *** [total expense box]
  // aktueller Monat
  const currentMonthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(now);

  // Summe angezeigter categories
  const totalExpense = visibleCategories.reduce(
    (sum, category) => sum + category.totalAmount,
    0
  ); // amount

  const totalExpenseLabel = totalExpense.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }); // label

  // *** [tooltip %]
  function getChartPercentage(value) {
    if (!totalExpense) return 0;
    return Math.round((value / totalExpense) * 100);
  }

  // ***************************************************************************************

  function toggleChart() {
    setIsChartOpen((prevState) => !prevState);
  }

  function toggleVisibility(categoryId) {
    setHiddenCategories(
      (prevState) =>
        prevState.includes(categoryId)
          ? prevState.filter((id) => id !== categoryId) // in state -> neues array: ohne diese
          : [...prevState, categoryId] // nicht in state -> neues array: bestehende list + diese
    );
  }

  return (
    <>
      <ContentContainer>
        <h1>Expenses</h1>

        <FilterBar>
          <HomeFilterBarContent>
            <ChartButton
              type="button"
              aria-label="Toggle chart"
              className={isChartOpen && chartData.length > 0 ? "active" : ""}
              disabled={chartData.length === 0}
              onClick={toggleChart}
            >
              <ChartIcon />
            </ChartButton>

            <TotalExpenseBox>
              <span className="month">{currentMonthLabel}</span>
              <span className="amount">{totalExpenseLabel} €</span>
            </TotalExpenseBox>
          </HomeFilterBarContent>
        </FilterBar>

        {isChartOpen && chartData.length > 0 && (
          <ChartCard
            data={chartData}
            getChartPercentage={getChartPercentage}
            hideSummary
          />
        )}

        <StyledList>
          {sortedCategories.map((category) => (
            <ListItem
              key={category._id}
              $isHidden={hiddenCategories.includes(category._id)}
            >
              <StyledLink
                href={`/categories/${category._id}?from=/&navKey=${encodeURIComponent(navKey)}`} // "?from/": Herkunft = HomePage (nach category-delete) // "&navKey=...": ID-Reihenfolge (< > nav)
                onClick={storeCatNavSnapshot}
                $isHidden={hiddenCategories.includes(category._id)}
              >
                <ColorTag
                  $categoryColor={category.color}
                  $isHidden={hiddenCategories.includes(category._id)}
                />

                <p>{category.name}</p>
                <p className="amount">
                  {category.totalAmount.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
              </StyledLink>

              {hiddenCategories.includes(category._id) ? (
                <IconWrapperEye onClick={() => toggleVisibility(category._id)}>
                  <EyeSlashIcon />
                </IconWrapperEye>
              ) : (
                <IconWrapperEye onClick={() => toggleVisibility(category._id)}>
                  <EyeIcon />
                </IconWrapperEye>
              )}
            </ListItem>
          ))}
        </StyledList>
      </ContentContainer>

      <Navbar />
    </>
  );
}

const ContentContainer = styled.div`
  padding: 20px 20px 83px 20px; // Nav 75px // Abstand Bildschirmrand
  max-width: 350px; // Breite von list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;

const HomeFilterBarContent = styled.div`
  position: relative; // neuer Bezugspunkt für TotalExpenseBox
  width: 100%; // wie FilterBar (für Zentrierung von TotalExpenseBox)
  display: flex; // ChartButton + TotalExpenseBox nebeneinander
  align-items: center; // TotalExpenseBox vertikal zentriert
`;

const TotalExpenseBox = styled.div`
  position: absolute; // rel zu HomeFilterBarContent (ChartButton bleibt links)
  left: 50%; // Zentrierung
  transform: translateX(-50%); // Zentrierung

  display: flex;
  flex-direction: column; // untereinander
  align-items: center; // horizontal zentriert
  color: var(--secondary-text-color);

  .month {
    font-size: 0.8rem;
  }

  .amount {
    font-size: 1rem;
    font-weight: bold;
  }
`;

const StyledList = styled.ul`
  list-style-type: none;
`;

const ListItem = styled.li`
  display: flex; // link + icon nebeneinander
  justify-content: center; // horizontal zentriert
  margin-bottom: 0.75rem; // Abstand zw. ListItems
  gap: 1rem; // Abstand link + icon

  opacity: ${(props) => (props.$isHidden ? 0.2 : 1)};
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  display: flex; // items nebeneinander
  align-items: center; // items vertikal zentriert
  gap: 0.5rem; // Abstand items

  background-color: var(--list-item-background);
  height: 2rem;
  width: 100%; // link füllt Platz in list-Breite
  border-radius: 20px;
  padding: 0 1rem; // Abstand Rand

  p {
    font-size: 1rem;
  }

  p.amount {
    margin-left: auto; // rechts
    font-weight: bold;
    white-space: nowrap;
  }

  &:hover {
    transform: scale(1.02);

    p {
      color: var(--primary-text-color);
    }
  }
`;

const IconWrapperEye = styled.div`
  display: flex; // wegen Zentrierung von svg
  align-items: center; // vertikal zentriert
  justify-content: center; // horizontal zentriert
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;

    &:hover {
      transform: scale(1.2);
    }
  }
`;

const ColorTag = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;

  background-color: ${(props) =>
    props.$isHidden ? "#5a5a5a" : props.$categoryColor};
`;
