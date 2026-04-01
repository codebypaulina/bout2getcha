/********************************************************************************
  date-filter für:  pages/transactions/index.js  +  pages/categories/index.js 
  - active date-filter range
  - range-template für < >
  - date picker state
  - session storage: abrufen + speichern
  - handlers: open + close picker, apply + clear picker range, update date-filter
*********************************************************************************/

import { useEffect, useState } from "react";
import {
  parseDateString,
  getDefaultRange,
  buildTemplateFromRange,
  parseStoredTemplate,
  buildDateFilterForStorage,
} from "@/utils/dateFilter";

export default function useDateFilter(storageKey) {
  const [dateFilter, setDateFilter] = useState(() => getDefaultRange());
  const [dateFilterTemplate, setDateFilterTemplate] = useState(() =>
    buildTemplateFromRange(getDefaultRange().from, getDefaultRange().to)
  ); // range-Vorlage für < >
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerRange, setPickerRange] = useState(() => getDefaultRange());
  const [pickerVisibleMonth, setPickerVisibleMonth] = useState(
    () => getDefaultRange().from
  );

  // *** [ SYNC ] ******************************************************************
  // *** [ date filter: session storage abrufen ]
  useEffect(() => {
    if (!storageKey) return; // `u:${userId}:transactions:dateFilter` // `u:${userId}:categories:dateFilter`

    const storedDateFilter = sessionStorage.getItem(storageKey);
    if (!storedDateFilter) return;

    try {
      const parsedDateFilter = JSON.parse(storedDateFilter);
      const storedFrom = parseDateString(parsedDateFilter?.from);
      const storedTo = parseDateString(parsedDateFilter?.to);

      if (
        !storedFrom ||
        !storedTo ||
        storedFrom.getTime() > storedTo.getTime()
      ) {
        sessionStorage.removeItem(storageKey);
        return;
      }

      setDateFilter({ from: storedFrom, to: storedTo });
      setDateFilterTemplate(
        parseStoredTemplate(parsedDateFilter, storedFrom, storedTo)
      );
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // *** [ date filter: session storage speichern ]: wenn nicht default range
  useEffect(() => {
    if (!storageKey) return;

    const defaultRange = getDefaultRange();
    const isDefaultRange =
      dateFilter.from.getTime() === defaultRange.from.getTime() &&
      dateFilter.to.getTime() === defaultRange.to.getTime();

    if (isDefaultRange) {
      sessionStorage.removeItem(storageKey);
      return;
    }

    sessionStorage.setItem(
      storageKey,
      JSON.stringify(buildDateFilterForStorage(dateFilter, dateFilterTemplate))
    );
  }, [storageKey, dateFilter, dateFilterTemplate]);

  // *** [ picker range: aus date filter ]
  useEffect(() => {
    if (!isDatePickerOpen) return;

    setPickerRange(dateFilter);
    setPickerVisibleMonth(dateFilter.from);
  }, [isDatePickerOpen, dateFilter]);

  // *** [ HANDLERS ] **************************************************************
  // *** [ DateNav < > ] ***********************************************************
  function updateDateFilter(
    startDate,
    endDate,
    nextTemplate = dateFilterTemplate
  ) {
    setDateFilter({ from: startDate, to: endDate });
    setDateFilterTemplate(nextTemplate);
  }

  // *** [ DatePicker ] ************************************************************
  function openPicker() {
    setIsDatePickerOpen(true);
  }

  function closePicker() {
    setIsDatePickerOpen(false);
  }

  function applyPickerRange() {
    if (!pickerRange?.from || !pickerRange?.to) return;

    const nextRangeTemplate = buildTemplateFromRange(
      pickerRange.from,
      pickerRange.to
    );

    updateDateFilter(pickerRange.from, pickerRange.to, nextRangeTemplate);
    setIsDatePickerOpen(false);
  }

  function clearPickerRange() {
    const defaultRange = getDefaultRange();
    setPickerRange(defaultRange);
    setPickerVisibleMonth(defaultRange.from);
  }

  return {
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
  };
}
