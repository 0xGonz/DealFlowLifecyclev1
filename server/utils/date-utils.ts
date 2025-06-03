/**
 * Enhanced Date Utilities for Capital Calls
 * Eliminates hardcoded date handling and provides consistent timezone management
 */

import { addDays } from 'date-fns';
import { capitalCallsConfig } from '../config/capital-calls-config';

/**
 * Create a normalized Date object set to noon UTC
 * This eliminates timezone issues and provides consistent date handling
 */
export function createNormalizedDate(date?: Date | string): Date {
  const config = capitalCallsConfig.getConfig();
  const baseDate = date ? new Date(date) : new Date();
  
  baseDate.setUTCHours(config.dateHandling.defaultTimeUTC, 0, 0, 0);
  return baseDate;
}

/**
 * Calculate due date based on call date and configuration
 */
export function calculateDueDate(callDate: Date): Date {
  const dueDays = capitalCallsConfig.getDefaultDueDays();
  const dueDate = addDays(callDate, dueDays);
  return createNormalizedDate(dueDate);
}

/**
 * Calculate reminder dates based on due date and configuration
 */
export function calculateReminderDates(dueDate: Date): Date[] {
  const config = capitalCallsConfig.getConfig();
  return config.notifications.reminderSchedule.map(days => 
    createNormalizedDate(addDays(dueDate, -days))
  );
}

/**
 * Check if a payment is overdue
 */
export function isPaymentOverdue(dueDate: Date, currentDate?: Date): boolean {
  const now = currentDate || new Date();
  const config = capitalCallsConfig.getConfig();
  const graceDate = addDays(dueDate, config.timing.paymentGraceDays);
  
  return now > graceDate;
}

/**
 * Format date for database storage (ISO string)
 */
export function formatForDatabase(date: Date): string {
  return createNormalizedDate(date).toISOString();
}

/**
 * Parse date from database with proper timezone handling
 */
export function parseFromDatabase(dateString: string): Date {
  return createNormalizedDate(dateString);
}

/**
 * Get current date normalized to configuration timezone
 */
export function getCurrentNormalizedDate(): Date {
  return createNormalizedDate();
}

/**
 * Validate that due date is after call date
 */
export function validateDateOrder(callDate: Date, dueDate: Date): boolean {
  return dueDate > callDate;
}

/**
 * Calculate business days between two dates (excluding weekends)
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Get next business day after given date
 */
export function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const dayOfWeek = nextDay.getDay();
  if (dayOfWeek === 0) { // Sunday
    nextDay.setDate(nextDay.getDate() + 1);
  } else if (dayOfWeek === 6) { // Saturday
    nextDay.setDate(nextDay.getDate() + 2);
  }
  
  return createNormalizedDate(nextDay);
}