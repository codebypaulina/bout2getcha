/********************************************************************************
  date-filter für:  pages/transactions/index.js  +  pages/categories/index.js 
  - active date-filter range
  - range-template für < >
  - date picker state
  - session storage: abrufen + speichern
  - handlers: open + close picker, apply + clear picker range, update date-filter
*********************************************************************************/

import { useEffect, useState, useMemo, useRef } from "react";
import {
  parseDateString,
  getDefaultRange,
  buildTemplateFromRange,
  parseStoredTemplate,
  buildDateFilterForStorage,
} from "@/utils/dateFilter";

export default function useDateFilter(storageKey) {
  // *** [ default ]
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const defaultTemplate = useMemo(
    () => buildTemplateFromRange(defaultRange.from, defaultRange.to),
    [defaultRange]
  );

  // *** [ STATES ]
  const [dateFilter, setDateFilter] = useState(defaultRange);
  const [dateFilterTemplate, setDateFilterTemplate] = useState(defaultTemplate); // range-Vorlage für < >
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerRange, setPickerRange] = useState(defaultRange);
  const [pickerVisibleMonth, setPickerVisibleMonth] = useState(
    defaultRange.from
  );
  const skipNextWrite = useRef(true);

  // *** [ SYNC ] ******************************************************************
  // *** [ date filter: session storage abrufen ]
  useEffect(() => {
    skipNextWrite.current = true;

    function resetToDefaultRange() {
      setDateFilter(defaultRange);
      setDateFilterTemplate(defaultTemplate);
    }

    // storageKey: `u:${userId}:transactions:dateFilter` // `u:${userId}:categories:dateFilter`
    if (!storageKey) {
      resetToDefaultRange();
      return; // kein key: default
    }

    const storedDateFilter = sessionStorage.getItem(storageKey);
    if (!storedDateFilter) {
      resetToDefaultRange();
      return;
    } // key ohne Wert: default

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
        resetToDefaultRange();
        return;
      } // key mit ungültigem Wert: default

      setDateFilter({ from: storedFrom, to: storedTo });
      setDateFilterTemplate(
        parseStoredTemplate(parsedDateFilter, storedFrom, storedTo)
      ); // key vorhanden + gültig: in state
    } catch {
      sessionStorage.removeItem(storageKey);
      resetToDefaultRange();
    }
  }, [storageKey, defaultRange, defaultTemplate]);

  // *** [ date filter: session storage speichern ]
  useEffect(() => {
    if (!storageKey) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    const isDefaultRange =
      dateFilter.from.getTime() === defaultRange.from.getTime() &&
      dateFilter.to.getTime() === defaultRange.to.getTime();

    if (isDefaultRange) {
      sessionStorage.removeItem(storageKey);
      return;
    } // default range: nicht speichern

    sessionStorage.setItem(
      storageKey,
      JSON.stringify(buildDateFilterForStorage(dateFilter, dateFilterTemplate))
    ); // nicht default range: speichern
  }, [storageKey, defaultRange, dateFilter, dateFilterTemplate]);

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
