import dynamic from "next/dynamic";
import styled from "styled-components";

// dynamisch, sonst ES Module error
const ResponsivePie = dynamic(
  () => import("@nivo/pie").then((mod) => mod.ResponsivePie),
  { ssr: false }
);

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} // für geringere opacity

export default function ChartCard({
  data,
  getChartPercentage,
  summaryLabel,
  summaryValue,
  isNegativeValue, // für TransactionsPage
  hideSummary, // für HomePage

  // für pie + list (hover):
  activeId,
  onSliceEnter,
  onSliceLeave,
}) {
  const displayData =
    activeId === null
      ? data
      : data.map((segment) => ({
          ...segment,
          color:
            segment.id === activeId
              ? segment.color // active segment: color normal
              : hexToRgba(segment.color, 0.25), // alle anderen: geringere opacity
        }));

  return (
    <Card>
      <PieWrapper>
        <ResponsivePie
          data={displayData}
          colors={{ datum: "data.color" }} // category-color / type-color
          innerRadius={0.5} // 50 % ausgeschnitten
          startAngle={0} // Start: oben auf 12 Uhr
          endAngle={-360} // Ende: volle Runde gegen Uhrzeigersinn
          padAngle={2} // Abstand zw Segmenten
          cornerRadius={3} // rundere Segment-Ecken
          arcLinkLabelsSkipAngle={360} // ausgeblendete Linien
          animate={false} // Segmente springen nicht
          enableArcLabels={false} // keine Zahlen im Segment
          tooltip={({ datum }) => (
            <div>
              {datum.label}:{" "}
              <strong>{getChartPercentage(datum.value)} %</strong>
            </div>
          )}
          // für category- + segment-hover:
          activeId={activeId}
          onMouseEnter={(datum) => onSliceEnter?.(datum.id)}
          onMouseLeave={() => onSliceLeave?.()}
        />
      </PieWrapper>

      {!hideSummary && summaryLabel !== null && summaryValue !== null && (
        <SummaryRow>
          <SummaryLabel>{summaryLabel}</SummaryLabel>

          <SummaryValue $isNegative={isNegativeValue}>
            {summaryValue.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </SummaryValue>
        </SummaryRow>
      )}
    </Card>
  );
}

const Card = styled.div`
  display: flex;
  flex-direction: column; // PieWrapper + SummaryRow untereinander
  align-items: center; // horizontal zentriert
  gap: 0.85rem;

  background-color: #232323;
  border-radius: 30px; // wie FilterBar
  max-width: 350px; // wie FilterBar + list
  padding: 1.2rem;
  margin: 0 auto 1.5rem auto; // Abstand list + horizontal zentriert
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);
`;

const PieWrapper = styled.div`
  height: 155px;
  width: 155px;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Zwischenräume
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: 85px 80px;
`;

const SummaryLabel = styled.p`
  width: 85px;
`;

const SummaryValue = styled.p`
  width: 80px;
  text-align: right;
  font-weight: bold;
  color: ${({ $isNegative }) =>
    $isNegative ? "var(--expense-color)" : "inherit"};
`;
