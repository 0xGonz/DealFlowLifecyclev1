import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Deal } from "./types"
import { DealStageLabels } from "@shared/schema"

/**
 * Combine multiple class names with Tailwind utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compute and add frontend-specific properties to a deal object
 */
export function enrichDealWithComputedProps(deal: Deal): Deal {
  return {
    ...deal,
    stageLabel: DealStageLabels[deal.stage as keyof typeof DealStageLabels] || deal.stage,
  }
}

/**
 * Enrich multiple deals with computed properties
 */
export function enrichDealsWithComputedProps(deals: Deal[]): Deal[] {
  return deals.map(enrichDealWithComputedProps)
}

/**
 * Returns a random color from a predefined, visually pleasing palette
 * for consistent avatar colors
 */
export function getRandomAvatarColor(): string {
  const colors = [
    '#0E4DA4', // Primary blue
    '#2C7BE5', // Light blue
    '#00539C', // Deep blue
    '#3E7B55', // Green
    '#FF5A5F', // Coral
    '#D46E69', // Muted red
    '#6C5CE7', // Purple
    '#F48024', // Orange
    '#745FB5', // Violet
    '#17A2B8', // Teal
  ]
  
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return '??'
  
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Format a number as currency with $ symbol
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '$0'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format amount by type (percentage or dollar)
 */
export function formatAmountByType(amount: number, type: 'percentage' | 'dollar'): string {
  if (type === 'percentage') {
    return `${amount}%`
  }
  return formatCurrency(amount)
}
