const timeOf = (dateTime: string): string => dateTime.slice(11, 16);

/** Formats two local date-times as `HH:mm - HH:mm`. */
export function formatTimeRange(start: string, end: string): string {
  return `${timeOf(start)} - ${timeOf(end)}`;
}
