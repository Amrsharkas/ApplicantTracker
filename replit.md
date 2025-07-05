# replit.md

## Overview

This is a full-stack web application called "Plato" - an AI-powered job matching platform designed for applicants seeking employment. The platform uses AI interviews to deeply understand applicants and match them to relevant job opportunities based on their skills, experience, and career goals.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Animation**: Framer Motion for UI animations
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with structured routes
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer for handling multipart form data

### Database Layer
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema updates
- **Connection**: Neon serverless driver with WebSocket support

### Authentication
- **Provider**: Replit OIDC authentication
- **Strategy**: OpenID Connect with Passport.js
- **Session Storage**: PostgreSQL-backed sessions
- **Role Management**: Automatic "applicant" role assignment for new users

## Key Components

### Core Features
1. **User Management**: Authentication, profile creation, and session handling
2. **AI Interview System**: OpenAI-powered conversational interviews
3. **Profile Generation**: AI-driven profile creation from interview responses
4. **Job Matching**: Intelligent job matching based on user profiles
5. **Application Tracking**: Job application management and status tracking

### Modal-Based Interface
The application uses a single-page dashboard with modal overlays for different functionalities:
- **ProfileModal**: Personal information and resume management
- **InterviewModal**: AI-powered interview experience
- **JobSearchModal**: Job discovery and search
- **MatchesModal**: Personalized job recommendations
- **ApplicationsModal**: Application history and status

### Real-Time Updates
- Live profile completion percentage tracking
- Dynamic job match count updates
- Real-time interview progress indicators

## Data Flow

1. **User Onboarding**: Users authenticate via Replit OIDC and are automatically assigned "applicant" role
2. **Profile Building**: Users fill out personal/professional information and upload resumes
3. **AI Interview**: Conversational AI interview generates comprehensive user profiles
4. **Job Matching**: AI analyzes user profiles against job database to create match scores
5. **Application Process**: Users can apply to matched jobs and track application status

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **AI Services**: OpenAI API for interview processing and profile generation
- **Authentication**: Replit OIDC service
- **UI Components**: Radix UI primitives via shadcn/ui

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Production bundling for server code
- **PostCSS**: CSS processing with Tailwind
- **TSX**: Development server for TypeScript execution

## Deployment Strategy

### Development Mode
- Vite dev server for frontend with HMR
- TSX for backend development with auto-restart
- Shared TypeScript configuration across client/server/shared

### Production Build
- Vite builds frontend to `dist/public`
- ESBuild bundles server code to `dist/index.js`
- Single Node.js process serves both static files and API

### Environment Configuration
- Database connection via `DATABASE_URL`
- OpenAI integration via `OPENAI_API_KEY`
- Session security via `SESSION_SECRET`
- Replit-specific environment variables for OIDC

The architecture prioritizes developer experience with shared TypeScript types, hot reloading, and type-safe database operations while maintaining production scalability through serverless database connections and efficient bundling strategies.

## Changelog

```
Changelog:
- June 30, 2025. Initial setup
- July 2, 2025. Fixed profile completion percentage calculation to reach 100%
- July 2, 2025. Enhanced resume upload with graceful PDF parsing failure handling
- July 2, 2025. Limited AI interviews to exactly 5 structured questions with clear progression
- July 2, 2025. Changed OpenAI Realtime voice from "shimmer" to "verse"
- July 2, 2025. Updated voice interview instructions for focused 5-question structure
- July 2, 2025. Added full AI profile details display in interview completion with expandable summary, skills, strengths, work style, and career goals
- July 2, 2025. Added aiProfileGenerated database field to properly track interview completion status on dashboard
- July 2, 2025. Integrated Airtable API to automatically store user profiles when interviews are completed with name and profile data columns
- July 2, 2025. Added hang up button to voice interview interface with smart completion detection to properly end voice sessions
- July 5, 2025. Enhanced voice interview button to change from "Hang Up" to "Submit Interview" when AI uses "conclude" in final response, with automatic interview processing and profile generation
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```