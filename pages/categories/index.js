import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
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
import ChartIcon from "@/public/icons/chart.svg";

import useSessionStorageState from "@/hooks/useSessionStorageState";
import useDateFilter from "@/hooks/useDateFilter";
import { getCategoriesKey, getTransactionsKey } from "@/utils/swrKeys";
import {
  formatDateString,
  formatDateLabel,
  getDefaultRange,
  getRangeBounds,
  findClosestValidRange,
} from "@/utils/dateFilter";
import { formatCurrency } from "@/utils/helpers";

export default function CategoriesPage() {
  const pageTitle = "Categories";

  const { isReady, query, replace } = useRouter();
  const queryType =
    query.type === "Income" || query.type === "Expense" ? query.type : null; // von FormAddCategory für type-filter

  const [hoveredCategoryId, setHoveredCategoryId] = useState(null); // category- + segment-hover

  // *** [ AUTH ]
  const { data: session } = useSession();
  const userId = session?.user?.userId; // user-ID (für session storage / data-fetch)

  // *** [ DATA-FETCH ]
  const { data: categories, error: errorCategories } = useSWR(
    getCategoriesKey(userId)
  );
  const { data: transactions, error: errorTransactions } = useSWR(
    getTransactionsKey(userId)
  );

  // *** [ SYNC ] **************************************************************************
  // *** [ 1. chart-state ]: session storage ***********************************************
  // default: closed  ||  in storage: wenn open
  const [isChartOpen, setIsChartOpen] = useSessionStorageState(
    userId ? `u:${userId}:categories:isChartOpen` : null,
    false
  );

  // *** [ 2. type-filter ]: session storage / url *****************************************
  // default: expense  ||  in storage: wenn income  ||  aus storage: wenn kein query von FormAddCategory
  const [typeFilter, setTypeFilter] = useSessionStorageState(
    userId ? `u:${userId}:categories:typeFilter` : null,
    "Expense"
  );

  // aus url: wenn query
  useEffect(() => {
    if (!isReady || !queryType) return;
    setTypeFilter(queryType);
    replace("/categories", undefined, { shallow: true }); // url wieder /categories, nichts maskieren, kein remount
  }, [isReady, queryType, setTypeFilter, replace]);

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
  } = useDateFilter(userId ? `u:${userId}:categories:dateFilter` : null);

  // *** [ GUARDS ] ************************************************************************
  if (errorCategories || errorTransactions) {
    return (
      <PageShell title={pageTitle}>
        <StatusMessage variant="error" message="Failed to load data." />
      </PageShell>
    );
  }

  if (!categories || !transactions) {
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

  const filteredTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    return (
      transactionTime >= activeRangeStartTime &&
      transactionTime <= activeRangeEndTime
    ); // nur active date range
  });

  // *** [ 4. aggregated totals ] **********************************************************
  const totalByCategoryId = {}; // total pro category

  // amount zu total: 1x durch alle aktuell sichtbaren transactions
  filteredTransactions.forEach((transaction) => {
    const categoryId = transaction.category._id;
    totalByCategoryId[categoryId] =
      (totalByCategoryId[categoryId] || 0) + transaction.amount;
  });

  // total zu category: 1x durch alle categories
  const categoriesWithTotals = categories.map((category) => {
    const categoryId = category._id;
    return { ...category, totalAmount: totalByCategoryId[categoryId] || 0 }; // category + totalByCategoryId
  });

  // categories filtern + sortieren
  const listedCategories = categoriesWithTotals
    .filter((category) => category.type === typeFilter) // nur active type-filter
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount; // Betrag ungleich: total amount absteigend
      }
      return a.name.localeCompare(b.name, "de-DE"); // Betrag gleich: A-Z
    });

  // *** [ 5. ID-Reihenfolge category-list ] ***********************************************
  // *** [snapshot]
  const navKey = `u:${userId}:catNav:/categories:${typeFilter}`; // sessionStorage-key
  const navIds = listedCategories.map((category) => category._id); // ID-array

  // *** [snapshot]: in sessionStorage speichern (für < > nav in CategoryDetailsPage)
  function storeCatNavSnapshot() {
    sessionStorage.setItem(navKey, JSON.stringify(navIds));
  }

  // *** [ 6. chart-data ] *****************************************************************
  const chartData = listedCategories
    .filter((category) => category.totalAmount > 0)
    .map((category) => ({
      id: category._id,
      label: category.name,
      value: category.totalAmount,
      color: category.color,
    }));

  const hasEnoughChartData = chartData.length > 0; // für ChartButton + ChartCard

  const listedCategoriesTotal = listedCategories.reduce(
    (sum, category) => sum + category.totalAmount,
    0
  ); // für ChartCard

  // *** [ 7. type-button ] ****************************************************************
  const typeButtonColor =
    typeFilter === "Expense" ? "var(--expense-color)" : "var(--income-color)";

  // *** [ HELPERS ] ***********************************************************************
  function getChartPercentage(value) {
    if (!listedCategoriesTotal) return 0;
    return Math.round((value / listedCategoriesTotal) * 100);
  } // für tooltip % in pie

  function getCategoryHref(categoryId) {
    const dateFromQuery = encodeURIComponent(formatDateString(dateFilter.from));
    const dateToQuery = encodeURIComponent(formatDateString(dateFilter.to));
    const navKeyQuery = encodeURIComponent(navKey);

    return `/categories/${categoryId}?from=/categories&dateFrom=${dateFromQuery}&dateTo=${dateToQuery}&navKey=${navKeyQuery}`;
    // "?from=/categories": Herkunft für nach category-delete
    // "&dateFrom/To": active date range
    // "&navKey": ID-Reihenfolge (< > nav)
  }

  // *** [ HANDLERS ] **********************************************************************
  function toggleChart() {
    setIsChartOpen((prevState) => !prevState);
  }

  function toggleTypeFilter() {
    setTypeFilter((prevState) =>
      prevState === "Expense" ? "Income" : "Expense"
    );
  }

  function goToPrevMonth() {
    if (!prevValidRange) return;
    updateDateFilter(prevValidRange.start, prevValidRange.end);
  } // DateNav < >

  function goToNextMonth() {
    if (!nextValidRange) return;
    updateDateFilter(nextValidRange.start, nextValidRange.end);
  } // DateNav < >

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
          aria-label="Toggle category type"
          onClick={toggleTypeFilter}
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
          summaryLabel={
            typeFilter === "Expense" ? "Total Expense" : "Total Income"
          }
          summaryValue={listedCategoriesTotal}
          // für category- + segment-hover:
          activeId={hoveredCategoryId}
          onSliceEnter={setHoveredCategoryId}
          onSliceLeave={() => setHoveredCategoryId(null)}
        />
      )}

      {listedCategories.length === 0 ? (
        <p className="empty-state">No categories yet. Add some.</p>
      ) : (
        <ul>
          {listedCategories.map((category) => {
            const isEmpty = category.totalAmount <= 0;
            const isHighlighted = hoveredCategoryId === category._id;
            const href = getCategoryHref(category._id);

            return (
              <ListItem key={category._id} $isEmpty={isEmpty}>
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
                    $isHighlighted={isHighlighted}
                  />

                  <p className="name">{category.name}</p>
                  <p className="amount">
                    {formatCurrency(category.totalAmount)} €
                  </p>
                </CategoryLink>
              </ListItem>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}

const ListItem = styled.li`
  margin-bottom: 0.5rem; // Abstand ListItems
  opacity: ${({ $isEmpty }) => ($isEmpty ? 0.2 : 1)}; // ausgegraut
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

  display: grid; //      ColorTag | name | amount
  grid-template-columns: 8px minmax(0, 1fr) max-content;
  align-items: center; // vertikal
  column-gap: 0.5rem; // Abstand items

  p.name,
  p.amount {
    font-size: 1rem;
    color: ${({ $isHighlighted }) =>
      $isHighlighted
        ? "var(--primary-text-color)"
        : "var(--secondary-text-color)"};
  }

  p.name {
    white-space: nowrap; // in 1 Zeile
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.amount {
    margin-left: auto; // rechts
    font-weight: bold;
    white-space: nowrap;
  }
`;

const ColorTag = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $categoryColor }) => $categoryColor};
  transform: ${({ $isHighlighted }) =>
    $isHighlighted ? "scale(1.2)" : "none"};
`;
