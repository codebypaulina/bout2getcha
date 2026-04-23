import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styled from "styled-components";

import PrevIcon from "@/public/icons/previous.svg";
import NextIcon from "@/public/icons/next.svg";
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
              <NavButton {...props} type="button">
                <PrevIcon className="prev" />
              </NavButton>
            ),
            NextMonthButton: (props) => (
              <NavButton {...props} type="button">
                <NextIcon className="next" />
              </NavButton>
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

  background-color: var(--background-color);
  border-radius: 30px;
  padding: 1.75rem 1.25rem 1.85rem 1.25rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 1);

  display: flex;
  flex-direction: column;
  align-items: center;

  // *** [ DayPicker ] ***********************************************
  .rdp-root {
    --rdp-nav-height: 24px; // Höhe <  > buttons
    --rdp-range_middle-background-color: var(--button-active-color); // range
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
    color: var(--primary-text-color);
    font-size: 1.3rem;
    width: 160px;
  }

  // *** [ Mo-So ] ***************************************************
  .rdp-weekday {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-text-color);
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
    color: var(--primary-text-color);
    font-size: 1rem;

    &:hover {
      transform: scale(1.07);
    }
  }

  // *** [ heute ]
  .rdp-today .rdp-day_button {
    border: 2px solid var(--secondary-text-color);
  }

  // *** [ außerhalb Monat ]
  .rdp-outside .rdp-day_button {
    opacity: 0.35;
  }

  // *** [ ausgewählte range ] ***************************************
  .rdp-selected .rdp-day_button {
    color: var(--button-active-text-color);
  }

  // *** [ 1. & letzter Tag ]
  .rdp-range_start .rdp-day_button,
  .rdp-range_end .rdp-day_button {
    background-color: var(--button-active-color);
  }

  // *** [ heute ]
  .rdp-today.rdp-selected .rdp-day_button {
    border-radius: 50%; // sonst eckig
    border: 2px solid var(--button-active-text-color);
  }

  // *** [ außerhalb Monat ]
  .rdp-outside.rdp-selected .rdp-day_button,
  .rdp-outside.rdp-range_start .rdp-day_button,
  .rdp-outside.rdp-range_end .rdp-day_button {
    opacity: 1;
  }
`;

const NavButton = styled.button`
  width: 25px;
  height: 25px;
  border: none;
  border-radius: 50%;
  background-color: var(--button-background-color);
  cursor: pointer;
  box-shadow: 0 0 15px rgba(0, 0, 0, 1);

  svg {
    height: 10px;
    width: 10px;
    stroke: var(--button-text-color);
  }

  &:hover {
    transform: scale(1.07);

    svg {
      stroke: var(--primary-text-color);
    }
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
    border-radius: 30px;
    background-color: var(--button-background-color);
    color: var(--button-text-color);
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(0, 0, 0, 1);

    &:hover {
      transform: scale(1.05);
      color: var(--primary-text-color);
    }
  }
`;
