import useSWR from "swr";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import styled from "styled-components";
import Navbar from "@/components/Navbar";
import ChartIcon from "@/public/icons/chart.svg";

// hier muss dynamischer Import, sonst ES Module error (auch bei aktuellster next.js-Version)
const ResponsivePie = dynamic(
  () => import("@nivo/pie").then((mod) => mod.ResponsivePie),
  { ssr: false }
);

export default function CategoriesPage() {
  const router = useRouter();
  const { isReady, query, replace } = router;
  const type = query.type; // von FormAddCategory für type-filter

  // *** [ states ]
  const [typeFilter, setTypeFilter] = useState("Expense");
  const [isChartOpen, setIsChartOpen] = useState(false);

  // *** [ SESSION STORAGE ] ***************************************************************
  // *** [ 1. chart-state ] ****************************************************************
  // *** [abrufen]
  useEffect(() => {
    const storedChartState = sessionStorage.getItem("categories:isChartOpen");
    if (storedChartState) setIsChartOpen(true);
  }, []);

  // *** [speichern]: wenn state = true
  useEffect(() => {
    if (isChartOpen) {
      sessionStorage.setItem("categories:isChartOpen", "true");
    } else {
      sessionStorage.removeItem("categories:isChartOpen");
    }
  }, [isChartOpen]);

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
    if (type === "Income" || type === "Expense") return; // type in url: abbrechen, nicht aus storage

    const storedTypeFilter = sessionStorage.getItem("categories:typeFilter");
    if (storedTypeFilter === "Income") {
      setTypeFilter("Income"); // income in storage: in filter
    }
  }, [isReady, type]);

  // *** [speichern]: nur wenn income
  useEffect(() => {
    if (typeFilter === "Income") {
      sessionStorage.setItem("categories:typeFilter", "Income");
    } else {
      sessionStorage.removeItem("categories:typeFilter");
    }
  }, [typeFilter]);

  // ***************************************************************************************
  // *** [ fetch ]
  const { data: categories, error } = useSWR("/api/categories");

  // *** [ guards ]
  if (error) return <h3>Failed to load categories</h3>;
  if (!categories) return <h3>Loading ...</h3>;

  // *** [ ABGELEITETE DATEN ] *************************************************************
  // *** [ 1. categories ] filtern + sortieren *********************************************
  const sortedActiveCategories = [...categories]
    .filter((category) => category.type === typeFilter) // nur aktiver type
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) {
        return b.totalAmount - a.totalAmount; // Betrag ungleich: total amount absteigend
      }
      return a.name.localeCompare(b.name, "de-DE"); // Betrag gleich: A-Z
    });

  // *** [ 2. ID-Reihenfolge category-list ] ***********************************************
  // *** [snapshot]
  const navKey = `catNav:/categories:${typeFilter}`; // sessionStorage-key
  const navIds = sortedActiveCategories.map((category) => category._id); // ID-array

  // *** [snapshot]: in sessionStorage speichern (für < > nav in CategoryDetailsPage)
  function storeCatNavSnapshot() {
    sessionStorage.setItem(navKey, JSON.stringify(navIds));
  }

  // *** [ 3. chart ] **********************************************************************
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

  return (
    <>
      <ContentContainer>
        <h1>Categories</h1>

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
                href={`/categories/${category._id}?from=/categories&navKey=${encodeURIComponent(navKey)}`} // "?from/categories": Herkunft = CategoriesPage (nach category-delete) // "&navKey=...": ID-Reihenfolge (< > nav)
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
