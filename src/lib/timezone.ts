// Timezone utility for Pará (Belém) - UTC-3 (America/Belem)
// Pará uses Brasília Time (UTC-3) year-round (no DST).
const BRAZIL_NORTH_OFFSET = -3;

/**
 * Get the current date/time in Brazil Northern Region timezone (Pará/Amazônia - UTC-4)
 */
export const getBrazilNorthDate = (): Date => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + BRAZIL_NORTH_OFFSET * 3600000);
};

/**
 * Get today's date string (YYYY-MM-DD) in Brazil Northern Region timezone
 */
export const getBrazilNorthTodayString = (): string => {
  const date = getBrazilNorthDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get tomorrow's date string (YYYY-MM-DD) in Brazil Northern Region timezone
 */
export const getBrazilNorthTomorrowString = (): string => {
  const date = getBrazilNorthDate();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get current month-year string (YYYY-MM) in Brazil Northern Region timezone
 */
export const getBrazilNorthMonthYear = (): string => {
  const date = getBrazilNorthDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Get the current month (0-indexed) in Brazil Northern Region timezone
 */
export const getBrazilNorthMonth = (): number => {
  return getBrazilNorthDate().getMonth();
};

/**
 * Get the current day of month in Brazil Northern Region timezone
 */
export const getBrazilNorthDayOfMonth = (): number => {
  return getBrazilNorthDate().getDate();
};

/**
 * Get the current year in Brazil Northern Region timezone
 */
export const getBrazilNorthYear = (): number => {
  return getBrazilNorthDate().getFullYear();
};

/**
 * Get a Date object set to midnight in Brazil Northern Region timezone
 * for comparison purposes
 */
export const getBrazilNorthMidnight = (): Date => {
  const date = getBrazilNorthDate();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Convert a date string to a Date object and normalize to midnight
 * for Brazil Northern Region comparison
 */
export const parseDateForBrazilNorth = (dateStr: string): Date => {
  const date = new Date(dateStr + "T00:00:00");
  return date;
};

/**
 * Calculate days until an event from Brazil Northern Region perspective
 */
export const getDaysUntilEventBrazilNorth = (eventDateStr: string): number => {
  const today = getBrazilNorthMidnight();
  const eventDate = parseDateForBrazilNorth(eventDateStr);
  
  const diffTime = eventDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format the current Brazil North date for display (localized)
 */
export const formatBrazilNorthDateDisplay = (): string => {
  const date = getBrazilNorthDate();
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
