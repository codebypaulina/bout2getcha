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

// date-object -> "YYYY-MM" (für: in url, an CategoryDetailsPage, aus url)
function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { isReady, query, replace } = router;
  const type = query.type; // von FormAddCategory für type-filter
  const month = query.month; // "YYYY-MM" für & von CategoryDetailsPage

  const [typeFilter, setTypeFilter] = useState("Expense");
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [activeMonthDate, setActiveMonthDate] = useState(() => new Date());

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

  // *** [ ACTIVE MONTH: aus URL ] *********************************************************
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

    setActiveMonthDate(new Date(parsedYear, parsedMonthIndex, 1)); // active month: 1. Tag von url-month
  }, [isReady, month]);

  // *** [ guards ] ************************************************************************
  if (errorCategories || errorTransactions) return <h3>Failed to load data</h3>;
  if (!categories || !transactions) return <h3>Loading ...</h3>;

  // *** [ ABGELEITETE DATEN ] *************************************************************
  // *** [ 1. months ] *********************************************************************
  // *** [active month]
  const activeYear = activeMonthDate.getFullYear();
  const activeMonth = activeMonthDate.getMonth();
  const activeMonthLabel = activeMonthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const activeMonthKey = getMonthKey(activeMonthDate); // in "YYYY-MM"

  // *** [filled months]: für MonthNav, um leere zu überspringen
  const monthsWithTx = [
    ...new Set(
      transactions.map((transaction) => getMonthKey(new Date(transaction.date)))
    ),
  ].sort(); // alle, zB ["2026-03", "2026-04", ...]

  const prevMonthsWithTx = monthsWithTx.filter(
    (monthKey) => monthKey < activeMonthKey
  ); // alle VOR active month
  const nextMonthsWithTx = monthsWithTx.filter(
    (monthKey) => monthKey > activeMonthKey
  ); // alle NACH active month

  const prevMonthKey =
    prevMonthsWithTx.length > 0
      ? prevMonthsWithTx[prevMonthsWithTx.length - 1]
      : null; // letzter früherer

  const nextMonthKey = nextMonthsWithTx.length > 0 ? nextMonthsWithTx[0] : null; // erster späterer

  const isPrevMonthDisabled = !prevMonthKey; // für < > buttons (davor/danach kein filled month: disabled)
  const isNextMonthDisabled = !nextMonthKey;

  // *** [ 2. transactions ]: nur aus active month *****************************************
  const activeMonthTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);

    return (
      transactionDate.getFullYear() === activeYear &&
      transactionDate.getMonth() === activeMonth
    );
  });

  // *** [ 3. categories ] *****************************************************************
  // *** [mit totals]
  const categoriesWithTotals = categories.map((category) => {
    const totalAmount = activeMonthTransactions
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

  // *** [ 4. ID-Reihenfolge category-list ] ***********************************************
  // *** [snapshot]
  const navKey = `u:${userId}:catNav:/categories:${typeFilter}`; // sessionStorage-key
  const navIds = sortedActiveCategories.map((category) => category._id); // ID-array

  // *** [snapshot]: in sessionStorage speichern (für < > nav in CategoryDetailsPage)
  function storeCatNavSnapshot() {
    if (!userId) return;
    sessionStorage.setItem(navKey, JSON.stringify(navIds));
  }

  // *** [ 5. chart ] **********************************************************************
  // *** [chart-data]
  const chartData = sortedActiveCategories
    .filter((category) => category.totalAmount > 0)
    .map((category) => ({
      id: category._id,
      label: category.name,
      value: category.totalAmount,
      color: category.color,
    }));

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

  // ***************************************************************************************

  function toggleChart() {
    setIsChartOpen((prevState) => !prevState);
  }

  function toggleTypeFilter() {
    setTypeFilter((prevState) =>
      prevState === "Expense" ? "Income" : "Expense"
    );
  }

  // *** [ MonthNav < > ]
  function goToMonth(monthKey) {
    if (!monthKey) return;

    const [yearString, monthString] = monthKey.split("-");
    const parsedYear = Number(yearString);
    const parsedMonthIndex = Number(monthString) - 1;
    const targetMonthDate = new Date(parsedYear, parsedMonthIndex, 1);

    setActiveMonthDate(targetMonthDate);
    replace(`/categories?month=${monthKey}`, undefined, {
      shallow: true,
    }); // url aktualisieren mit neuem active month ohne remount
  }

  function goToPrevMonth() {
    goToMonth(prevMonthKey);
  }
  function goToNextMonth() {
    goToMonth(nextMonthKey);
  }

  return (
    <>
      <ContentContainer>
        <h1>Categories</h1>

        <MonthNav>
          <NavButton
            type="button"
            aria-label="Previous month"
            disabled={isPrevMonthDisabled}
            onClick={goToPrevMonth}
          >
            <PrevIcon className="prev" />
          </NavButton>

          <p>{activeMonthLabel}</p>

          <NavButton
            type="button"
            aria-label="Next month"
            disabled={isNextMonthDisabled}
            onClick={goToNextMonth}
          >
            <NextIcon className="next" />
          </NavButton>
        </MonthNav>

        {isChartOpen && chartData.length > 0 && (
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

        <FilterSection>
          <IconWrapper
            onClick={toggleChart}
            className={isChartOpen ? "active" : ""}
          >
            <ChartIcon />
          </IconWrapper>

          <button onClick={toggleTypeFilter}>
            {typeFilter === "Expense" ? "Expenses" : "Incomes"}
          </button>
        </FilterSection>

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
  display: flex; // IconWrapper + button nebeneinander
  justify-content: space-between; // icon links, button rechts

  max-width: 285px; // schmaler als list
  margin: 0 auto 1.5rem auto; // Abstand list, horizontal zentriert

  button {
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

const IconWrapper = styled.div`
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
