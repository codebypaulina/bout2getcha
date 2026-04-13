import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import styled from "styled-components";

import DatePicker from "@/components/DatePicker";
import Navbar from "@/components/Navbar";
import ChartIcon from "@/public/icons/chart.svg";
import PrevIcon from "@/public/icons/previous.svg";
import NextIcon from "@/public/icons/next.svg";
import {
  FilterBar,
  ChartButton,
  DateNav,
  ArrowButton,
  RangeButton,
  TypeButton,
} from "@/components/ui/filterBar.styles";

import useSessionStorageState from "@/hooks/useSessionStorageState";
import useDateFilter from "@/hooks/useDateFilter";
import {
  formatDateLabel,
  getDefaultRange,
  getRangeBounds,
  findClosestValidRange,
} from "@/utils/dateFilter";

// dynamisch, sonst ES Module error (auch bei aktuellster next.js-Version)
const ResponsivePie = dynamic(
  () => import("@nivo/pie").then((mod) => mod.ResponsivePie),
  { ssr: false }
);

export default function TransactionsPage() {
  // *** [ AUTH ]
  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // user-ID (für session storage / data-fetch)

  // *** [ DATA-FETCH ]
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );

  // *** [ SYNC ] **************************************************************************
  // *** [ 1. chart-state ]: session storage ***********************************************
  // default: closed  ||  in storage: wenn open
  const [isChartOpen, setIsChartOpen] = useSessionStorageState(
    userId ? `u:${userId}:transactions:isChartOpen` : null,
    false
  );

  // *** [ 2. type-filter ]: session storage ***********************************************
  // default: kein filter  ||  in storage: wenn expense / income
  const [typeFilter, setTypeFilter] = useSessionStorageState(
    userId ? `u:${userId}:transactions:typeFilter` : null,
    null
  );

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
  if (errorTransactions || errorCategories) return <h3>Failed to load data</h3>;
  if (!transactions || !categories) return <h3>Loading ...</h3>;

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
    const categoryId = transaction.category._id.toString();
    const categoryType = transaction.category.type;

    totalByCategoryId[categoryId] =
      (totalByCategoryId[categoryId] || 0) + transaction.amount; // amount zu totalByCategoryId

    if (categoryType === "Income") totalIncome += transaction.amount; // amount zu totalIncome
    if (categoryType === "Expense") totalExpense += transaction.amount; // amount zu totalExpense
  });

  // *** [total zu category]: 1x durch alle categories
  const categoriesWithTotals = categories.map((category) => {
    const categoryId = category._id.toString();
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
            color: "var(--expense-color)",
          },
          {
            id: "Remaining Income",
            label: "Remaining Income",
            value: totalIncome - totalExpense,
            color: "var(--income-color)",
          },
        ];

  const hasEnoughChartData = chartData.length > 0; // für ChartButton

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

  // ***************************************************************************************
  const typeButtonColor =
    typeFilter === "Expense"
      ? "var(--expense-color)"
      : typeFilter === "Income"
        ? "var(--income-color)"
        : "var(--button-background-color)";

  // ***************************************************************************************
  // ***************************************************************************************
  return (
    <>
      <ContentContainer>
        <h1>Transactions</h1>

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
            <ArrowButton
              type="button"
              aria-label="Go to previous month"
              disabled={isPrevRangeDisabled}
              onClick={goToPrevMonth}
            >
              <PrevIcon className="prev" />
            </ArrowButton>

            <RangeButton
              type="button"
              aria-label="Change date range"
              onClick={openPicker}
              className={isDefaultRange ? "" : "active"}
            >
              {dateFilterLabel}
            </RangeButton>

            <ArrowButton
              type="button"
              aria-label="Go to next month"
              disabled={isNextRangeDisabled}
              onClick={goToNextMonth}
            >
              <NextIcon className="next" />
            </ArrowButton>
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
          <ChartSection>
            <PieWrapper>
              <ResponsivePie
                data={chartData}
                colors={{ datum: "data.color" }}
                innerRadius={0.5} // 50 % ausgeschnitten
                startAngle={0} // Start: oben auf 12 Uhr
                endAngle={-360} // Ende: volle Runde gegen Uhrzeigersinn
                padAngle={2} // Abstand zwischen Segmenten
                cornerRadius={3} // rundere Ecken der Segmente
                arcLinkLabelsSkipAngle={360} // ausgeblendete Linien
                animate={false} // Segmente springen nicht
                enableArcLabels={false} // keine Zahlen im Segment
                tooltip={({ datum }) => (
                  <div>
                    {datum.label}:{" "}
                    <strong>{getChartPercentage(datum.value)} %</strong>
                  </div>
                )}
              />
            </PieWrapper>

            <BalanceContainer>
              <p className="label">{totalBalanceLabel}</p>
              <p className={`value ${totalBalanceValue < 0 ? "negative" : ""}`}>
                {totalBalanceValue.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
            </BalanceContainer>
          </ChartSection>
        )}

        {filteredTransactions.length === 0 ? (
          <p className="no-transaction">No transactions in this date range.</p>
        ) : (
          <StyledList>
            {filteredTransactions.map((transaction) => (
              <ListItem key={transaction._id}>
                <StyledLink href={`/transactions/${transaction._id}`}>
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
                  />

                  <p className="description">{transaction.description}</p>
                  <p className="category">{transaction.category.name}</p>
                  <p className="amount">
                    {transaction.amount.toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                </StyledLink>
              </ListItem>
            ))}
          </StyledList>
        )}
      </ContentContainer>

      <Navbar />
    </>
  );
}

const ContentContainer = styled.div`
  padding: 20px 20px 83px 20px; // Nav 75px // Abstand Bildschirmrand
  max-width: 350px; // Breite FilterBar + list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .no-transaction {
    text-align: center;
  }
`;

// ******************************************************************************

const ChartSection = styled.div`
  display: flex;
  flex-direction: column; // PieWrapper + BalanceContainer untereinander
  align-items: center; // horizontal zentriert
  gap: 1rem;

  background-color: #232323;
  border-radius: 20px;
  width: 200px;
  padding: 1.2rem 1.2rem 1rem 1.2rem;
  margin: 0 auto 1.5rem auto; // Abstand list + horizontal zentriert
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);
`;

const PieWrapper = styled.div`
  height: 155px;
  width: 155px;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Zwischenräume
`;

const BalanceContainer = styled.div`
  display: flex; // label + value nebeneinander
  gap: 0.5rem;

  p.label {
    width: 85px;
  }

  p.value {
    font-weight: bold;
  }

  p.value.negative {
    color: var(--expense-color);
  }
`;

// ******************************************************************************

const StyledList = styled.ul`
  list-style-type: none;
  display: grid; //    date | ColorTag | description | category | amount
  grid-template-columns:
    minmax(33px, max-content) 5px minmax(70px, 1fr) minmax(0, max-content)
    67px;
  align-items: center; // content in der Zeile vertikal zentriert
  gap: 0.5rem;

  background-color: #232323;
  border-radius: 20px;
  padding: 0.75rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);
`;

const ListItem = styled.li`
  display: contents; // childs direkte grid-items von StyledList
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  display: contents; // date, ColorTag, description, category, amount -> grid

  p {
    font-size: 0.755rem;
  }

  p.date {
    white-space: nowrap;
    overflow: hidden;
  }

  p.description {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.category {
    font-size: 0.6rem;
    opacity: 0.6;
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
      color: var(--primary-text-color);
    }

    p.description {
      transform-origin: left center; // sonst zu arg links
    }

    p.category {
      opacity: 0.7;
    }

    span {
      transform: scale(1.2);
    }
  }
`;

const ColorTag = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;

  background-color: ${(props) =>
    props.$typeFilter
      ? props.$categoryColor // bei type-filter: category color
      : props.$categoryType === "Income" // bei main view: type color
        ? "var(--income-color)"
        : "var(--expense-color)"};
`;
