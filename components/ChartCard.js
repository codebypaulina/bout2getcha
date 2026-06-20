import dynamic from "next/dynamic";
import styled from "styled-components";
import { formatCurrency } from "@/utils/helpers";

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
    <Card aria-label="Chart">
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
            <TooltipBox>
              <span className="percentage">
                {getChartPercentage(datum.value)} %
              </span>
              <span className="category">{datum.label}</span>
            </TooltipBox>
          )}
          // für category- + segment-hover:
          activeId={activeId}
          onMouseEnter={(datum) => onSliceEnter?.(datum.id)}
          onMouseLeave={() => onSliceLeave?.()}
        />
      </PieWrapper>

      {!hideSummary && summaryLabel !== null && summaryValue !== null && (
        <SummaryRow $isNegative={isNegativeValue}>
          <p>{summaryLabel}</p>

          <p className="value">{formatCurrency(summaryValue)} €</p>
        </SummaryRow>
      )}
    </Card>
  );
}

const Card = styled.section`
  display: flex;
  flex-direction: column; // PieWrapper + SummaryRow untereinander
  align-items: center; // horizontal zentriert
  gap: 0.85rem;

  background-color: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: 1.2rem 0 1rem 0;
  margin: 0 auto 1.5rem auto; // Abstand list + horizontal zentriert
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);
`;

const PieWrapper = styled.div`
  height: 155px;
  width: 155px;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.9)); // ohne Zwischenräume
`;

const TooltipBox = styled.div`
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 3px 8px 8px 8px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);

  display: flex;
  flex-direction: column;
  align-items: center;

  .percentage {
    font-size: 1rem;
    font-weight: bold;
  }

  .category {
    font-size: 0.85rem;
  }
`;

const SummaryRow = styled.div`
  display: flex;
  flex-direction: column; // untereinander
  align-items: center; // horizontal
  gap: 0.25rem;

  p.value {
    font-weight: bold;
    color: ${({ $isNegative }) =>
      $isNegative ? "var(--color-expense)" : "inherit"};
  }
`;
