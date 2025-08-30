# Overview

ChatFlow is a real-time messaging application built with a modern full-stack architecture. The application enables users to engage in both direct and group conversations with features like real-time messaging, user status tracking, and message read receipts. It's designed as a comprehensive chat platform with a clean, responsive interface that works across desktop and mobile devices.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built with **React 18** using TypeScript and follows a component-based architecture:

- **UI Framework**: Uses shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

The frontend implements a three-panel chat interface:
- Sidebar for conversation list and user management
- Main chat area for message display and composition
- User info panel for conversation details

## Backend Architecture

The server follows a **RESTful API** pattern built with Express.js:

- **Runtime**: Node.js with TypeScript for type safety
- **Framework**: Express.js with middleware for logging, JSON parsing, and error handling
- **Session Management**: Express sessions with PostgreSQL storage
- **Development**: Hot reloading with Vite integration in development mode

API endpoints are organized around core entities:
- Authentication routes (`/api/auth/*`)
- User management (`/api/users/*`)
- Conversation operations (`/api/conversations/*`)
- Real-time updates through polling

## Database Design

**PostgreSQL** database with **Drizzle ORM** for type-safe database operations:

- **Users Table**: Stores user profiles, online status, and authentication data
- **Conversations Table**: Manages both direct and group conversations
- **Conversation Members**: Junction table for user-conversation relationships
- **Messages**: Stores message content with sender and conversation relationships
- **Message Read Receipts**: Tracks message read status per user
- **Sessions**: Required table for session-based authentication

The schema uses UUIDs for primary keys and includes proper timestamps and foreign key relationships.

## Authentication System

**Replit Auth** integration with OpenID Connect:

- **Provider**: Uses Replit's OIDC service for user authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure flags in production
- **User Management**: Automatic user creation/updates from OIDC claims

## Real-time Features

Real-time functionality implemented through **HTTP polling**:

- Conversations list refreshes every 3 seconds
- Messages refresh every 2 seconds when viewing a conversation
- User online status updates through API calls
- Optimistic UI updates for better user experience

## Data Flow Architecture

**Repository Pattern** with storage abstraction:

- `IStorage` interface defines all data operations
- `DatabaseStorage` implements PostgreSQL operations via Drizzle
- Controllers use storage layer for business logic
- Type-safe operations with shared schema definitions

## Development Architecture

**Monorepo structure** with shared code:

- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Common TypeScript types and schemas
- Configuration files at root for tooling

The build process creates a single deployable artifact with the frontend built into `dist/public` and backend into `dist/index.js`.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **@neondatabase/serverless**: WebSocket-enabled database driver for serverless environments

## Authentication Services
- **Replit Auth**: OpenID Connect authentication provider
- **openid-client**: OIDC client library with Passport.js strategy integration

## UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and behavior
- **shadcn/ui**: Pre-built component system built on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Drizzle Kit**: Database migration and schema management
- **Replit Plugins**: Development environment integration (@replit/vite-plugin-*)
- **date-fns**: Date formatting and manipulation utilities

## Styling and Design
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utilities

The application uses environment variables for configuration (DATABASE_URL, SESSION_SECRET, REPLIT_DOMAINS) and is designed to run in both development and production environments with appropriate optimizations.