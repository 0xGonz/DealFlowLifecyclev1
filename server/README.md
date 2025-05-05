# Server-side Components

## Formatting Utilities

The project uses consistent formatting utilities across both client and server components to ensure a consistent presentation of data.

### Key Features

- **Percentage Formatting**: Uses a consistent number of decimal places configured in `calculation-constants.ts`
- **Currency Formatting**: Formats currency values with appropriate units (K, M, B) and decimal precision
- **Date Formatting**: Consistent date display format

### Usage

Import the formatting utilities from the `utils/format.ts` file:

```typescript
import { formatPercentage, formatCurrency } from '../utils/format';

// Format a percentage
const formattedPercent = formatPercentage(42.123); // "42.12%"

// Format currency
const formattedAmount = formatCurrency(1234567.89); // "$1.2M"
```

## Configuration Constants

Configuration values are stored in dedicated constant files under the `constants/` directory:

- `calculation-constants.ts`: Contains financial calculation parameters
- `time-constants.ts`: Contains time-related constants
- `status-constants.ts`: Contains status values and enumerations

These constants ensure consistent formatting and calculations across both client and server components.
