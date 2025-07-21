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
- July 14, 2025. Implemented seamless interview flow - after completing personal/professional interviews, users automatically progress to the next interview type instead of seeing individual completion messages. Only the final technical interview completion shows the comprehensive profile generation message and full dashboard access
- July 14, 2025. Implemented comprehensive profile system - expanded database schema to include extensive optional fields across 7 categories: Essential Info, General Info, Location, Career Interests, Experience, Education, and Online Presence. Updated completion logic to require only essential info (name/email/phone/location/age) plus completed interviews to unlock dashboard. Profile completion percentage now calculated from all fields but essential info completion unlocks core functionality
- July 15, 2025. Enhanced AI interview system to behave as one continuous, intelligent interviewer across all three phases (Background, Professional, Technical). Added interview context tracking system that maintains memory of previous answers, prevents redundancy, and enables contextual questions that reference prior responses. Updated AI prompts to build on previous interview insights and maintain consistent tone throughout all phases
- July 15, 2025. Transformed job discovery into intelligent career assistant with smart filtering, AI match scores, and personalized application analysis. Added sticky sidebar filters with partial matching, AI-powered job application analysis that compares user profile/interview data to job requirements, and professional feedback system with concrete reasons for match/mismatch decisions
- July 15, 2025. Enhanced job description display with smooth, intelligent panel experience featuring scrollable job details with sticky job titles, always-visible apply buttons, and smart visual cues for strong matches. Job details now slide in from the right while maintaining full filter functionality, with enhanced application analysis modals providing detailed match evaluation and professional feedback
- July 15, 2025. Added CV upload requirement to job application process - users must upload CV/Resume before job analysis, then system evaluates fit using complete profile + interview data. Applications now send both AI-generated profile and uploaded CV to companies with detailed logging for company access
- July 15, 2025. Implemented comprehensive profile generation system that creates brutally honest, data-driven profiles for employers. System cross-references all interview responses with initial profile data, includes direct quotes, highlights discrepancies, flags concerns, and only acknowledges verified skills. Profiles include snapshot overview, verified skills, interview highlights with direct quotes, flags/concerns, and detailed work preferences
- July 16, 2025. Removed interview history modal and all profile displays from user interface. Generated AI profiles are now completely hidden from applicants - only visible to employers through Airtable integration. This ensures profiles remain confidential and prevents users from seeing their generated assessment details
- July 16, 2025. Enhanced real-time job matching system - job matches now refresh every 30 seconds to sync with Airtable "platojobmatches" table. Dashboard conditionally hides job matches section when no matches exist, with responsive grid layout that adapts based on available data. MatchesModal includes real-time updates and improved empty state messaging
- July 16, 2025. Updated job matches display to always show the matches modal and button even when no matches exist. Users can now access the job matches section at all times, with improved empty state messaging explaining the matching process
- July 16, 2025. Implemented intelligent job application system - Apply button now compares applicant's AI-generated skills with job requirements. Applications are only submitted to Airtable if user is missing 3 or fewer required skills, otherwise shows qualification message in modal. System uses real-time skill matching with case-insensitive comparison
- July 19, 2025. Completely overhauled Applications modal with real Airtable integration - applications now pull from "platojobapplications" table with intelligent status determination (Accepted/Pending/Closed/Denied) based on cross-table lookups between platojobapplications, platojobpostings, and platojobmatches. Added auto-refresh every 30 seconds, manual refresh button, status filtering, and clean card-based display. AI analysis notes are hidden from users to maintain confidentiality. View Details button navigates seamlessly to job postings modal
- July 19, 2025. Implemented "Upcoming Interviews" modal system pulling from platojobmatches table (Base ID: app1u4N2W46jD43mP) with Interview date&time and Interview Link fields. Modal always visible to users with humorous empty state message when no interviews scheduled. Features professional date formatting, smart status badges, Join Interview button opening links in new tabs, and 30-second auto-refresh synchronization
- July 19, 2025. Removed congratulations message from dashboard and replaced with one-time toast notification that appears only when users first complete their interview and reach the dashboard. Uses localStorage to prevent showing the same message on subsequent visits, improving user experience by reducing repetitive messaging
- July 19, 2025. Updated Applications modal to use direct "Status" field from "platojobapplications" Airtable table instead of calculating status through cross-table lookups. System now reads status directly from Airtable with smart normalization (accepted/approved/hired → accepted, pending/under review → pending, denied/rejected → denied, closed/cancelled → closed) providing more accurate and manageable application status tracking
- July 21, 2025. Fixed critical profile update JSON parsing error caused by incorrect API request format in ComprehensiveProfileModal. Updated apiRequest calls to use proper signature with method and body in options object instead of separate parameters, resolving "Unexpected token '<', DOCTYPE..." errors
- July 21, 2025. Enhanced voice interview error handling with automatic fallback to text mode. When voice interview connection fails (due to OpenAI realtime API limitations), system now provides better error messages and seamlessly switches users to text interview mode to ensure interview completion
- July 21, 2025. Implemented comprehensive interview debugging system with detailed logging and fallback questions. Added extensive logging to interview start endpoints, comprehensive error messages, and fallback question sets for all interview types (personal, professional, technical) to ensure interviews can proceed even if AI question generation fails
- July 21, 2025. Completely rewrote OpenAI Realtime API implementation using proper WebSocket connection instead of incorrect WebRTC approach. Fixed voice interview system to use correct PCM16 audio format, real-time audio processing with AudioContext, and enhanced user profile integration for personalized voice interview questions. Voice interviews now properly connect to OpenAI's realtime API with user profile context
- July 21, 2025. Temporarily disabled voice interview feature due to OpenAI Realtime API connection issues in production environment. Text interviews remain fully functional with identical AI-powered personalized questions and comprehensive profile generation. Voice interviews will be re-enabled once API connection stability is resolved
- July 21, 2025. Re-enabled voice interview functionality with enhanced error handling, connection timeouts, and improved WebSocket debugging. Added comprehensive logging for OpenAI Realtime API connections, better timeout management, and graceful fallback messaging when voice connections fail. Voice interviews now properly attempt connection with clear error feedback to users
- July 21, 2025. Fixed voice interview implementation with shimmer voice as requested by user. Resolved TypeScript compilation errors, simplified WebSocket connection logic, and improved audio processing for OpenAI Realtime API. System now uses shimmer voice instead of verse and has cleaner connection handling without timeout conflicts
- July 21, 2025. Implemented complete voice interview auto-start system with full speech-to-speech pipeline. Voice interviews now automatically connect when selected, providing proper microphone access prompts, real-time STT transcription, AI-generated responses, and TTS playback with shimmer voice. Added comprehensive audio level detection, voice activity indicators, and enhanced error handling for microphone permissions and WebSocket connections
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```