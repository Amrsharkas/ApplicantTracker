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
- July 5, 2025. Implemented two-AI system: AI Agent 1 (Interview Conductor) analyzes resume/profile and generates personalized questions; AI Agent 2 (Profile Analyzer) creates comprehensive user analysis from all data sources
- July 5, 2025. Updated Airtable integration to use "platouserprofiles" table and automatically store complete user analysis profiles after interview completion
- July 5, 2025. Enhanced Airtable integration to include User ID field - now stores Name, User profile data, and unique User ID for each completed interview with automatic fallback handling
- July 5, 2025. Fixed scrolling issue in interview history modal profile view and replaced dashboard checklist with engaging hiring statistics section for completed users
- July 5, 2025. Updated Airtable job system - when Job title and Job description fields are populated for a user, it indicates pre-approval and automatically creates an approved application (no AI matching needed)
- July 5, 2025. Implemented dual-table Airtable system: "platouserprofiles" table stores interview completions, new "platojobmatches" table creates job matches for the Job Matches modal when employers accept candidates
- July 5, 2025. Corrected workflow: "platouserprofiles" only stores interview data (no job processing), "platojobmatches" directly populates Job Matches modal with employer-selected matches (no scoring/AI needed)
- July 5, 2025. Successfully configured dual-base Airtable system with field name mapping - job matches now properly detected from dedicated base (app1u4N2W46jD43mP) and automatically create 100% match job entries
- July 7, 2025. Enhanced Airtable profile storage with beautiful formatting - profiles now stored with professional markdown-style formatting including headers, bold text, emojis, bullet points, and clear sections instead of raw JSON
- July 7, 2025. Added email field integration to Airtable profile storage - all user profiles now include the user's email address in the "email" field alongside name, user ID, and formatted profile data
- July 8, 2025. Removed job search functionality - eliminated "View Job Postings" button, JobSearchModal component, and all related API endpoints to focus solely on Airtable-based job matching system
- July 8, 2025. Added 3D company carousel to homepage landing page with podium effect - center logo prominently displayed, side logos smaller and blurred, slower 5-second transitions, and persuasive messaging about successful company adoption
- July 9, 2025. Added personalized AI welcome message to interview system - users now receive a warm, personalized greeting from the AI interview system before starting the 5 questions, independent of the structured interview questions
- July 10, 2025. Updated interview system with completion tracking - each interview type now shows "Completed" status when finished, preventing users from retaking completed interviews
- July 10, 2025. Fixed interview type routing by adding specific IDs to interview buttons (interview-personal-button, interview-professional-button, interview-technical-button) to ensure correct question generation
- July 10, 2025. Changed question distribution: 5 personal questions (background/values), 7 professional questions (career experience), 11 technical questions (IQ-focused with logical reasoning, pattern recognition, mathematical thinking)
- July 10, 2025. Enhanced technical interview with IQ-style questions focusing on cognitive abilities, abstract reasoning, spatial thinking, and analytical skills rather than just problem-solving scenarios
- July 10, 2025. Fixed interview completion tracking and navigation issues - interviews now properly show "Completed" status, fixed "back to interview types" navigation, and added submit button for text interviews when "conclude" is detected
- July 10, 2025. Synchronized voice and text interviews to use identical structured question sets - voice interviews now ask the same personal/professional/technical questions as text interviews, with immediate welcome message display and proper completion tracking
- July 10, 2025. Fixed unified interview architecture - the 3 interview types (personal/professional/technical) now properly display as components of one interview process that generates a single comprehensive profile, with improved messaging and unified profile display in interview history
- July 10, 2025. Created comprehensive "Build My Profile" modal with 11 detailed sections - General Information, Career Interests, CV Upload, Work Experience, Skills, Languages, Education, Certifications, Training, Online Presence, and Achievements
- July 10, 2025. Added 25+ new database columns for comprehensive profile data including personal details, career preferences, work history with JSON storage, skills with proficiency ratings, language abilities, education tracking, certifications, and social media links
- July 10, 2025. Implemented sophisticated profile completion calculation system requiring 100% completion of mandatory fields across all sections (1000 points total) with optional sections for certifications, training, and achievements providing bonus points
- July 10, 2025. Added functional sub-modals for adding work experiences, skills with star ratings, languages with 4-skill proficiency tracking, university degrees, certifications, and training courses with full CRUD operations
- July 10, 2025. Enhanced AI interview system with comprehensive profile data integration - interviews now use all 11 sections of Build My Profile data (personal details, work experience, skills, education, languages, certifications, etc.) to generate highly personalized, specific questions that reference actual user background and goals
- July 10, 2025. Improved field detection algorithm to analyze career interests, job preferences, skills, education, and work experience for more accurate technical interview customization across expanded fields including Civil Engineering, Mechanical Engineering, Healthcare, Education, and Legal
- July 10, 2025. Updated AI Profile Analysis Agent to utilize comprehensive user context from Build My Profile modal for more accurate and detailed professional profile generation
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```