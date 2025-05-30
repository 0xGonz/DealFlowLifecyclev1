# Architecture Overview

## 1. Overview

This application is an Investment Lifecycle Tracking system built using a modern full-stack JavaScript/TypeScript architecture. It provides tools for tracking investment deals, funds, capital calls, closing schedules, and team collaboration.

The application follows a client-server architecture with a React frontend and a Node.js Express backend. It uses PostgreSQL as the database with Drizzle ORM for database access and schema management.

## 2. System Architecture

The system is structured as a monolithic application with clear separation between client and server code:

```
├── client/             # Frontend React application
├── server/             # Backend Express server
├── shared/             # Shared code between client and server
├── scripts/            # Database and utility scripts
├── public/             # Static assets
└── migrations/         # Database migrations
```

### Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Node.js Express server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tools**: Vite for frontend, esbuild for backend

## 3. Key Components

### 3.1 Frontend (Client)

The frontend is a React application built with TypeScript that provides a user interface for managing investment deals, funds, and related operations.

**Key Features**:
- Component-based architecture using React
- Type safety with TypeScript
- UI components from shadcn/ui with Radix UI primitives
- State management with React Query for server state
- Client-side routing with Wouter

**Directory Structure**:
- `client/src/pages/`: Page components
- `client/src/components/`: Reusable UI components
- `client/src/hooks/`: Custom React hooks
- `client/src/lib/`: Utility functions and constants

### 3.2 Backend (Server)

The backend is an Express.js server that provides RESTful API endpoints for the frontend to consume.

**Key Features**:
- RESTful API architecture
- Express.js middleware for request processing
- Session-based authentication
- Type-safe database interactions with Drizzle ORM
- Modular routing with Express Router

**Directory Structure**:
- `server/routes/`: API route definitions
- `server/utils/`: Utility functions
- `server/constants/`: Application constants
- `server/config/`: Configuration files

### 3.3 Database

The application uses PostgreSQL for data persistence, accessed through Drizzle ORM, which provides type-safety and schema migrations.

**Key Features**:
- Schema definition in TypeScript
- Type-safe queries with Drizzle ORM
- Migrations handled by Drizzle Kit
- Connection pooling for efficient database access

**Main Entities**:
- Users
- Deals
- Funds
- Fund Allocations
- Capital Calls
- Closing Schedule Events
- Documents
- Timeline Events
- Deal Stars (leaderboard feature)
- Mini Memos
- Notifications

### 3.4 Authentication & Authorization

The application implements a session-based authentication system with role-based access control.

**Key Features**:
- Express session with PostgreSQL session store
- Password hashing with bcrypt
- Role-based access control with defined permission levels
- User roles: admin, partner, analyst, observer, intern

## 4. Data Flow

### 4.1 Client-Server Communication

The frontend communicates with the backend through RESTful API calls using React Query:

1. Frontend components trigger React Query hooks to fetch or mutate data
2. React Query sends HTTP requests to the backend API
3. Express routes handle the requests and interact with the database
4. Data is returned to the client and cached by React Query
5. Components re-render with the updated data

### 4.2 Storage Strategy

The application implements an abstraction layer for data storage, allowing for different storage implementations:

1. `IStorage` interface defines common storage operations
2. `DatabaseStorage` implements storage using PostgreSQL/Drizzle
3. `MemStorage` provides an in-memory implementation for development or fallback
4. `StorageFactory` determines the appropriate storage implementation at runtime

This approach allows for:
- Easier testing by swapping storage implementations
- Fallback to in-memory storage if database isn't available
- Consistent API for data access across the application

## 5. External Dependencies

### 5.1 UI Components

The application uses shadcn/ui with Radix UI primitives for accessible, composable UI components:
- Various Radix UI components for interactive elements
- Tailwind CSS for styling
- Lucide React for icons

### 5.2 Database

- Neon Serverless Postgres for database storage
- Drizzle ORM for database access and schema management
- Connection pooling for efficient database access

### 5.3 Authentication

- Express session middleware for session management
- bcrypt for password hashing
- connect-pg-simple for PostgreSQL session storage

## 6. Deployment Strategy

The application is configured for deployment using the Replit platform:

**Build Process**:
1. Frontend is built using Vite (`vite build`)
2. Backend is bundled using esbuild
3. Static assets are saved to `dist/public`
4. Server code is bundled to `dist/index.js`

**Runtime Configuration**:
- Environment variables for database connection and other configuration
- Production mode vs. development mode settings
- Autoscaling deployment configuration via Replit

**Database Management**:
- Schema migrations handled by Drizzle Kit
- Database connection configuration through environment variables

## 7. Future Considerations

### Potential Improvements

1. **Microservices**: If the application grows significantly, consider breaking the monolithic architecture into microservices for better scalability and maintenance.

2. **Server-Side Rendering**: For improved SEO and initial load performance, consider implementing server-side rendering with a framework like Next.js.

3. **Caching Strategy**: Implement a more sophisticated caching strategy using Redis or similar technology for improved performance.

4. **Monitoring and Logging**: Add comprehensive logging and monitoring solutions for better observability in production.

5. **CI/CD Pipeline**: Implement a more robust CI/CD pipeline for automated testing and deployment.