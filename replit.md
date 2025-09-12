# replit.md

## Overview
Plato is an AI-powered job matching platform that connects applicants with relevant job opportunities. It leverages AI interviews to deeply understand applicants' skills, experience, and career goals, then matches them to suitable roles. The platform focuses on creating comprehensive applicant profiles and streamlining the job application process, serving as a bridge between job seekers and employers.

**Platform Status:** ✅ PRODUCTION READY (September 10, 2025) - Complete data wipe executed successfully. All user accounts, profiles, interviews, resumes, and Airtable records have been permanently removed. The application is now clean and ready for public launch with zero test data.

**Data Wipe Summary:** 
- 15 user accounts removed
- 15 user profiles cleared  
- 71 interview sessions deleted
- 18 resume files purged from storage
- 39 Airtable records cleaned
- 135 total database records eliminated
- Zero errors during cleanup process

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Animation**: Framer Motion
- **Form Handling**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **API Pattern**: RESTful API
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer

### Database
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit

### File Storage
- **Object Storage**: Google Cloud Storage via Replit Object Storage
- **Resume Processing**: PDF parsing with pdf-parse and AI analysis
- **File Uploads**: Uppy components with presigned URLs for direct-to-cloud uploads

### Authentication
- **Provider**: Custom email/password authentication
- **Strategy**: Modal-based sign-up/sign-in
- **Session Storage**: PostgreSQL-backed sessions
- **Role Management**: Automatic "applicant" role assignment

### Core Features
- **User Management**: Authentication, profile creation, session handling.
- **Resume Management**: Required resume upload system with Google Cloud Storage, PDF parsing, and AI analysis before interview access.
- **AI Interview System**: OpenAI-powered conversational interviews with a two-AI system (Interview Conductor, Profile Analyzer) that incorporates resume content as context. Requires 75% profile completion to unlock. Features **comprehensive Egyptian Arabic dialect support** with casual conversational style using Egyptian slang ("إزيك", "عامل إيه", "يلا") - speaking like you're in a Cairo coffee shop. Full bilingual UI (Arabic/English) with language switcher and interview language selection. **CRITICAL WORKFLOW**: Interview responses are stored temporarily during personal, professional, and technical interviews. Complete AI profile analysis and Airtable submission only occurs AFTER all 3 interviews are finished.
- **Profile Generation**: Brutally honest, evidence-based profile creation from interview responses. AI generates critical analysis profiles with verified skills, weaknesses/gaps, and factual assessments instead of promotional content (hidden from applicants, visible to employers via Airtable). **Only generated after all 3 interviews complete**.
- **Comprehensive Profile System**: 11-section incremental profile building with auto-save functionality and complete database field mapping. ALL profile fields from both ComprehensiveProfileModal and ManualCV forms are now comprehensively saved to the applicants_profile database table. AI interviews now utilize ALL 11 sections for contextual question generation.
- **Job Matching**: Intelligent job matching based on stringent filter requirements and employer-selected matches via Airtable.
- **Application Tracking**: Job application management and status tracking via Airtable, with skill-based submission logic.
- **Interview Scheduling**: "Upcoming Interviews" modal pulling from Airtable.

### User Interface & Experience
- Single-page dashboard with modal overlays for key functionalities (Profile, Interview, Job Search, Matches, Applications, Upcoming Interviews).
- 3D company carousel on the landing page.
- Focus on professional, streamlined user flows with immediate redirects post-logout.

## External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **AI Services**: OpenAI API (for interviews and profile generation)
- **Data Integration**: Airtable (for storing user profiles, job matches, job applications, and interview schedules)
- **UI Components**: Radix UI primitives (via shadcn/ui)