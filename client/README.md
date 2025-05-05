# Client-side Components

## Formatting Utilities

The project uses consistent formatting utilities across all components to ensure a consistent presentation of data.

### Key Features

- **Percentage Formatting**: Uses a consistent number of decimal places configured in `calculation-constants.ts`
- **Currency Formatting**: Formats currency values with appropriate units (K, M, B) and decimal precision
- **Ratio Formatting**: Formats ratios (like MOIC) with the appropriate number of decimal places
- **IRR Formatting**: Special handling for IRR values with appropriate precision
- **Date Formatting**: Consistent date display format
- **File Size Formatting**: Converts byte values to appropriate units (KB, MB, etc.)

### Usage

Import the formatting utilities from the `lib/utils/format.ts` file:

```typescript
import { formatPercentage, formatCurrency, formatRatio, formatIRR } from '@/lib/utils/format';
import { FINANCIAL_CALCULATION } from '@/lib/constants/calculation-constants';

// Format a percentage with default precision
const formattedPercent = formatPercentage(42.123);

// Format a percentage with custom precision
const precisePercent = formatPercentage(42.123, 3);

// Format currency
const formattedAmount = formatCurrency(1234567.89);

// Format ratio (like MOIC)
const formattedRatio = formatRatio(1.654);

// Format IRR
const formattedIRR = formatIRR(18.5);
```

## Configuration Constants

Configuration values are stored in dedicated constant files under the `lib/constants/` directory:

- `calculation-constants.ts`: Contains financial calculation parameters, precision settings, and default values
- `formatting-constants.ts`: Contains formatting-specific constants

These constants ensure consistent formatting across the application and make it easy to adjust global settings in one place.
