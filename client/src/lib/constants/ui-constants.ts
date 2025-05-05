/**
 * Constants related to user interface components
 */

// Avatar colors for user profiles
export const AVATAR_COLORS = {
  DEFAULT: '#0E4DA4',
  BLUE: '#0E4DA4',
  RED: '#D32F2F',
  GREEN: '#388E3C',
  PURPLE: '#7B1FA2',
  ORANGE: '#F57C00',
  TEAL: '#00796B',
  PINK: '#C2185B',
  INDIGO: '#303F9F',
  AMBER: '#FFA000',
  GRAY: '#616161'
};

// Form field validation constraints
export const FORM_CONSTRAINTS = {
  // Form field placeholders
  PLACEHOLDERS: {
    SELECT_ROLE: 'Select a role',
    ENTER_NAME: 'Enter your full name'
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    ERROR_MESSAGE: 'Username must be at least 3 characters',
    PLACEHOLDER: 'Enter your full name'
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    ERROR_MESSAGE: 'Password must be at least 6 characters'
  },
  INITIALS: {
    MAX_LENGTH: 3,
    ERROR_MESSAGE: 'Initials must be at most 3 characters'
  },
  TEXT_AREA: {
    MAX_LENGTH: 500,
    ERROR_MESSAGE: 'Text must be less than 500 characters'
  }
};

// Layout dimensions
export const LAYOUT = {
  SIDEBAR_WIDTH: '220px', // Reduced from 280px to be less wide
  CONTENT_MAX_WIDTH: '1200px',
  MOBILE_BREAKPOINT: '768px',
  TABLET_BREAKPOINT: '1024px'
};

// Animation durations (in milliseconds)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  SMALL_PAGE_SIZE: 5,
  LARGE_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100
};

// Toast notification durations (in milliseconds)
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000
};

// Z-index values for layering components
export const Z_INDEX = {
  DROPDOWN: 50,
  MODAL: 100,
  TOAST: 200
};

// User role descriptions
export const USER_ROLE_DESCRIPTIONS = {
  ADMIN: 'Full system access, including user management',
  PARTNER: 'Create/edit deals, approve investments, view all content',
  ANALYST: 'Create/edit deals, view all content, suggest investments',
  OBSERVER: 'View-only access to deals and content',
  INTERN: 'View access to all content and ability to add new deals only'
};

// Icon size constants for consistent sizing across components
export const ICON_SIZES = {
  TIMELINE: {
    CONTAINER: {
      DEFAULT: 'w-6 h-6',
      SMALL: 'w-5 h-5',
      RESPONSIVE: 'w-5 h-5 sm:w-6 sm:h-6'
    },
    ICON: {
      DEFAULT: 'h-3 w-3',
      SMALL: 'h-2.5 w-2.5',
      RESPONSIVE: 'h-2.5 w-2.5 sm:h-3 sm:w-3'
    }
  },
  NAVIGATION: {
    DEFAULT: 'h-5 w-5',
    LARGE: 'h-6 w-6',
    SMALL: 'h-4 w-4'
  },
  BUTTON: {
    DEFAULT: 'h-4 w-4',
    LARGE: 'h-5 w-5',
    SMALL: 'h-3 w-3'
  }
};
