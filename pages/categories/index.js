import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import styled from "styled-components";
import DatePicker from "@/components/DatePicker";
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
// *** [new Date(YYYY, MM, DD) -> "YYYY-MM-DD"]: für dateFrom / dateTo (in url)
function formatDateParam(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// *** ["YYYY-MM-DD" -> new Date(YYYY, MM, DD)]: für dateFrom / dateTo (aus url)
function parseDateParam(value) {
  if (typeof value !== "string") return null;

  const [yearString, monthString, dayString] = value.split("-"); // "2026-03-01" -> "2026" + "03" + "01"
  const year = Number(yearString); // "2026" -> 2026
  const monthIndex = Number(monthString) - 1; // "03" => 3 => -1 => 2
  const day = Number(dayString); // "01" -> 1

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date; // new Date(2026, 2, 1)
}

// *** [new Date(YYYY, MM, DD) -> "DD.MM.YYYY"]: für activeRangeLabel
function formatDateLabel(date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// *** [aktueller Monat]: 1. Tag
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1); // 17.03.2026 -> 01.03.2026
}

// *** [aktueller Monat]: letzter Tag
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0); // 0. Tag des Folgemonats
  // new Date(2026, 2, 1) -> 01.03.2026
  // new Date(2026, 3, 0) -> 31.03.2026
  // new Date(2026, 3, 1) -> 01.04.2026
}

// *** [default range]: ganzer aktueller Monat
function getDefaultRange() {
  const today = new Date();
  return {
    from: startOfMonth(today),
    to: endOfMonth(today),
  };
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

// *** [range + 1 / - 1 Monat]:
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
  const dateFrom = query.dateFrom;
  const dateTo = query.dateTo;

  // *** [ STATES ]
  const [typeFilter, setTypeFilter] = useState("Expense");
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => getDefaultRange().from); // active date range
  const [rangeEnd, setRangeEnd] = useState(() => getDefaultRange().to);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // date picker
  const [pickerRange, setPickerRange] = useState(() => getDefaultRange());
  const [pickerVisibleMonth, setPickerVisibleMonth] = useState(
    () => getDefaultRange().from
  );

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

  // *** [ DATE RANGE ] ********************************************************************
  // *** [ 1. active range ]: aus url in state
  useEffect(() => {
    if (!isReady) return;

    const parsedDateFrom = parseDateParam(dateFrom);
    const parsedDateTo = parseDateParam(dateTo);

    if (!parsedDateFrom || !parsedDateTo) return;
    if (parsedDateFrom.getTime() > parsedDateTo.getTime()) return;

    setRangeStart(parsedDateFrom);
    setRangeEnd(parsedDateTo);
  }, [isReady, dateFrom, dateTo]);

  // *** [ 2. picker range ]
  useEffect(() => {
    if (!isDatePickerOpen) return;

    setPickerRange({ from: rangeStart, to: rangeEnd }); // Start active range
    setPickerVisibleMonth(rangeStart);
  }, [isDatePickerOpen, rangeStart, rangeEnd]);

  // *** [ GUARDS ] ************************************************************************
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
    if (!transactions.length) return null;

    const isFullMonthRange =
      currentStart.getDate() === 1 &&
      currentEnd.getTime() === endOfMonth(currentEnd).getTime();

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
    let candidateRange = isFullMonthRange
      ? {
          start: startOfMonth(
            new Date(
              currentStart.getFullYear(),
              currentStart.getMonth() + monthOffset,
              1
            )
          ),
          end: endOfMonth(
            new Date(
              currentEnd.getFullYear(),
              currentEnd.getMonth() + monthOffset,
              1
            )
          ),
        }
      : {
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
      candidateRange = isFullMonthRange
        ? {
            start: startOfMonth(
              new Date(
                candidateRange.start.getFullYear(),
                candidateRange.start.getMonth() + monthOffset,
                1
              )
            ),
            end: endOfMonth(
              new Date(
                candidateRange.end.getFullYear(),
                candidateRange.end.getMonth() + monthOffset,
                1
              )
            ),
          }
        : {
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
  const activeRangeLabel = `${formatDateLabel(rangeStart)} - ${formatDateLabel(rangeEnd)}`; // state

  // *** [default range]: für RangeButton
  const defaultRange = getDefaultRange();
  const isDefaultDateRange =
    rangeStart.getTime() === defaultRange.from.getTime() &&
    rangeEnd.getTime() === defaultRange.to.getTime();

  // *** [monatsübergreifende range]: für < > buttons in DateNav
  const isCrossMonthRange =
    rangeStart.getFullYear() !== rangeEnd.getFullYear() ||
    rangeStart.getMonth() !== rangeEnd.getMonth();

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

  const isPrevRangeDisabled = isCrossMonthRange || !prevValidRange;
  const isNextRangeDisabled = isCrossMonthRange || !nextValidRange;

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
  // *** [ chart ] *************************************************************************
  function toggleChart() {
    if (!hasEnoughChartData) return;
    setIsChartOpen((prevState) => !prevState);
  }

  // *** [ type ] **************************************************************************
  function toggleTypeFilter() {
    setTypeFilter((prevState) =>
      prevState === "Expense" ? "Income" : "Expense"
    );
  }

  // *** [ DateNav < > ] *******************************************************************
  function updateDateRange(startDate, endDate) {
    setRangeStart(startDate); // neue active range in state
    setRangeEnd(endDate);

    replace(
      {
        pathname: "/categories",
        query: {
          dateFrom: formatDateParam(startDate),
          dateTo: formatDateParam(endDate),
        },
      },
      undefined,
      { shallow: true }
    ); // neue active range in url (ohne remount)
  }

  function goToPrevRange() {
    if (isCrossMonthRange || !prevValidRange) return;
    updateDateRange(prevValidRange.start, prevValidRange.end);
  }

  function goToNextRange() {
    if (isCrossMonthRange || !nextValidRange) return;
    updateDateRange(nextValidRange.start, nextValidRange.end);
  }

  // *** [ DatePicker ] ********************************************************************
  function openPicker() {
    setIsDatePickerOpen(true);
  }

  function closePicker() {
    setIsDatePickerOpen(false);
  }

  function applyPickerRange() {
    if (!pickerRange?.from || !pickerRange?.to) return;
    updateDateRange(pickerRange.from, pickerRange.to);
    setIsDatePickerOpen(false);
  }

  function clearPickerRange() {
    const defaultRange = getDefaultRange();
    setPickerRange(defaultRange);
    setPickerVisibleMonth(defaultRange.from);
  }

  // ***************************************************************************************
  // ***************************************************************************************

  return (
    <>
      <ContentContainer>
        <h1>Categories</h1>

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

          <DateNav>
            <ArrowButton
              type="button"
              aria-label="Go to previous date range"
              disabled={isPrevRangeDisabled}
              onClick={goToPrevRange}
            >
              <PrevIcon className="prev" />
            </ArrowButton>

            <RangeButton
              type="button"
              aria-label="Change date range"
              onClick={openPicker}
              className={isDefaultDateRange ? "" : "active"}
            >
              {activeRangeLabel}
            </RangeButton>

            <ArrowButton
              type="button"
              aria-label="Go to next date range"
              disabled={isNextRangeDisabled}
              onClick={goToNextRange}
            >
              <NextIcon className="next" />
            </ArrowButton>
          </DateNav>

          <TypeButton
            type="button"
            aria-label="Toggle category type"
            onClick={toggleTypeFilter}
            $typeFilter={typeFilter}
          />
        </FilterSection>

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
              <p className="label">
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
                href={`/categories/${category._id}?from=/categories&dateFrom=${encodeURIComponent(formatDateParam(rangeStart))}&dateTo=${encodeURIComponent(formatDateParam(rangeEnd))}&navKey=${encodeURIComponent(navKey)}`} // "?from/categories": Herkunft für nach category-delete // "&dateFrom/To": active date range // "&navKey": ID-Reihenfolge (< > nav)
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
  max-width: 350px; // Breite DateNav, list + ChartSection
  margin: 0 auto; // content horizontal zentriert

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
`;

// ******************************************************************************
const FilterSection = styled.div`
  margin-bottom: 1.5rem;
  background-color: #232323;
  border-radius: 20px;
  padding: 10px 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);

  display: flex; // items nebeneinander
  justify-content: space-between; // verteilt
  align-items: center; // vertikal zentriert
`;

const ChartButton = styled.button`
  border: none;
  background: transparent;
  color: var(--button-background-color);
  line-height: 0; // unten bündiger
  margin-bottom: 1px; // bündig
  cursor: pointer;

  svg {
    width: 22px;
    height: 22px;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 1)); // ohne Zwischenräume
  }

  &:hover {
    transform: scale(1.07);
  }

  &.active {
    color: var(--button-active-color);
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

const DateNav = styled.div`
  display: flex; // buttons nebeneinander
  align-items: center; // vertikal zentriert
  gap: 0.4rem;
`;

const ArrowButton = styled.button`
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background-color: var(--button-background-color);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

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
  }

  &:disabled {
    opacity: 0.35;
    pointer-events: none;
  }
`;

const RangeButton = styled.button`
  border: none;
  border-radius: 20px;
  background-color: var(--button-background-color);
  color: var(--button-text-color);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 4px 8px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    background-color: var(--button-active-color);
    color: var(--button-active-text-color);
  }
`;

const TypeButton = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 1);

  background-color: ${({ $typeFilter }) =>
    $typeFilter === "Expense" ? "var(--expense-color)" : "var(--income-color)"};

  &:hover {
    transform: scale(1.07);
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
  width: fit-content;
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
`;

// ******************************************************************************

const StyledList = styled.ul`
  list-style-type: none;
`;

const ListItem = styled.li`
  background-color: var(--list-item-background);
  border-radius: 20px;
  margin-bottom: 0.5rem; // Abstand zw. ListItems
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);

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
