import { format, parseISO, isToday, isSameDay, addDays, subDays } from "date-fns"

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateKey(dateKey: string): Date {
  return parseISO(dateKey)
}

/**
 * Get today's date key
 */
export function getTodayKey(): string {
  return formatDateKey(new Date())
}

/**
 * Check if a date key is today
 */
export function isDateKeyToday(dateKey: string): boolean {
  return isToday(parseDateKey(dateKey))
}

/**
 * Check if two date keys are the same day
 */
export function isSameDateKey(dateKey1: string, dateKey2: string): boolean {
  return isSameDay(parseDateKey(dateKey1), parseDateKey(dateKey2))
}

/**
 * Get next day date key
 */
export function getNextDateKey(dateKey: string): string {
  return formatDateKey(addDays(parseDateKey(dateKey), 1))
}

/**
 * Get previous day date key
 */
export function getPreviousDateKey(dateKey: string): string {
  return formatDateKey(subDays(parseDateKey(dateKey), 1))
}

/**
 * Format date for display (e.g., "Today", "January 15, 2024")
 */
export function formatDateForDisplay(dateKey: string): string {
  const date = parseDateKey(dateKey)

  if (isToday(date)) {
    return "Today"
  }

  return format(date, "MMMM d, yyyy")
}

/**
 * Format date for short display (e.g., "Today", "Jan 15")
 */
export function formatDateShort(dateKey: string): string {
  const date = parseDateKey(dateKey)

  if (isToday(date)) {
    return "Today"
  }

  return format(date, "MMM d")
}