import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import styled from "styled-components";
import Navbar from "@/components/Navbar";
import DateIcon from "@/public/icons/date.svg";
import ChartIcon from "@/public/icons/chart.svg";

// dynamisch, sonst ES Module error (auch bei aktuellster next.js-Version)
const ResponsivePie = dynamic(
  () => import("@nivo/pie").then((mod) => mod.ResponsivePie),
  { ssr: false }
);

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState(null); // type-filter
  const [dateFilter, setDateFilter] = useState({ from: null, to: null }); // date-filter
  const [dateFilterPopup, setDateFilterPopup] = useState(false); // date-filter-popup
  const [isChartOpen, setIsChartOpen] = useState(false); // chart-state

  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // user-ID (für session storage / data-fetch)

  // *** [ data-fetch ]
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );

  // dateFilter nur active, wenn from/to nicht null
  const isDateFilterActive = dateFilter.from !== null || dateFilter.to !== null;

  // *** [ SESSION STORAGE ] ***************************************************************
  // *** [ 1. date-filter ] ****************************************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:dateFilter`;
    const storedDateFilter = sessionStorage.getItem(key);
    if (!storedDateFilter) return;

    try {
      const parsedDateFilter = JSON.parse(storedDateFilter); // string in object für from/to
      const { from = null, to = null } = parsedDateFilter ?? {}; // holt from/to
      setDateFilter({ from, to }); // setzt from/to
    } catch {
      // ignorieren -> default
    }
  }, [userId]);

  // *** [speichern]: bei Änderung (state = from/to nicht null)
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:dateFilter`;

    if (isDateFilterActive) {
      sessionStorage.setItem(key, JSON.stringify(dateFilter));
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, isDateFilterActive, dateFilter]);

  // *** [ 2. chart-state ] ****************************************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:transactions:isChartOpen`;
    const storedChartState = sessionStorage.getItem(key);
    if (storedChartState) setIsChartOpen(true);
  }, [userId]);

  // *** [speichern]: bei Änderung (= open)
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:transactions:isChartOpen`;

    if (isChartOpen) {
      sessionStorage.setItem(key, "true");
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, isChartOpen]);

  // *** [ 3. type-filter ] ****************************************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:transactions:typeFilter`;
    const storedTypeFilter = sessionStorage.getItem(key);
    if (storedTypeFilter !== "Income" && storedTypeFilter !== "Expense") return;

    setTypeFilter(storedTypeFilter);
  }, [userId]);

  // *** [speichern]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:transactions:typeFilter`;

    if (typeFilter) {
      sessionStorage.setItem(key, typeFilter);
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, typeFilter]);

  // *** [ guards ] ************************************************************************
  if (!userId) return <h3>Loading ...</h3>; // auth
  if (errorTransactions || errorCategories) return <h3>Failed to load data</h3>; // data
  if (!transactions || !categories) return <h3>Loading ...</h3>; // data

  // *** [ ABGELEITETE DATEN ] *************************************************************
  // *** [ 1. transactions ] sortieren + filtern *******************************************
  // *** [sortieren]: nach Datum absteigend
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // für DateFilterPopup / handleDateChange: from/to-default
  // const latestDate = sortedTransactions[0]?.date.split("T")[0]; // neuste transaction
  const earliestDate =
    sortedTransactions[sortedTransactions.length - 1]?.date.split("T")[0]; // älteste transaction
  const today = new Date().toISOString().split("T")[0];
  const defaultFrom = earliestDate ?? null;
  const defaultTo = today;

  // *** [filtern]: type- + date-filter auf sortedTransactions
  const fromDate =
    (dateFilter.from ?? defaultFrom)
      ? new Date(dateFilter.from ?? defaultFrom)
      : null;
  const toDate =
    (dateFilter.to ?? defaultTo) ? new Date(dateFilter.to ?? defaultTo) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999); // end of day: ganzen Tag einschließen (23:59:59)

  const filteredTransactions = sortedTransactions.filter((transaction) => {
    // type-filter
    const typeMatches = !typeFilter || transaction.category.type === typeFilter;

    // date-filter
    const transactionDate = new Date(transaction.date);
    const dateMatches =
      (!fromDate || transactionDate >= fromDate) &&
      (!toDate || transactionDate <= toDate);

    return typeMatches && dateMatches;
  });

  // *** [ 2. totals ] pro category + pro type *********************************************
  const totalByCategoryId = {}; // pro category: für categoriesWithTotals (chart-data type-filter)
  let totalIncome = 0; // pro type: für totalBalanceValue (balance-data + chart-data main view)
  let totalExpense = 0;

  // *** [amount zu total]: 1x durch alle aktuell sichtbaren transactions
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

  // *** [ 3. balance-data & chart-data ] **************************************************
  // *** [balance]
  const totalBalanceValue =
    typeFilter === "Income"
      ? totalIncome
      : typeFilter === "Expense"
        ? totalExpense
        : totalIncome - totalExpense;

  const totalBalanceLabel =
    typeFilter === "Income"
      ? "Total Income"
      : typeFilter === "Expense"
        ? "Total Expense"
        : "Total Balance";

  // *** [chart]
  const chartData = (
    typeFilter
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
        ]
  ).sort((a, b) => a.value - b.value); // segments nach value absteigend gegen Uhrzeigersinn

  // *** [tooltip %]
  const chartTotalValue = chartData.reduce(
    (sum, segment) => sum + segment.value,
    0
  );

  function getChartPercentage(value) {
    if (!chartTotalValue) return 0; // damit nicht durch 0 geteilt wird
    return Math.round((value / chartTotalValue) * 100);
  }

  // ***************************************************************************************

  function toggleChart() {
    setIsChartOpen((prevState) => !prevState);
  }

  function toggleTypeFilter(type) {
    setTypeFilter((prevState) => (prevState === type ? null : type));
  }

  function toggleDateFilterPopup() {
    setDateFilterPopup((prevState) => !prevState);
  }

  function handleDateChange(event) {
    const { name, value } = event.target;

    const defaultValue = name === "from" ? defaultFrom : defaultTo;
    const dateFilterValue = !value || value === defaultValue ? null : value; // wenn default -> null

    setDateFilter((prevState) => ({ ...prevState, [name]: dateFilterValue }));
  }

  function clearDateFilter() {
    setDateFilter({ from: null, to: null });
  }

  return (
    <>
      <ContentContainer>
        <h1>Transactions</h1>

        {isChartOpen && chartData.length > 0 && (
          <ChartSection>
            <PieWrapper>
              <ResponsivePie
                data={chartData}
                colors={{ datum: "data.color" }}
                innerRadius={0.5} // 50 % ausgeschnitten
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
              <p>{totalBalanceLabel}</p>
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

        <FilterSection>
          <IconContainer>
            <IconWrapper
              onClick={toggleChart}
              className={isChartOpen ? "active" : ""}
            >
              <ChartIcon className="chart" />
            </IconWrapper>

            <IconWrapper
              onClick={toggleDateFilterPopup}
              className={isDateFilterActive ? "active" : ""}
            >
              <DateIcon className="date" />
            </IconWrapper>
          </IconContainer>

          <ButtonContainer>
            <button
              onClick={() => toggleTypeFilter("Income")}
              className={typeFilter === "Income" ? "active" : ""}
            >
              Incomes
            </button>

            <button
              onClick={() => toggleTypeFilter("Expense")}
              className={typeFilter === "Expense" ? "active" : ""}
            >
              Expenses
            </button>
          </ButtonContainer>
        </FilterSection>

        {dateFilterPopup && (
          <>
            <Overlay onClick={toggleDateFilterPopup} />

            <DateFilterPopup>
              <label htmlFor="from">From</label>
              <input
                type="date"
                id="from"
                name="from"
                value={(dateFilter.from ?? defaultFrom) || ""} // vorherige Auswahl oder default
                onChange={handleDateChange}
              />

              <label htmlFor="to">To</label>
              <input
                type="date"
                id="to"
                name="to"
                value={(dateFilter.to ?? defaultTo) || ""} // vorherige Auswahl oder default
                onChange={handleDateChange}
              />

              <button onClick={clearDateFilter}>Clear</button>
            </DateFilterPopup>
          </>
        )}

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
      </ContentContainer>

      <Navbar />
    </>
  );
}

const Overlay = styled.div`
  position: fixed; // bei scroll im viewport
  inset: 0; // füllt gesamten viewport
  background: rgba(0, 0, 0, 0.6); // abgedunkelt
  z-index: 9; // über Seite, unter Popup
`;

const DateFilterPopup = styled.div`
  position: fixed; // bei scroll im viewport
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); // zentriert
  z-index: 10; // Popup über Overlay

  width: 173px;
  background-color: var(--background-color);
  padding: 1.3rem 1.5rem 1.5rem 1.5rem;
  border-radius: 1.5rem; // abgerundete Ecken
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  display: flex;
  flex-direction: column; // content untereinander

  label {
    font-weight: bold;
    margin-bottom: 0.5rem; // Abstand input
  }

  input {
    height: 1.5rem;
    border-radius: 0.5rem; // abgerundete Ecken
    border: 0.07rem solid var(--button-hover-color);
    accent-color: var(
      --button-hover-color // Firefox: wenn angeklickt, kein blauer Rahmen
    );
    cursor: text;
  }

  input#from {
    margin-bottom: 0.8rem; // Abstand #to
  }

  button {
    margin-top: 1.5rem; // Abstand input
    align-self: center;

    border: none;
    border-radius: 20px;
    width: 60px;
    height: 30px;
    cursor: pointer;
    font-weight: bold;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.07);
      color: var(--primary-text-color);
    }
  }
`;

// ******************************************************************************

const ContentContainer = styled.div`
  padding: 20px 20px 83px 20px; // Nav 75px // Abstand Bildschirmrand
  max-width: 430px; // Breite von list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;

const ChartSection = styled.div`
  display: flex;
  flex-direction: column; // PieWrapper + BalanceContainer untereinander
  max-width: 265px; // schmaler als FilterSection
  margin: 0 auto 1.5rem auto; // Abstand FilterSection, horizontal zentriert
`;

const PieWrapper = styled.div`
  height: 150px;
  width: 150px;
  margin: 0 auto; // horizontal zentriert
`;

const BalanceContainer = styled.div`
  align-self: flex-end; // rechts in ChartSection
  text-align: center; // content horizontal zentriert

  p.value {
    font-weight: bold;
  }

  p.value.negative {
    color: var(--expense-color);
  }
`;

const FilterSection = styled.div`
  display: flex; // IconContainer + ButtonContainer nebeneinander
  justify-content: space-between; // icon links, button rechts

  max-width: 285px; // schmaler als list
  margin: 0 auto 1.5rem auto; // Abstand list, horizontal zentriert
`;

const IconContainer = styled.div`
  display: flex; // svgs nebeneinander
  gap: 0.75rem; // für gap
`;

const IconWrapper = styled.div`
  background-color: var(--button-background-color);
  color: var(--button-text-color);
  width: 32px;
  height: 30px;
  border-radius: 10px;
  display: flex; // wegen Zentrierung von svgs
  align-items: center; // vertikal zentriert
  justify-content: center; // horizontal zentriert
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  svg.chart {
    width: 20px;
    height: 20px;
  }

  svg.date {
    width: 18px;
    height: 18px;
  }

  &:hover {
    transform: scale(1.07);
    color: var(--primary-text-color);
  }

  &.active {
    background-color: var(--button-active-color);
    color: var(--button-active-text-color);
  }
`;

const ButtonContainer = styled.div`
  display: flex; // für gap
  gap: 0.75rem;

  button {
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    border: none;
    width: 90px;
    height: 30px;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.04);
      color: var(--primary-text-color);
    }

    &.active {
      background-color: var(--button-active-color);
      color: var(--button-active-text-color);
    }
  }
`;

// ******************************************************************************

const StyledList = styled.ul`
  list-style-type: none;
  display: grid; //    date | ColorTag | description | category | amount
  grid-template-columns:
    minmax(33px, max-content) 5px minmax(60px, 1fr) minmax(0, max-content)
    74px;
  align-items: center; // content in der Zeile vertikal zentriert
  gap: 0.5rem;
`;

const ListItem = styled.li`
  display: contents; // childs direkte grid-items von StyledList
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  display: contents; // date, ColorTag, description, category, amount -> grid

  p {
    font-size: 0.8rem;
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
