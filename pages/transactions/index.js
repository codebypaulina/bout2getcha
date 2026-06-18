import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import styled from "styled-components";

import PageShell from "@/components/layout/PageShell";
import StatusMessage from "@/components/layout/StatusMessage";
import DatePicker from "@/components/DatePicker";
import ChartCard from "@/components/ChartCard";
import {
  FilterBar,
  ChartButton,
  DateNav,
  RangeButton,
  TypeButton,
} from "@/components/filterBar.styles";
import NavArrowButton from "@/components/NavArrowButton";
import FormEditTransaction from "@/components/FormEditTransaction";
import ChartIcon from "@/public/icons/chart.svg";

import useSessionStorageState from "@/hooks/useSessionStorageState";
import useDateFilter from "@/hooks/useDateFilter";
import { getCategoriesKey, getTransactionsKey } from "@/utils/swrKeys";
import {
  formatDateLabel,
  getDefaultRange,
  getRangeBounds,
  findClosestValidRange,
} from "@/utils/dateFilter";
import { formatCurrency } from "@/utils/helpers";

export default function TransactionsPage() {
  const pageTitle = "Transactions";

  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // user-ID (für session storage / data-fetch)

  // *** [ DATA-FETCH ]
  const { data: transactions, error: errorTransactions } = useSWR(
    getTransactionsKey(userId)
  );
  const { data: categories, error: errorCategories } = useSWR(
    getCategoriesKey(userId)
  );

  // *** [ STATES ]
  const [hoverSource, setHoverSource] = useState(null); // null | "list" | "pie"
  const [hoveredTxId, setHoveredTxId] = useState(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);

  // *** [ SYNC ] **************************************************************************
  // *** [ 1. chart-state ]: session storage ***********************************************
  const [isChartOpen, setIsChartOpen] = useSessionStorageState(
    userId ? `u:${userId}:transactions:isChartOpen` : null,
    false
  ); // default: closed  ||  in storage: wenn open

  // *** [ 2. type-filter ]: session storage ***********************************************
  const [typeFilter, setTypeFilter] = useSessionStorageState(
    userId ? `u:${userId}:transactions:typeFilter` : null,
    null
  ); // default: kein filter  ||  in storage: wenn expense / income

  // *** [ 3. date-filter ]: state + picker + session storage ******************************
  const {
    dateFilter,
    dateFilterTemplate,
    isDatePickerOpen,
    pickerRange,
    setPickerRange,
    pickerVisibleMonth,
    setPickerVisibleMonth,
    updateDateFilter,
    openPicker,
    closePicker,
    applyPickerRange,
    clearPickerRange,
  } = useDateFilter(userId ? `u:${userId}:transactions:dateFilter` : null);

  // *** [ GUARDS ] ************************************************************************
  if (errorTransactions || errorCategories) {
    return (
      <PageShell title={pageTitle}>
        <StatusMessage variant="error" message="Failed to load data." />
      </PageShell>
    );
  }

  if (!transactions || !categories) {
    return (
      <PageShell title={pageTitle}>
        <StatusMessage message="Loading ..." />
      </PageShell>
    );
  }

  // *** [ DERIVED DATA ] ******************************************************************
  // *** [ 1. date metadata ] **************************************************************
  const transactionTimes = transactions.map((transaction) =>
    new Date(transaction.date).getTime()
  ); // alle vorhandenen dates als Zeitwerte

  const minTransactionDate =
    transactionTimes.length > 0
      ? new Date(Math.min(...transactionTimes))
      : null; // älteste vorhandene tx
  const maxTransactionDate =
    transactionTimes.length > 0
      ? new Date(Math.max(...transactionTimes))
      : null; // neuste vorhandene tx

  // *** [ 2. date range metadata ] ********************************************************
  const dateFilterLabel = `${formatDateLabel(dateFilter.from)} - ${formatDateLabel(dateFilter.to)}`;

  // *** [default range]: für RangeButton
  const defaultRange = getDefaultRange();
  const isDefaultRange =
    dateFilter.from.getTime() === defaultRange.from.getTime() &&
    dateFilter.to.getTime() === defaultRange.to.getTime();

  // *** [monatsübergreifende range]: für < > buttons in DateNav
  const isCrossMonthRange =
    dateFilter.from.getFullYear() !== dateFilter.to.getFullYear() ||
    dateFilter.from.getMonth() !== dateFilter.to.getMonth();

  // *** [vorherige + nächste gültige range]
  const prevValidRange =
    isCrossMonthRange || !minTransactionDate || !maxTransactionDate
      ? null
      : findClosestValidRange(
          transactions,
          dateFilter.from, // state
          -1,
          minTransactionDate,
          maxTransactionDate,
          dateFilterTemplate
        );
  const nextValidRange =
    isCrossMonthRange || !minTransactionDate || !maxTransactionDate
      ? null
      : findClosestValidRange(
          transactions,
          dateFilter.from, // state
          1,
          minTransactionDate,
          maxTransactionDate,
          dateFilterTemplate
        );

  const isPrevRangeDisabled = isCrossMonthRange || !prevValidRange;
  const isNextRangeDisabled = isCrossMonthRange || !nextValidRange;

  // *** [ 3. filtered base data ] *********************************************************
  const { startTime: activeRangeStartTime, endTime: activeRangeEndTime } =
    getRangeBounds(dateFilter.from, dateFilter.to); // Beginn + Ende active date range

  const filteredTransactions = transactions
    .filter((transaction) => {
      const transactionTime = new Date(transaction.date).getTime();
      const isInRange =
        transactionTime >= activeRangeStartTime &&
        transactionTime <= activeRangeEndTime; // nur active date range
      const matchesTypeFilter =
        typeFilter === null || transaction.category.type === typeFilter; // nur active type-filter

      return isInRange && matchesTypeFilter;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Datum absteigend

  // *** [ 4. aggregated totals ] pro category + pro type **********************************
  const totalByCategoryId = {}; // pro category: für categoriesWithTotals (chart-data type-filter)
  let totalIncome = 0; // pro type: für totalBalanceValue (balance-data + chart-data main view)
  let totalExpense = 0;

  // amount zu total: 1x durch alle aktuell sichtbaren transactions
  filteredTransactions.forEach((transaction) => {
    const categoryId = transaction.category._id;
    const categoryType = transaction.category.type;

    totalByCategoryId[categoryId] =
      (totalByCategoryId[categoryId] || 0) + transaction.amount; // amount zu totalByCategoryId

    if (categoryType === "Income") totalIncome += transaction.amount; // amount zu totalIncome
    if (categoryType === "Expense") totalExpense += transaction.amount; // amount zu totalExpense
  });

  // *** [total zu category]: 1x durch alle categories
  const categoriesWithTotals = categories.map((category) => {
    const categoryId = category._id;
    return { ...category, totalAmount: totalByCategoryId[categoryId] || 0 }; // category + totalByCategoryId
  });

  // *** [ 5. chart-data ] *****************************************************************
  const chartData =
    typeFilter !== null
      ? categoriesWithTotals // segments: income-/expense-categories
          .filter(
            (category) =>
              category.type === typeFilter && category.totalAmount > 0
          )
          .map((category) => ({
            id: category._id,
            label: category.name,
            value: category.totalAmount,
            color: category.color,
          }))
          .sort((a, b) => b.value - a.value) // segments value absteigend
      : // segments main view: expenses + remaining income
        [
          {
            id: "Expenses",
            label: "Expenses",
            value: totalExpense,
            color: "var(--color-expense)",
          },
          {
            id: "Remaining Income",
            label: "Remaining Income",
            value: totalIncome - totalExpense,
            color: "var(--color-income)",
          },
        ];

  const hasEnoughChartData =
    typeFilter === null
      ? totalIncome > 0 || totalExpense > 0
      : chartData.length > 0; // für ChartButton

  const typeFilterActive = typeFilter !== null; // für transaction- + segment-hover (nur bei type-filter)

  // *** [balance-data]
  const totalBalanceLabel =
    typeFilter === "Income"
      ? "Total Income"
      : typeFilter === "Expense"
        ? "Total Expense"
        : "Total Balance";

  const totalBalanceValue =
    typeFilter === "Income"
      ? totalIncome
      : typeFilter === "Expense"
        ? totalExpense
        : totalIncome - totalExpense;

  // *** [tooltip %]
  const chartTotalValue = chartData.reduce(
    (sum, segment) => sum + segment.value,
    0
  );

  function getChartPercentage(value) {
    if (!chartTotalValue) return 0; // damit nicht durch 0 geteilt wird
    return Math.round((value / chartTotalValue) * 100);
  }

  // *** [ HANDLERS ] **********************************************************************
  function toggleChart() {
    setIsChartOpen((prevState) => !prevState);
  }

  function switchTypeFilter() {
    setTypeFilter((prevState) => {
      if (prevState === null) return "Expense";
      if (prevState === "Expense") return "Income";
      return null;
    });
  }

  function goToPrevMonth() {
    if (!prevValidRange) return;
    updateDateFilter(prevValidRange.start, prevValidRange.end);
  } // DateNav < >

  function goToNextMonth() {
    if (!nextValidRange) return;
    updateDateFilter(nextValidRange.start, nextValidRange.end);
  } // DateNav < >

  // *** [ transaction- + segment-hover ] *****************************************************
  function clearHover() {
    setHoverSource(null);
    setHoveredTxId(null);
    setHoveredCategoryId(null);
  }

  function handleSliceEnter(categoryId) {
    if (!typeFilterActive) return;
    setHoverSource("pie");
    setHoveredTxId(null); // alle tx dieser category in list highlighten
    setHoveredCategoryId(categoryId);
  }

  function handleSliceLeave() {
    if (!typeFilterActive) return;
    clearHover();
  }

  function handleTxEnter(transaction) {
    if (!typeFilterActive) return;
    setHoverSource("list");
    setHoveredTxId(transaction._id); // nur diese tx in list highlighten
    setHoveredCategoryId(transaction.category._id);
  }

  function handleTxLeave() {
    if (!typeFilterActive) return;
    clearHover();
  }

  function isTxHighlighted(transaction) {
    if (!typeFilterActive) return false;
    if (hoverSource === "list") {
      return hoveredTxId === transaction._id;
    }
    if (hoverSource === "pie") {
      return hoveredCategoryId === transaction.category._id;
    }
    return false;
  }

  // ***************************************************************************************
  const typeButtonColor =
    typeFilter === "Expense"
      ? "var(--color-expense)"
      : typeFilter === "Income"
        ? "var(--color-income)"
        : "var(--color-button-bg)";

  // ***************************************************************************************
  // ***************************************************************************************
  return (
    <PageShell title={pageTitle}>
      <FilterBar>
        <ChartButton
          type="button"
          aria-label="Toggle chart"
          className={isChartOpen && hasEnoughChartData ? "active" : ""}
          disabled={!hasEnoughChartData}
          onClick={toggleChart}
        >
          <ChartIcon />
        </ChartButton>

        <DateNav>
          <NavArrowButton
            direction="prev"
            ariaLabel="Go to previous month"
            disabled={isPrevRangeDisabled}
            onClick={goToPrevMonth}
            buttonSize={22}
            iconSize={10}
          />

          <RangeButton
            type="button"
            aria-label="Change date range"
            onClick={openPicker}
            className={isDefaultRange ? "" : "active"}
          >
            {dateFilterLabel}
          </RangeButton>

          <NavArrowButton
            direction="next"
            ariaLabel="Go to next month"
            disabled={isNextRangeDisabled}
            onClick={goToNextMonth}
            buttonSize={22}
            iconSize={10}
          />
        </DateNav>

        <TypeButton
          type="button"
          aria-label="Filter transactions by type"
          onClick={switchTypeFilter}
          $backgroundColor={typeButtonColor}
        />
      </FilterBar>

      {isDatePickerOpen && (
        <DatePicker
          pickerRange={pickerRange}
          setPickerRange={setPickerRange}
          pickerVisibleMonth={pickerVisibleMonth}
          setPickerVisibleMonth={setPickerVisibleMonth}
          applyPickerRange={applyPickerRange}
          clearPickerRange={clearPickerRange}
          closePicker={closePicker}
        />
      )}

      {isChartOpen && hasEnoughChartData && (
        <ChartCard
          data={chartData}
          getChartPercentage={getChartPercentage}
          summaryLabel={totalBalanceLabel}
          summaryValue={totalBalanceValue}
          isNegativeValue={totalBalanceValue < 0}
          // für transaction- + segment-hover:
          activeId={typeFilterActive ? hoveredCategoryId : null} // nicht in main view
          onSliceEnter={handleSliceEnter}
          onSliceLeave={handleSliceLeave}
        />
      )}

      {filteredTransactions.length === 0 ? (
        <p className="empty-state">No transactions in this date range.</p>
      ) : (
        <TransactionList>
          {filteredTransactions.map((transaction) => (
            <ListItem key={transaction._id}>
              <TransactionButton
                type="button"
                aria-label={`Edit transaction: ${transaction.description}`}
                title="Edit transaction"
                onClick={() => setEditingTxId(transaction._id)}
                // für transaction- + segment-hover:
                $isHighlighted={isTxHighlighted(transaction)}
                onMouseEnter={() => handleTxEnter(transaction)}
                onMouseLeave={handleTxLeave}
              >
                <p className="date">
                  {new Date(transaction.date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>

                <ColorTag
                  $typeFilter={typeFilter}
                  $categoryType={transaction.category.type}
                  $categoryColor={transaction.category.color}
                  $isHighlighted={isTxHighlighted(transaction)}
                />

                <p className="description">{transaction.description}</p>
                <p className="category">{transaction.category.name}</p>
                <p className="amount">{formatCurrency(transaction.amount)} €</p>
              </TransactionButton>
            </ListItem>
          ))}
        </TransactionList>
      )}

      {editingTxId && (
        <FormEditTransaction
          transactionId={editingTxId}
          closeForm={() => setEditingTxId(null)}
        />
      )}
    </PageShell>
  );
}

const TransactionList = styled.ul`
  background-color: var(--color-surface-elevated); // wie FilterBar
  border-radius: 20px;
  padding: 0.75rem; // Abstand Rand
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);

  display: grid; //    date | ColorTag | description | category | amount
  grid-template-columns:
    minmax(31px, max-content) 5px minmax(70px, 1fr) minmax(0, 60px)
    max-content;
  align-items: center; // content in der Zeile vertikal zentriert
  gap: 0.5rem;
`;

const ListItem = styled.li`
  display: contents; // childs direkte grid-items von TransactionList
`;

const TransactionButton = styled.button`
  display: contents; // date, ColorTag, description, category, amount -> grid
  background: transparent;
  border: none;
  cursor: pointer;

  p {
    font-size: 0.755rem;
    color: ${({ $isHighlighted }) =>
      $isHighlighted
        ? "var(--color-text-primary)"
        : "var(--color-text-secondary)"};
    transform: ${({ $isHighlighted }) =>
      $isHighlighted ? "scale(1.03)" : "none"};
  }

  p.date {
    white-space: nowrap;
    overflow: hidden;
  }

  p.description {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.category {
    text-align: left;
    font-size: 0.6rem;
    opacity: ${({ $isHighlighted }) => ($isHighlighted ? 0.7 : 0.6)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.amount {
    text-align: right;
    font-weight: bold;
    white-space: nowrap;
  }

  &:hover {
    p {
      transform: scale(1.03);
      color: var(--color-text-primary);
    }

    p.description {
      transform-origin: left center; // sonst zu arg links
    }

    p.category {
      opacity: 0.7;
    }

    span {
      transform: scale(1.3);
    }
  } // hover list item
`;

const ColorTag = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: ${({ $typeFilter, $categoryColor, $categoryType }) =>
    $typeFilter
      ? $categoryColor // type-filter: category-color
      : $categoryType === "Income" // main view: type-color
        ? "var(--color-income)"
        : "var(--color-expense)"};
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.2)" : "none"};
`;
