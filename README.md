# Doliver Investment Lifecycle Tracking Application

A comprehensive platform for managing the full investment lifecycle, from deal intake through evaluation to post-investment tracking.

## Features

- Deal management with stage tracking and evaluation
- Fund allocation and capital call management
- Team collaboration with role-based access
- Document storage and management
- Timeline events and activity tracking
- Analytics and reporting
- Notifications system

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth with role-based access control
- **State Management**: React Query
- **Background Processing**: Bull queues with Redis (optional)

## Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 13+
- Redis (optional, for job queues)

## Environment Setup

1. Clone the repository
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Update the environment variables in `.env` with your actual values

## Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `NODE_ENV` - Set to "development" or "production"

## Installation

```bash
# Install dependencies
npm install

# Push database schema to PostgreSQL
npm run db:push
```

## Development

```bash
# Start the development server
npm run dev
```

This will start:
- Express server on port 5000
- React development server with HMR
- Background job processing if Redis is configured

## Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Database Management

The application uses Drizzle ORM for database schema management and migrations:

```bash
# Push schema changes to database
npm run db:push

# Generate migrations (if needed)
npm run db:generate

# Apply migrations (if needed)
npm run db:migrate
```

## Architecture

- **/client**: React frontend application
- **/server**: Express backend API
- **/shared**: Shared types and schema definitions
- **/public**: Static assets
- **/scripts**: Database and utility scripts

## Resilience Features

- Hybrid storage with database fallback mechanisms
- Job queue with local processing mode when Redis is unavailable
- Error tracking and circuit breaker patterns
- Session persistence with PostgreSQL (with memory fallback)

## Security

- Session-based authentication with secure cookie settings
- Role-based access control
- Input validation with Zod schemas
- Parameterized SQL queries via Drizzle ORM

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

Proprietary - All rights reserved