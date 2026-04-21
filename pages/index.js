import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import styled from "styled-components";

import PageShell from "@/components/layout/PageShell";
import ChartCard from "@/components/ChartCard";
import { FilterBar, ChartButton } from "@/components/filterBar.styles";

import EyeIcon from "@/public/icons/eye.svg";
import EyeSlashIcon from "@/public/icons/eye-slash.svg";
import ChartIcon from "@/public/icons/chart.svg";

import { formatCurrency } from "@/utils/helpers";

export default function HomePage() {
  const pageTitle = "Expenses";

  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null); // category- + segment-hover

  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // user-ID (für local + session storage / data-fetch)

  // *** [ DATA-FETCH ]
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );

  // *** [ SYNC ] **************************************************************************
  // *** [ 1. hidden categories ]: local storage *******************************************
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

  // *** [ 2. chart-state ]: session storage ***********************************************
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

  const hasEnoughChartData = chartData.length > 0; // für ChartButton + ChartCard

  // *** [total expense box]
  const currentMonthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(now); // aktueller Monat

  const totalExpense = visibleCategories.reduce(
    (sum, category) => sum + category.totalAmount,
    0
  ); // Summe angezeigter categories

  // *** [ HELPERS ] ***********************************************************************
  function getChartPercentage(value) {
    if (!totalExpense) return 0;
    return Math.round((value / totalExpense) * 100);
  } // für tooltip % in pie

  function getCategoryHref(categoryId) {
    const navKeyQuery = encodeURIComponent(navKey);
    return `/categories/${categoryId}?from=/&navKey=${navKeyQuery}`;
    // "?from=/": Herkunft = HomePage für nach category-delete
    // "&navKey": ID-Reihenfolge (< > nav)
  }

  // *** [ HANDLERS ] **********************************************************************
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
    <PageShell title={pageTitle}>
      <FilterBar>
        <HomeFilterBarContent>
          <ChartButton
            type="button"
            aria-label="Toggle chart"
            className={isChartOpen && hasEnoughChartData ? "active" : ""}
            disabled={!hasEnoughChartData}
            onClick={toggleChart}
          >
            <ChartIcon />
          </ChartButton>

          <TotalExpenseBox>
            <span className="month">{currentMonthLabel}</span>
            <span className="amount">{formatCurrency(totalExpense)} €</span>
          </TotalExpenseBox>
        </HomeFilterBarContent>
      </FilterBar>

      {isChartOpen && hasEnoughChartData && (
        <ChartCard
          data={chartData}
          getChartPercentage={getChartPercentage}
          hideSummary
          // für category- + segment-hover:
          activeId={hoveredCategoryId}
          onSliceEnter={setHoveredCategoryId}
          onSliceLeave={() => setHoveredCategoryId(null)}
        />
      )}

      {sortedCategories.length === 0 ? (
        <p className="empty-state">No expenses yet this month.</p>
      ) : (
        <ul>
          {sortedCategories.map((category) => {
            const isHidden = hiddenCategories.includes(category._id);
            const isHighlighted = hoveredCategoryId === category._id;
            const href = getCategoryHref(category._id);

            return (
              <ListItem key={category._id} $isHidden={isHidden}>
                <CategoryLink
                  href={href}
                  onClick={storeCatNavSnapshot}
                  // für category- + segment-hover:
                  $isHighlighted={isHighlighted}
                  onMouseEnter={() => setHoveredCategoryId(category._id)}
                  onMouseLeave={() => setHoveredCategoryId(null)}
                >
                  <ColorTag
                    $categoryColor={category.color}
                    $isHidden={isHidden}
                    $isHighlighted={isHighlighted}
                  />

                  <p className="name">{category.name}</p>
                  <p className="amount">
                    {formatCurrency(category.totalAmount)} €
                  </p>
                </CategoryLink>

                {isHidden ? (
                  <EyeButton
                    type="button"
                    aria-label="Show category"
                    title="Show category"
                    onClick={() => toggleVisibility(category._id)}
                  >
                    <EyeSlashIcon />
                  </EyeButton>
                ) : (
                  <EyeButton
                    type="button"
                    aria-label="Hide category"
                    title="Hide category"
                    onClick={() => toggleVisibility(category._id)}
                  >
                    <EyeIcon />
                  </EyeButton>
                )}
              </ListItem>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}

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

// ******************************************************************************

const ListItem = styled.li`
  margin-bottom: 0.75rem; // Abstand ListItems
  opacity: ${({ $isHidden }) => ($isHidden ? 0.2 : 1)}; // ausgegraut
  display: flex; // link + eye nebeneinander
  gap: 1rem; // Abstand link + eye
`;

const CategoryLink = styled(Link)`
  text-decoration: none;
  background-color: var(--list-item-background);
  border-radius: 30px;
  height: 2rem;
  width: 100%; // link füllt Platz in list-Breite
  padding: 0 1rem; // Abstand Rand
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.02)" : "none"};

  display: flex; // items nebeneinander
  align-items: center; // vertikal
  gap: 0.5rem; // Abstand items

  p.name,
  p.amount {
    font-size: 1rem;
    color: ${({ $isHighlighted }) =>
      $isHighlighted
        ? "var(--primary-text-color)"
        : "var(--secondary-text-color)"};
  }

  p.amount {
    margin-left: auto; // rechts
    font-weight: bold;
    white-space: nowrap;
  }
`;

const EyeButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;

  display: flex; // für Zentrierung von svg
  align-items: center; // vertikal
  justify-content: center; // horizontal

  svg {
    width: 20px;
    height: 20px;
    color: var(--secondary-text-color);
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 1));

    &:hover {
      transform: scale(1.2);
      color: var(--primary-text-color);
    }
  }
`;

const ColorTag = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $isHidden, $categoryColor }) =>
    $isHidden ? "#5a5a5a" : $categoryColor};
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.2)" : "none"};
`;
