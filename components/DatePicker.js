import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styled from "styled-components";

import NavArrowButton from "@/components/NavArrowButton";
import { Overlay, fixedCenteredStyles } from "./modal.styles";
import useEscapeClose from "@/hooks/useEscapeClose";

// https://daypicker.dev/docs/styling
// https://github.com/gpbl/react-day-picker/blob/main/src/style.css

export default function DatePicker({
  pickerRange,
  setPickerRange,
  pickerVisibleMonth,
  setPickerVisibleMonth,
  applyPickerRange,
  clearPickerRange,
  closePicker,
}) {
  useEscapeClose(true, closePicker); // ESC-listener

  // ****************************************************************

  return (
    <>
      <Overlay onClick={closePicker} />

      <Wrapper>
        <DayPicker
          mode="range"
          navLayout="around"
          fixedWeeks
          showOutsideDays
          weekStartsOn={1}
          month={pickerVisibleMonth}
          onMonthChange={setPickerVisibleMonth}
          selected={pickerRange}
          onSelect={setPickerRange}
          components={{
            PreviousMonthButton: (props) => (
              <NavArrowButton
                {...props}
                direction="prev"
                buttonSize={24} // weil in library height=24
                iconSize={11}
              />
            ),
            NextMonthButton: (props) => (
              <NavArrowButton
                {...props}
                direction="next"
                buttonSize={24}
                iconSize={11}
              />
            ),
          }}
        />

        <Actions>
          <button
            type="button"
            aria-label="Apply date range"
            onClick={applyPickerRange}
          >
            Apply
          </button>

          <button
            type="button"
            aria-label="Clear date range"
            onClick={clearPickerRange}
          >
            Clear
          </button>
        </Actions>
      </Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  ${fixedCenteredStyles}; // über overlay + zentriert

  background-color: var(--color-background-page);
  border-radius: var(--radius-lg);
  padding: 1.75rem 1.25rem 1.85rem 1.25rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  display: flex;
  flex-direction: column;
  align-items: center;

  // *** [ DayPicker ] ***********************************************
  .rdp-root {
    --rdp-nav-height: 24px; // Höhe <  > buttons
    --rdp-range_middle-background-color: var(--color-button-active-bg); // range
  }

  // *** [ Position <  > buttons ] ***********************************
  .rdp-root[data-nav-layout="around"] .rdp-button_previous {
    inset-inline-start: 0.6rem;
  }
  .rdp-root[data-nav-layout="around"] .rdp-button_next {
    inset-inline-end: 0.6rem;
  }

  // *** [ Monat ] ***************************************************
  // *** [ container ]
  .rdp-month {
    display: flex;
    flex-direction: column;
    align-items: center; // label horizontal zentriert
  }

  // *** [ label ]
  .rdp-month_caption {
    color: var(--color-text-primary);
    font-size: 1.3rem;
    width: 160px;
  }

  // *** [ Mo-So ] ***************************************************
  .rdp-weekday {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: 1.5rem 0 0.5rem 0; // Abstand Monat + Zahlen
  }

  // *** [ Zahlen ] **************************************************
  .rdp-day {
    width: 30px;
    height: 30px;
  }

  .rdp-day_button {
    width: 40px;
    height: 40px;
    border: none;
    color: var(--color-text-primary);
    font-size: 1rem;

    &:hover {
      transform: scale(1.07);
    }
  }

  // *** [ heute ]
  .rdp-today .rdp-day_button {
    border: 2px solid var(--color-text-secondary);
  }

  // *** [ außerhalb Monat ]
  .rdp-outside .rdp-day_button {
    opacity: 0.35;
  }

  // *** [ ausgewählte range ] ***************************************
  .rdp-selected .rdp-day_button {
    color: var(--color-button-active-text);
  }

  // *** [ 1. & letzter Tag ]
  .rdp-range_start .rdp-day_button,
  .rdp-range_end .rdp-day_button {
    background-color: var(--color-button-active-bg);
  }

  // *** [ heute ]
  .rdp-today.rdp-selected .rdp-day_button {
    border-radius: var(--radius-full); // sonst eckig
    border: 2px solid var(--color-button-active-text);
  }

  // *** [ außerhalb Monat ]
  .rdp-outside.rdp-selected .rdp-day_button,
  .rdp-outside.rdp-range_start .rdp-day_button,
  .rdp-outside.rdp-range_end .rdp-day_button {
    opacity: 1;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem; // Abstand Kalender

  button {
    width: 80px;
    height: 35px;
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--color-button-bg);
    color: var(--color-button-text);
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--color-text-primary);
    }
  }
`;
