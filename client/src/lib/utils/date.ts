import { format, formatDistanceToNow, formatRelative, isToday, isYesterday } from "date-fns";

/**
 * Format a date into a human-readable format
 */
export function formatDate(date: Date | string | number, formatStr = "PP"): string {
  const d = new Date(date);
  return format(d, formatStr);
}

/**
 * Format a date into a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a date as today, yesterday, or the full date
 */
export function formatSmartDate(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isToday(d)) {
    return `Today at ${format(d, "h:mm a")}`;
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, "h:mm a")}`;
  }
  
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format a date relative to a base date
 */
export function formatRelativeDate(date: Date | string | number, baseDate: Date = new Date()): string {
  const d = new Date(date);
  return formatRelative(d, baseDate);
}

/**
 * Get a friendly time range description
 */
export function getDateRangeLabel(range: string): string {
  switch (range) {
    case "30days":
      return "Last 30 Days";
    case "quarter":
      return "Last Quarter";
    case "ytd":
      return "Year to Date";
    case "all":
      return "All Time";
    default:
      return "Custom Range";
  }
}
