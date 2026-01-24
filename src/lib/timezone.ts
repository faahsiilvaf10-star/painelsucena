// Timezone utility for Brazil Northern Region (Manaus - UTC-4)
const BRAZIL_NORTH_OFFSET = -4; // UTC-4 for Manaus timezone

/**
 * Get the current date/time in Brazil Northern Region timezone (Manaus - UTC-4)
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
  return date.toISOString().split("T")[0];
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
