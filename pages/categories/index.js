import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import styled from "styled-components";
import Navbar from "@/components/Navbar";
import ChartIcon from "@/public/icons/chart.svg";
import PrevIcon from "@/public/icons/previous.svg";
import NextIcon from "@/public/icons/next.svg";

// hier muss dynamischer Import, sonst ES Module error (auch bei aktuellster next.js-Version)
const ResponsivePie = dynamic(
  () => import("@nivo/pie").then((mod) => mod.ResponsivePie),
  { ssr: false }
);

// *** [ HELPERS ]: date ******************************************************************
// *** [object -> "YYYY-MM"]: für in url, an CategoryDetailsPage, aus url
function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// *** [object -> "DD.MM.YYYY"]: für activeRangeLabel
function formatDateLabel(date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// *** [1. Tag des Monats]: für default
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1); // 17.03.2026 -> 01.03.2026
}

// *** [letzter Tag des Monats]: für default (= 0. Tag des Folgemonats)
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  // new Date(2026, 3, 0) -> 31.03.2026
  // new Date(2026, 3, 1) -> 01.04.2026
}

// *** [range-Tagesgrenzen]: für gültige + active range
function getRangeBounds(startDate, endDate) {
  return {
    startTime: new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0
    ).getTime(), // Starttag um 00:00:00

    endTime: new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999
    ).getTime(), // Endtag um 23:59:59
  };
}

// *** [range + 1 / - 1]:
function moveDateByMonths(date, monthOffset) {
  const originalDay = date.getDate(); // ursprüngl. Tag

  // Zieljahr + Zielmonat
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth() + monthOffset,
    1 // 1. Tag
  );
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0 // 0. Tag des Folgemonats
  ).getDate(); // letzter existierender Tag des Zielmonats (31.03.2026 -1 -> 28.02.2026)

  // ursprüngl. Tag / letzter existierender Tag des Zielmonats
  const nextDay = Math.min(originalDay, lastDayOfTargetMonth);

  return new Date(targetYear, targetMonth, nextDay);
}

// ***************************************************************************************
// ***************************************************************************************

export default function CategoriesPage() {
  const router = useRouter();
  const { isReady, query, replace } = router;
  const type = query.type; // von FormAddCategory für type-filter
  const month = query.month; // "YYYY-MM" für & von CategoryDetailsPage

  const [typeFilter, setTypeFilter] = useState("Expense");
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => startOfMonth(new Date()));
  const [rangeEnd, setRangeEnd] = useState(() => endOfMonth(new Date()));

  const { data: session } = useSession(); // auth
  const userId = session?.user?.userId; // user-ID (für session storage / data-fetch)

  // *** [ data-fetch ]
  const { data: categories, error: errorCategories } = useSWR(
    userId ? `/api/categories?u=${userId}` : null
  );
  const { data: transactions, error: errorTransactions } = useSWR(
    userId ? `/api/transactions?u=${userId}` : null
  );

  // *** [ SESSION STORAGE ] ***************************************************************
  // *** [ 1. chart-state ] ****************************************************************
  // *** [abrufen]
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:categories:isChartOpen`;
    const storedChartState = sessionStorage.getItem(key);
    if (storedChartState) setIsChartOpen(true);
  }, [userId]);

  // *** [speichern]: bei Änderung (state = true)
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:categories:isChartOpen`;

    if (isChartOpen) {
      sessionStorage.setItem(key, "true");
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, isChartOpen]);

  // *** [ 2. type-filter ] ****************************************************************
  // *** [abrufen aus url]: wenn query von FormAddCategory
  useEffect(() => {
    if (!isReady) return;
    if (type === "Income" || type === "Expense") {
      setTypeFilter(type); // type in url: in filter
      replace("/categories", undefined, { shallow: true }); // url wieder /categories, nichts maskieren, kein remount
    }
  }, [isReady, type, replace]);

  // *** [abrufen aus storage]: wenn kein query
  useEffect(() => {
    if (!isReady) return;
    if (!userId) return;
    if (type === "Income" || type === "Expense") return; // type in url: abbrechen, nicht aus storage

    const key = `u:${userId}:categories:typeFilter`;
    const storedTypeFilter = sessionStorage.getItem(key);
    if (storedTypeFilter === "Income") setTypeFilter("Income"); // income in storage: in filter
  }, [isReady, userId, type]);

  // *** [speichern]: nur wenn income
  useEffect(() => {
    if (!userId) return;
    const key = `u:${userId}:categories:typeFilter`;

    if (typeFilter === "Income") {
      sessionStorage.setItem(key, "Income");
    } else {
      sessionStorage.removeItem(key);
    }
  }, [userId, typeFilter]);

  // *** [ ACTIVE RANGE: aus URL ] *********************************************************
  useEffect(() => {
    if (!isReady) return;
    if (typeof month !== "string") return;

    // für date-object
    const [yearString, monthString] = month.split("-"); // "2026-02" -> "2026" + "02"
    const parsedYear = Number(yearString); // "2026" -> 2026
    const parsedMonthIndex = Number(monthString) - 1; // "02" => 2 => -1 => 1

    if (
      !Number.isInteger(parsedYear) ||
      !Number.isInteger(parsedMonthIndex) ||
      parsedMonthIndex < 0 ||
      parsedMonthIndex > 11
    ) {
      return;
    }

    const monthDate = new Date(parsedYear, parsedMonthIndex, 1); // 1. Tag des Monats

    setRangeStart(startOfMonth(monthDate));
    setRangeEnd(endOfMonth(monthDate));
  }, [isReady, month]);

  // *** [ guards ] ************************************************************************
  if (errorCategories || errorTransactions) return <h3>Failed to load data</h3>;
  if (!categories || !transactions) return <h3>Loading ...</h3>;

  // *** [ HELPERS ]: date range ***********************************************************
  // *** [gültige range]: mind. 1 transaction in range
  function isValidRange(transactions, startDate, endDate) {
    const { startTime, endTime } = getRangeBounds(startDate, endDate);

    return transactions.some((transaction) => {
      const transactionTime = new Date(transaction.date).getTime();
      return transactionTime >= startTime && transactionTime <= endTime;
    });
  }

  // *** [erste gültige vorherige / nächste range]
  function findClosestValidRange(
    transactions,
    currentStart,
    currentEnd,
    monthOffset,
    minTxDate,
    maxTxDate
  ) {
    // Grenzen
    const minTime = getRangeBounds(
      startOfMonth(minTxDate),
      endOfMonth(minTxDate)
    ).startTime; // älteste transaction
    const maxTime = getRangeBounds(
      startOfMonth(maxTxDate),
      endOfMonth(maxTxDate)
    ).endTime; // neuste transaction

    // Prüfung: Beginn 1 range vor / nach active range
    let candidateRange = {
      start: moveDateByMonths(currentStart, monthOffset),
      end: moveDateByMonths(currentEnd, monthOffset),
    };

    while (true) {
      const { startTime, endTime } = getRangeBounds(
        candidateRange.start,
        candidateRange.end
      );

      // Abbruch: komplette range liegt vor ältester / nach neuster transaction
      if (endTime < minTime || startTime > maxTime) {
        return null; // button disabled
      }

      // Treffer: erste gültige range
      if (
        isValidRange(transactions, candidateRange.start, candidateRange.end)
      ) {
        return candidateRange;
      }

      // kein Treffer: weitere range in selbe Richtung
      candidateRange = {
        start: moveDateByMonths(candidateRange.start, monthOffset),
        end: moveDateByMonths(candidateRange.end, monthOffset),
      };
    }
  }

  // *** [ DERIVED DATA ] ******************************************************************
  // *** [ 1. date ] ***********************************************************************
  // *** [alle date-Werte]: aus vorhandenen transactions
  const transactionDates = transactions.map(
    (transaction) => new Date(transaction.date)
  );

  // *** [date-Grenzen]
  const minTransactionDate = new Date(
    Math.min(...transactionDates.map((date) => date.getTime()))
  ); // älteste vorhandene transaction
  const maxTransactionDate = new Date(
    Math.max(...transactionDates.map((date) => date.getTime()))
  ); // neuste vorhandene transaction

  // *** [ 2. range ] **********************************************************************
  // *** [active range]
  const activeRangeLabel = `${formatDateLabel(rangeStart)} - ${formatDateLabel(rangeEnd)}`; // state
  const activeMonthKey = getMonthKey(rangeStart); // in "YYYY-MM"

  // *** [vorherige + nächste gültige range]
  const prevValidRange = findClosestValidRange(
    transactions,
    rangeStart, // state
    rangeEnd,
    -1,
    minTransactionDate,
    maxTransactionDate
  );

  const nextValidRange = findClosestValidRange(
    transactions,
    rangeStart, // state
    rangeEnd,
    1,
    minTransactionDate,
    maxTransactionDate
  );

  const isPrevRangeDisabled = !prevValidRange; // für < > buttons in DateNav
  const isNextRangeDisabled = !nextValidRange;

  // *** [ 3. transactions ]: nur aus active range *****************************************
  const { startTime: activeRangeStartTime, endTime: activeRangeEndTime } =
    getRangeBounds(rangeStart, rangeEnd); // Beginn + Ende active range (state)

  const activeRangeTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    return (
      transactionTime >= activeRangeStartTime &&
      transactionTime <= activeRangeEndTime
    ); // transaction innerhalb range, wenn zw. Beginn + Ende
  });

  // *** [ 4. categories ] *****************************************************************
  // *** [mit totals]
  const categoriesWithTotals = categories.map((category) => {
    const totalAmount = activeRangeTransactions
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

  // *** [filtern + sortieren]
  const sortedActiveCategories = categoriesWithTotals
    .filter((category) => category.type === typeFilter) // nur aktiver type
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount; // Betrag ungleich: total amount absteigend
      }
      return a.name.localeCompare(b.name, "de-DE"); // Betrag gleich: A-Z
    });

  // *** [ 5. ID-Reihenfolge category-list ] ***********************************************
  // *** [snapshot]
  const navKey = `u:${userId}:catNav:/categories:${typeFilter}`; // sessionStorage-key
  const navIds = sortedActiveCategories.map((category) => category._id); // ID-array

  // *** [snapshot]: in sessionStorage speichern (für < > nav in CategoryDetailsPage)
  function storeCatNavSnapshot() {
    if (!userId) return;
    sessionStorage.setItem(navKey, JSON.stringify(navIds));
  }

  // *** [ 6. chart ] **********************************************************************
  // *** [chart-data]
  const chartData = sortedActiveCategories
    .filter((category) => category.totalAmount > 0)
    .map((category) => ({
      id: category._id,
      label: category.name,
      value: category.totalAmount,
      color: category.color,
    }));

  const hasEnoughChartData = chartData.length >= 2; // für ChartButton + ChartSection

  // *** [value balance-container]: Summe angezeigter categories
  const totalValue = sortedActiveCategories.reduce(
    (sum, category) => sum + category.totalAmount,
    0
  );

  // *** [tooltip %]
  function getChartPercentage(value) {
    if (!totalValue) return 0;
    return Math.round((value / totalValue) * 100);
  }

  // *** [ HANDLERS ] **********************************************************************
  function toggleChart() {
    if (!hasEnoughChartData) return;
    setIsChartOpen((prevState) => !prevState);
  }

  function toggleTypeFilter() {
    setTypeFilter((prevState) =>
      prevState === "Expense" ? "Income" : "Expense"
    );
  }

  // *** [ DateNav < > ]
  function changeDateRange(startDate, endDate) {
    setRangeStart(startDate);
    setRangeEnd(endDate);

    const targetMonthKey = getMonthKey(startDate);

    replace(`/categories?month=${targetMonthKey}`, undefined, {
      shallow: true,
    }); // url aktualisieren mit neuer active range ohne remount
  }

  function goToPrevRange() {
    if (!prevValidRange) return;
    changeDateRange(prevValidRange.start, prevValidRange.end);
  }

  function goToNextRange() {
    if (!nextValidRange) return;
    changeDateRange(nextValidRange.start, nextValidRange.end);
  }

  return (
    <>
      <ContentContainer>
        <h1>Categories</h1>

        <MonthNav>
          <NavButton
            type="button"
            aria-label="Previous date range"
            disabled={isPrevRangeDisabled}
            onClick={goToPrevRange}
          >
            <PrevIcon className="prev" />
          </NavButton>

          <p>{activeRangeLabel}</p>

          <NavButton
            type="button"
            aria-label="Next date range"
            disabled={isNextRangeDisabled}
            onClick={goToNextRange}
          >
            <NextIcon className="next" />
          </NavButton>
        </MonthNav>

        <FilterSection>
          <ChartButton
            type="button"
            aria-label="Toggle chart"
            className={isChartOpen && hasEnoughChartData ? "active" : ""}
            disabled={!hasEnoughChartData}
            onClick={toggleChart}
          >
            <ChartIcon />
          </ChartButton>

          <button
            type="button"
            aria-label="Toggle category type"
            className="type-filter"
            onClick={toggleTypeFilter}
          >
            {typeFilter === "Expense" ? "Expenses" : "Incomes"}
          </button>
        </FilterSection>

        {isChartOpen && hasEnoughChartData && (
          <ChartSection>
            <PieWrapper>
              <ResponsivePie
                data={chartData}
                colors={{ datum: "data.color" }} // nutzt definierte Kategorienfarben für Segmente
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
              <p>
                {typeFilter === "Expense" ? "Total Expense" : "Total Income"}
              </p>

              <p className="value">
                {totalValue.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </p>
            </BalanceContainer>
          </ChartSection>
        )}

        <StyledList>
          {sortedActiveCategories.map((category) => (
            <ListItem key={category._id} $empty={category.totalAmount <= 0}>
              <StyledLink
                href={`/categories/${category._id}?from=/categories&month=${activeMonthKey}&navKey=${encodeURIComponent(navKey)}`} // "?from/categories": Herkunft für nach category-delete // "&month=...": aktiver Monat // "&navKey=...": ID-Reihenfolge (< > nav)
                onClick={storeCatNavSnapshot}
              >
                <ColorTag $categoryColor={category.color} />

                <p>{category.name}</p>
                <p className="amount">
                  {category.totalAmount.toLocaleString("de-DE", {
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

const ContentContainer = styled.div`
  padding: 20px 20px 83px 20px; // Nav 75px // Abstand Bildschirmrand
  max-width: 350px; // Breite von list
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;

// ******************************************************************************

const MonthNav = styled.div`
  display: flex; // items nebeneinander
  justify-content: space-between; // verteilt
  align-items: center; // vertikal zentriert
  margin: 0 auto 1rem auto;
  max-width: 160px; // schmaler als list + FilterSection

  p {
    font-size: 0.85rem;
  }
`;

const NavButton = styled.button`
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background-color: var(--button-background-color);
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  svg {
    height: 10px;
    width: 10px;
    stroke: var(--button-text-color);
  }
  .prev {
    margin-right: 2px;
  }
  .next {
    margin-left: 2px;
  }

  &:hover {
    transform: scale(1.07);

    svg {
      stroke: var(--primary-text-color);
    }
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

// ******************************************************************************

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
`;

const FilterSection = styled.div`
  display: flex; // buttons nebeneinander
  justify-content: space-between; // chart links, type rechts
  max-width: 285px; // schmaler als list
  margin: 0 auto 1.5rem auto; // Abstand list, horizontal zentriert

  button.type-filter {
    background-color: var(--button-active-color);
    color: var(--button-active-text-color);
    border: none;
    width: 90px;
    height: 30px;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.04);
    }
  }
`;

const ChartButton = styled.button`
  border: none;
  background-color: var(--button-background-color);
  color: var(--button-text-color);
  width: 32px;
  height: 30px;
  border-radius: 10px;
  display: flex; // wegen Zentrierung von svg
  align-items: center; // vertikal zentriert
  justify-content: center; // horizontal zentriert
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    transform: scale(1.07);
    color: var(--primary-text-color);
  }

  &.active {
    background-color: var(--button-active-color);
    color: var(--button-active-text-color);
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

// ******************************************************************************

const StyledList = styled.ul`
  list-style-type: none;
`;

const ListItem = styled.li`
  background-color: var(--list-item-background);
  border-radius: 20px;
  margin-bottom: 0.5rem; // Abstand zw. ListItems

  opacity: ${(props) =>
    props.$empty ? 0.2 : 1}; // dunkler bei totalAmount <= 0

  &:hover {
    transform: scale(1.02);

    p {
      color: var(--primary-text-color);
    }
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  display: flex; // items nebeneinander
  align-items: center; // items vertikal zentriert
  gap: 0.5rem; // Abstand items

  height: 2rem;
  padding: 0 1rem; // Abstand Rand

  p {
    font-size: 1rem;
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

  background-color: ${(props) => props.$categoryColor};
`;
