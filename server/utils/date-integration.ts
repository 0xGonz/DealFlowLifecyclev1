/**
 * Date Integration Utilities
 * 
 * Provides centralized utilities for handling date integration and synchronization 
 * between allocations, capital calls, and other time-sensitive components of the system.
 * 
 * These utilities ensure consistent date handling across the application, allowing
 * for proper integration of dates between related entities without hardcoding.
 */

import { StorageFactory } from '../storage-factory';
import { TIME_MS, DEFAULT_DURATIONS } from '../constants/time-constants';

/**
 * Get the appropriate reference date for a capital call based on allocation
 * 
 * This function ensures that capital calls properly use allocation dates for consistency
 * and prevents date mismatches between allocations and their capital calls.
 * 
 * @param allocationId - The ID of the fund allocation to get the reference date from
 * @param fallbackDate - Optional fallback date if allocation isn't found or has no date
 * @returns A Date object representing the reference date for the capital call
 */
export async function getAllocationReferenceDate(
  allocationId: number, 
  fallbackDate: Date = new Date()
): Promise<Date> {
  try {
    const allocation = await StorageFactory.storage.getFundAllocation(allocationId);
    
    if (allocation && allocation.allocationDate) {
      return new Date(allocation.allocationDate);
    }
    
    return fallbackDate;
  } catch (error) {
    console.error(`Error getting allocation reference date for allocation ${allocationId}:`, error);
    return fallbackDate;
  }
}

/**
 * Calculate a due date based on a reference date
 * 
 * @param referenceDate - The base date to calculate from
 * @param daysUntilDue - Number of days until due (defaults to system constant)
 * @returns A Date object representing the due date
 */
export function calculateDueDate(
  referenceDate: Date, 
  daysUntilDue: number = DEFAULT_DURATIONS.CAPITAL_CALL_DUE_DAYS
): Date {
  const dueDate = new Date(referenceDate);
  dueDate.setDate(dueDate.getDate() + daysUntilDue);
  return dueDate;
}

/**
 * Generate a sequence of dates based on a schedule type
 * 
 * @param baseDate - The starting date for the sequence
 * @param scheduleType - The type of schedule (monthly, quarterly, etc.)
 * @param count - The number of dates to generate
 * @returns An array of Date objects following the schedule
 */
export function generateScheduleDates(
  baseDate: Date,
  scheduleType: string,
  count: number
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(baseDate);
  
  // Determine the month interval based on schedule type
  let monthInterval = 1; // default to monthly
  
  if (scheduleType === 'quarterly') monthInterval = 3;
  if (scheduleType === 'biannual') monthInterval = 6;
  if (scheduleType === 'annual') monthInterval = 12;
  
  // Generate the dates
  for (let i = 0; i < count; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + (i * monthInterval));
    dates.push(currentDate);
  }
  
  return dates;
}
