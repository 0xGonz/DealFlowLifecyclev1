/**
 * Chart-related constants for the application
 * Centralizes chart configuration, colors, and defaults
 */

// Chart color scheme for consistency across visualizations
export const CHART_COLORS = {
  PRIMARY: 'rgb(59, 130, 246)', // blue-500
  SECONDARY: 'rgb(99, 102, 241)', // indigo-500
  SUCCESS: 'rgb(16, 185, 129)', // emerald-500
  WARNING: 'rgb(245, 158, 11)', // amber-500
  DANGER: 'rgb(239, 68, 68)', // red-500
  INFO: 'rgb(14, 165, 233)', // sky-500
  GREY: 'rgb(107, 114, 128)', // gray-500
};

// Sector colors - consistent across all charts
export const SECTOR_COLORS = {
  "Real Estate": '#4e87f6', // Blue
  "Venture": '#f9bf4c',    // Orange
  "Private Credit": '#f4736d', // Red
  "Buyout": '#4cb8a8',    // Teal
  "Energy": '#9f7cf5',    // Purple
  "GP Stakes": '#f47fa7', // Pink
  "Crypto": '#6dcff6',    // Light Blue
  "Technology": '#ffc658', // Yellow
  "SaaS": '#ff8042',      // Burnt Orange
  "Fintech": '#ff6361',   // Coral
  "Healthcare": '#bc5090', // Magenta
  "Other": '#b3b3b3',     // Grey
};

// For custom sectors not in the map, we'll use these colors in sequence
export const FALLBACK_COLORS = [
  '#a4de6c', // Light Green
  '#83a6ed', // Periwinkle
  '#8dd1e1', // Sky Blue
  '#d6c1dd', // Lavender
  '#f7d877', // Light Yellow
  '#81d8d0', // Turquoise
  '#ffb6c1', // Light Pink
];

// Function to get a sector color (exported for use across components)
export const getSectorColor = (sector: string): string => {
  const colorKey = sector as keyof typeof SECTOR_COLORS;
  return SECTOR_COLORS[colorKey] || FALLBACK_COLORS[Math.abs(sector.length) % FALLBACK_COLORS.length] || '#b3b3b3';
};

// Deal stage colors for charts (more vibrant than UI badge colors)
export const STAGE_CHART_COLORS = {
  initial_review: 'rgb(107, 114, 128)', // gray-500
  screening: 'rgb(59, 130, 246)', // blue-500
  diligence: 'rgb(99, 102, 241)', // indigo-500
  ic_review: 'rgb(139, 92, 246)', // purple-500
  closing: 'rgb(245, 158, 11)', // amber-500
  closed: 'rgb(16, 185, 129)', // emerald-500
  invested: 'rgb(20, 184, 166)', // teal-500
  rejected: 'rgb(239, 68, 68)', // red-500
};

// Default chart dimensions
export const CHART_DIMENSIONS = {
  SMALL: {
    WIDTH: 300,
    HEIGHT: 200,
  },
  MEDIUM: {
    WIDTH: 500,
    HEIGHT: 300,
  },
  LARGE: {
    WIDTH: 800,
    HEIGHT: 400,
  },
  DASHBOARD: {
    WIDTH: 380,
    HEIGHT: 240,
  },
};

// Chart padding and margin configuration
export const CHART_LAYOUT = {
  MARGIN: {
    TOP: 10,
    RIGHT: 30,
    BOTTOM: 30,
    LEFT: 40,
  },
  PADDING: {
    TOP: 5,
    RIGHT: 5,
    BOTTOM: 5,
    LEFT: 5,
  },
};

// Animation durations for charts
export const CHART_ANIMATION = {
  DURATION: 500, // milliseconds
};

// Chart tooltip configuration
export const CHART_TOOLTIP = {
  OFFSET: 10,
  SHOW_DELAY: 100,
  HIDE_DELAY: 200,
};
