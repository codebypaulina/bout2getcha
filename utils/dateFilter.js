/********************************************************************************
  helpers für date-filter in:  pages/transactions/index.js  +  pages/categories/index.js 
  [date]:
  - date-string <-> date-object
  - date-object -> label active date range
  [range]:
  - voller Monat
  - default range
  - range-Grenzen
  - erste gültige vorherige / nächste range
  [template]:
  - range <-> template
  - template <-> storage-object
*********************************************************************************/

// *** [ date ] ******************************************************************
// *** [string -> date object]: für dateFilter.from + dateFilter.to aus storage / url
export function parseDateString(value) {
  if (typeof value !== "string") return null;

  // "2026-03-01"
  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  const day = Number(dayString);

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

// *** [date object -> string]: für dateFilter.from + dateFilter.to in storage / url
export function formatDateString(date) {
  // new Date(2026, 2, 1)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // "2026-03-01"
}

// *** [date object -> label string]: für dateFilterLabel
export function formatDateLabel(date) {
  // new Date(2026, 2, 1)
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }); // 01.03.2026
}

// *** [ range ] *****************************************************************
// *** [1. Tag des Monats]
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1); // 17.03.2026 -> 01.03.2026
}

// *** [letzter Tag des Monats]
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0); // 0. Tag des Folgemonats
  // new Date(2026, 2, 17) -> 17.03.2026
  // new Date(2026, 3, 0)  -> 31.03.2026
  // new Date(2026, 3, 1)  -> 01.04.2026
}

// *** [default range]: aktueller voller Monat
export function getDefaultRange() {
  const today = new Date();
  return {
    from: startOfMonth(today),
    to: endOfMonth(today),
  };
}

// *** [range-Tagesgrenzen]
export function getRangeBounds(startDate, endDate) {
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

// *** [range = voller Monat?]
function isFullMonthRange(startDate, endDate) {
  return (
    startDate.getTime() === startOfMonth(startDate).getTime() &&
    endDate.getTime() === endOfMonth(endDate).getTime()
  );
}

// *** [range = gültig?]: mind. 1 transaction in range
function isValidRange(transactions, startDate, endDate) {
  const { startTime, endTime } = getRangeBounds(startDate, endDate);

  return transactions.some((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    return transactionTime >= startTime && transactionTime <= endTime;
  });
}

// *** [erste gültige vorherige / nächste range]
export function findClosestValidRange(
  transactions,
  currentStart,
  monthOffset,
  minTxDate,
  maxTxDate,
  rangeTemplate
) {
  // Grenzen
  const minTime = getRangeBounds(
    startOfMonth(minTxDate),
    endOfMonth(minTxDate)
  ).startTime; // Monat ältester tx
  const maxTime = getRangeBounds(
    startOfMonth(maxTxDate),
    endOfMonth(maxTxDate)
  ).endTime; // Monat neuster tx

  let step = 1; // +/- 1 Monat

  while (true) {
    const candidateMonth = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth() + monthOffset * step
    );

    // zu prüfende range
    const candidateRange = buildRangeFromTemplate(
      candidateMonth.getFullYear(),
      candidateMonth.getMonth(),
      rangeTemplate
    );

    const { startTime, endTime } = getRangeBounds(
      candidateRange.start, // Beginn zu prüfende range
      candidateRange.end // Ende zu prüfende range
    );

    // Abbruch: zu prüfende range komplett außerhalb Grenzen
    if (endTime < minTime || startTime > maxTime) {
      return null; // button disabled
    }

    // Treffer: erste gültige range
    if (isValidRange(transactions, candidateRange.start, candidateRange.end)) {
      return candidateRange;
    }

    // kein Treffer: weiter +/- 1 Monat
    step += 1;
  }
}

// *** [ template ] **************************************************************
// *** [active range -> template]
export function buildTemplateFromRange(startDate, endDate) {
  if (isFullMonthRange(startDate, endDate)) {
    return { mode: "month" };
  } // voller Monat: templ ohne from + to day

  return {
    mode: "custom",
    fromDay: startDate.getDate(),
    toDay: endDate.getDate(),
  }; // kein voller Monat: templ mit from + to day
}

// *** [template -> range prev/next month]
export function buildRangeFromTemplate(year, monthIndex, rangeTemplate) {
  if (rangeTemplate.mode === "month") {
    return {
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 0),
    };
  } // voller Monat

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDay = Math.min(rangeTemplate.fromDay, lastDayOfMonth);
  const endDay = Math.min(rangeTemplate.toDay, lastDayOfMonth);

  return {
    start: new Date(year, monthIndex, startDay),
    end: new Date(year, monthIndex, endDay),
  }; // kein voller Monat
}

// *** [storage-object -> template]: für templateFromDay + templateToDay aus storage
export function parseStoredTemplate(
  storedDateFilter,
  fallbackFrom,
  fallbackTo
) {
  const storedTemplateFromDay = Number(storedDateFilter?.templateFromDay);
  const storedTemplateToDay = Number(storedDateFilter?.templateToDay);

  if (
    Number.isInteger(storedTemplateFromDay) &&
    Number.isInteger(storedTemplateToDay) &&
    storedTemplateFromDay >= 1 &&
    storedTemplateFromDay <= 31 &&
    storedTemplateToDay >= storedTemplateFromDay &&
    storedTemplateToDay <= 31
  ) {
    return {
      mode: "custom",
      fromDay: storedTemplateFromDay,
      toDay: storedTemplateToDay,
    };
  } // in storage

  return buildTemplateFromRange(fallbackFrom, fallbackTo); // nicht in storage: from + to von storedDateFilter
}

// *** [date filter + template -> storage-object]: für dateFilter in storage
export function buildDateFilterForStorage(dateFilter, dateFilterTemplate) {
  const storedDateFilter = {
    from: formatDateString(dateFilter.from),
    to: formatDateString(dateFilter.to),
  }; // voller Monat: nur from + to

  if (dateFilterTemplate.mode === "custom") {
    storedDateFilter.templateFromDay = dateFilterTemplate.fromDay;
    storedDateFilter.templateToDay = dateFilterTemplate.toDay;
  } // kein voller Monat: mit templ from + to day

  return storedDateFilter;
}
