// Timezone utility for Pará (Belém) - UTC-3 (America/Belem)
// Pará uses Brasília Time (UTC-3) year-round (no DST).
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Get the current date/time in Brazil timezone (Brasília - UTC-3)
 * Uses Intl API for reliable timezone conversion
 */
export const getBrazilNorthDate = (): Date => {
  // Use Intl to get the current time in Brasília timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  );
};

/**
 * Get today's date string (YYYY-MM-DD) in Brazil timezone (Brasília)
 */
export const getBrazilNorthTodayString = (): string => {
  return new Date().toLocaleDateString('en-CA', { 
    timeZone: BRAZIL_TIMEZONE 
  });
};

/**
 * Get tomorrow's date string (YYYY-MM-DD) in Brazil timezone
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
 * Get current month-year string (YYYY-MM) in Brazil timezone
 */
export const getBrazilNorthMonthYear = (): string => {
  const today = getBrazilNorthTodayString();
  return today.substring(0, 7);
};

/**
 * Get the current month (0-indexed) in Brazil timezone
 */
export const getBrazilNorthMonth = (): number => {
  return getBrazilNorthDate().getMonth();
};

/**
 * Get the current day of month in Brazil timezone
 */
export const getBrazilNorthDayOfMonth = (): number => {
  return getBrazilNorthDate().getDate();
};

/**
 * Get the current year in Brazil timezone
 */
export const getBrazilNorthYear = (): number => {
  return getBrazilNorthDate().getFullYear();
};

/**
 * Get a Date object set to midnight in Brazil timezone
 * for comparison purposes
 */
export const getBrazilNorthMidnight = (): Date => {
  const date = getBrazilNorthDate();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Convert a date string to a Date object and normalize to midnight
 * for Brazil timezone comparison — constructs the same way as getBrazilNorthMidnight
 */
export const parseDateForBrazilNorth = (dateStr: string): Date => {
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
};

/**
 * Calculate days until an event from Brazil timezone perspective.
 * Both dates are built identically (local-midnight from calendar components)
 * so the diff is always exact.
 */
export const getDaysUntilEventBrazilNorth = (eventDateStr: string): number => {
  const todayStr = getBrazilNorthTodayString(); // "YYYY-MM-DD" in Brazil tz
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td, 0, 0, 0);

  const [ey, em, ed] = eventDateStr.slice(0, 10).split('-').map(Number);
  const eventDate = new Date(ey, em - 1, ed, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format the current Brazil North date for display (localized)
 */
export const formatBrazilNorthDateDisplay = (): string => {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Get current time string (HH:MM:SS) in Brazil timezone (Brasília - UTC-3)
 */
export const getBrazilNorthTimeString = (): string => {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};
