# ApplicantTracker - Developer Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [External Integrations](#external-integrations)
8. [Background Jobs](#background-jobs)
9. [Setup & Configuration](#setup--configuration)
10. [Development Workflow](#development-workflow)
11. [Important Files Reference](#important-files-reference)

---

## Overview

**ApplicantTracker** is a comprehensive job seeker platform that provides AI-powered interview preparation, job matching, and career coaching capabilities. Job seekers can upload resumes, practice interviews with an AI interviewer, discover matching jobs, and track their applications.

**Location:** `/var/www/plato/ApplicantTracker/`

**Primary Users:** Job seekers looking for employment opportunities and interview preparation

**Main Value Proposition:** AI-powered mock interviews with voice/video support and personalized job matching

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Wouter | 3.6.0 | Lightweight routing |
| TailwindCSS | 4.1.18 | Utility-first styling |
| Radix UI | Various | Accessible component primitives |
| TanStack Query | 5.90.12 | Server state management |
| Framer Motion | 12.3.5 | Animations |
| Lucide React | 0.511.2 | Icon library |
| HLS.js | 1.6.0 | Video streaming (HLS format) |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js + Express | 5.2.1 | Web server framework |
| TypeScript | 5.9.3 | Type safety (ESM modules) |
| Drizzle ORM | 0.45.1 | Database ORM |
| PostgreSQL | - | Primary database (Neon or local) |
| BullMQ | 5.66.2 | Job queue system |
| Redis (ioredis) | 5.8.2 | Queue backend & caching |
| Passport.js | 0.7.0 | Authentication middleware |

### Key Libraries & Services

| Library | Version | Purpose |
|---------|---------|---------|
| OpenAI | 6.15.0 | AI interview generation, profile analysis |
| Google Cloud Storage | 7.18.0 | File storage (resumes, recordings) |
| SendGrid/mail | 8.2.3 | Email notifications |
| Stripe | 20.1.0 | Payment processing |
| FFmpeg | - | Video processing & conversion |
| pdf-parse | 1.1.1 | Resume PDF parsing |
| pdf-lib | 1.17.1 | PDF manipulation |
| mammoth | 1.8.0 | DOCX parsing |

### Build Tools

- **Vite** 7.3.0 - Fast development server and bundler
- **esbuild** 0.24.2 - TypeScript compilation for server
- **nodemon** - Auto-restart during development

---

## Architecture

### Directory Structure

```
/var/www/plato/ApplicantTracker/
│
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ui/                # Radix UI component wrappers
│   │   │   ├── InterviewSession.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   └── ...
│   │   ├── pages/                 # Route page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Interview.tsx
│   │   │   ├── JobMatches.tsx
│   │   │   └── ...
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── use-toast.ts
│   │   │   ├── use-mobile.tsx
│   │   │   └── ...
│   │   ├── contexts/              # React context providers
│   │   ├── lib/                   # Utilities and helpers
│   │   │   ├── queryClient.ts    # TanStack Query config
│   │   │   └── utils.ts
│   │   ├── App.tsx               # Main app component
│   │   └── main.tsx              # Entry point
│   ├── index.html
│   └── vite.config.ts
│
├── server/                          # Express Backend
│   ├── index.ts                    # Server entry point
│   ├── routes.ts                   # Main API routes (244KB file!)
│   ├── auth.ts                     # Authentication logic
│   ├── openai.ts                   # OpenAI service integration
│   ├── storage.ts                  # Data access layer
│   ├── db.ts                       # Database connection setup
│   ├── emailService.ts             # SendGrid email integration
│   ├── resumeService.ts            # Resume parsing & processing
│   ├── queues/
│   │   └── videoQueue.ts          # BullMQ video processing queue
│   ├── workers/
│   │   └── videoWorker.ts         # Video processing worker
│   ├── services/                   # Business logic services
│   ├── controllers/                # Request handlers
│   └── middleware/                 # Custom middleware
│
├── shared/                          # Shared TypeScript Code
│   └── schema.ts                   # Database schema (1172 lines)
│
├── uploads/                         # Local file storage
│   ├── recordings/                 # Interview video/audio recordings
│   ├── chunks/                     # Video chunks during processing
│   ├── assessments/                # User assessment files
│   └── career-insights/            # Career document uploads
│
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite configuration
└── .env                            # Environment variables (not in git)
```

### Application Flow

1. **User Registration/Login**
   - Local email/password authentication
   - Google OAuth 2.0 social login
   - Email verification workflow

2. **Profile Setup**
   - Manual profile creation OR
   - Resume upload → AI parsing → Auto-generated profile

3. **AI Interview Practice**
   - Start interview session (mock, career, or job-specific)
   - Voice/video recording in browser
   - Real-time AI interviewer responses
   - Video upload and processing (WebM → HLS conversion)
   - Interview feedback and analysis

4. **Job Discovery**
   - AI-powered job matching based on profile
   - RAG (Retrieval Augmented Generation) for recommendations
   - Job application tracking

5. **Career Coaching**
   - Chat-based career guidance
   - Mock interview sessions
   - Interview question practice

---

## Key Features

### 1. Authentication & User Management

- **Local Authentication:** Email/password with bcrypt hashing
- **Google OAuth:** One-click social login
- **Email Verification:** Automated email verification on signup
- **Password Reset:** Secure password reset flow
- **Session Management:** Express sessions stored in PostgreSQL

**Implementation:**
- Passport.js strategies: `server/auth.ts`
- Session store: PostgreSQL `sessions` table
- Email templates: `server/emailService.ts`

### 2. Resume Processing & Profile Management

**Resume Upload:**
- Supports PDF and DOCX formats
- File size limits and validation
- Stored in Google Cloud Storage

**AI-Powered Parsing:**
- OpenAI GPT-4 extracts:
  - Personal information
  - Work experience
  - Education history
  - Skills and certifications
  - Projects and achievements
- Generates structured `applicant_profiles` record

**Profile Management:**
- Auto-generated from resume OR manual creation
- Full CRUD operations
- Profile completeness tracking

**Implementation:**
- Resume parsing: `server/resumeService.ts`
- OpenAI integration: `server/openai.ts`
- Storage: `server/storage.ts`

### 3. AI Interview System

**Interview Types:**
- **Mock Interview:** General interview practice
- **Career Interview:** Career guidance discussion
- **Job-Specific Interview:** Tailored to specific job posting

**Interview Flow:**
1. User starts interview session
2. AI generates opening question
3. User responds via voice/video recording
4. AI analyzes response and asks follow-up
5. Continues for multiple rounds
6. Final feedback and scoring

**Video Recording:**
- Browser-based recording (WebM format)
- Chunked upload for large files
- Background processing (WebM → HLS conversion via FFmpeg)
- HLS streaming for playback
- Thumbnail generation

**Voice Processing:**
- Audio transcription (OpenAI Whisper API)
- Real-time AI response generation
- Interview question adaptation based on responses

**Implementation:**
- Interview logic: `server/routes.ts` (interview endpoints)
- AI service: `server/openai.ts`
- Video queue: `server/queues/videoQueue.ts`
- Video worker: `server/workers/videoWorker.ts`
- Frontend: `client/src/components/InterviewSession.tsx`

### 4. Job Matching & Applications

**AI Job Matching:**
- RAG-based job recommendations
- Profile-to-job similarity scoring
- Personalized job discovery

**Job Sources:**
- Synced from Airtable job listings
- External job board integrations

**Application Tracking:**
- Track applied jobs
- Application status updates
- Interview scheduling

**Implementation:**
- Job matching: `server/openai.ts` (RAG functions)
- Jobs sync: Airtable integration
- Application tracking: `applications` table

### 5. Career Coaching

**Features:**
- AI-powered career guidance chat
- Mock interview practice
- Job-specific interview preparation
- Career path recommendations

**AI Integration:**
- GPT-4 for conversational coaching
- Context-aware responses based on user profile
- Interview question generation

**Implementation:**
- Coaching endpoints: `server/routes.ts`
- AI service: `server/openai.ts`

---

## Database Schema

**Database:** PostgreSQL (via Drizzle ORM)

**Schema Location:** `/var/www/plato/ApplicantTracker/shared/schema.ts` (1172 lines)

### Core Tables

#### Users & Authentication

**`users`**
- `id` (serial, primary key)
- `email` (unique)
- `password` (hashed, nullable for OAuth users)
- `name`
- `googleId` (nullable, for OAuth)
- `emailVerified` (boolean)
- `emailVerificationToken`
- `passwordResetToken`
- `passwordResetExpires`
- `createdAt`, `updatedAt`

**`sessions`**
- Express session storage (Passport.js)
- `sid` (session ID, primary key)
- `sess` (JSON session data)
- `expire` (timestamp)

#### Applicant Data

**`applicant_profiles`**
- `id` (serial, primary key)
- `userId` (foreign key → users)
- `personalInfo` (JSON: name, email, phone, location)
- `summary` (text)
- `workExperience` (JSON array)
- `education` (JSON array)
- `skills` (JSON array)
- `certifications` (JSON array)
- `languages` (JSON array)
- `projects` (JSON array)
- `preferredJobTypes`, `preferredIndustries`
- `linkedInUrl`, `portfolioUrl`
- `createdAt`, `updatedAt`

**`resume_uploads`**
- `id` (serial, primary key)
- `userId` (foreign key → users)
- `fileName`
- `fileSize`
- `fileType`
- `gcsUrl` (Google Cloud Storage URL)
- `processedAt`
- `extractedData` (JSON)
- `createdAt`

#### Interview System

**`interview_sessions`**
- `id` (serial, primary key)
- `userId` (foreign key → users)
- `type` (enum: 'mock', 'career', 'job-specific')
- `jobId` (nullable, foreign key → jobs)
- `status` (enum: 'active', 'completed', 'abandoned')
- `conversation` (JSON: messages array)
- `overallFeedback` (text)
- `score` (integer 0-100)
- `startedAt`, `completedAt`
- `createdAt`, `updatedAt`

**`interview_recordings`**
- `id` (serial, primary key)
- `sessionId` (foreign key → interview_sessions)
- `recordingUrl` (GCS URL)
- `hlsUrl` (HLS master playlist URL)
- `thumbnailUrl`
- `duration` (seconds)
- `transcription` (text)
- `processingStatus` (enum: 'pending', 'processing', 'completed', 'failed')
- `createdAt`, `updatedAt`

#### Job Matching

**`jobs`**
- `id` (serial, primary key)
- `title`
- `description`
- `company`
- `location`
- `jobType` (full-time, part-time, etc.)
- `salaryRange`
- `requirements` (JSON array)
- `responsibilities` (JSON array)
- `benefits` (JSON array)
- `airtableId` (external sync ID)
- `createdAt`, `updatedAt`

**`job_matches`**
- `id` (serial, primary key)
- `userId` (foreign key → users)
- `jobId` (foreign key → jobs)
- `matchScore` (integer 0-100)
- `matchReason` (text)
- `aiAnalysis` (JSON)
- `status` (enum: 'new', 'viewed', 'applied', 'rejected')
- `createdAt`

**`applications`**
- `id` (serial, primary key)
- `userId` (foreign key → users)
- `jobId` (foreign key → jobs)
- `status` (enum: 'applied', 'interviewing', 'offered', 'rejected', 'accepted')
- `coverLetter` (text)
- `notes` (text)
- `appliedAt`
- `updatedAt`

### Schema Management

**Push schema changes:**
```bash
npm run db:push
```

**Drizzle configuration:**
- Auto-detects Neon vs local PostgreSQL based on `DATABASE_URL`
- Uses `@neondatabase/serverless` for Neon (WebSocket)
- Uses `pg` for local PostgreSQL (connection pool)

---

## API Endpoints

**Base URL:** `http://localhost:3000`

**Main Routes File:** `/var/www/plato/ApplicantTracker/server/routes.ts` (244KB!)

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user` | Get current authenticated user |
| POST | `/api/auth/login` | Local email/password login |
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/logout` | Log out current user |
| GET | `/api/auth/google` | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/change-password` | Change password (authenticated) |

### Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidate/profile` | Get current user's profile |
| POST | `/api/candidate/profile` | Create new profile |
| PUT | `/api/candidate/profile` | Update existing profile |
| DELETE | `/api/candidate/profile` | Delete profile |

### Resume Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidate/resume` | Upload resume file |
| POST | `/api/resume/process` | Process resume with AI |
| GET | `/api/resume/uploads` | List user's uploaded resumes |
| GET | `/api/resume/:id` | Get specific resume details |
| DELETE | `/api/resume/:id` | Delete resume upload |

**Resume Process Flow:**
1. POST to `/api/candidate/resume` with multipart form data
2. File stored in Google Cloud Storage
3. POST to `/api/resume/process` with resume ID
4. AI extracts data and creates/updates profile

### AI Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start/:type` | Start interview session (type: mock, career, job-specific) |
| POST | `/api/interview/respond` | Submit response to interview question |
| POST | `/api/interview/complete` | Complete interview session |
| GET | `/api/interview/sessions` | List user's interview sessions |
| GET | `/api/interview/session/:id` | Get specific interview session |
| POST | `/api/interview/upload-recording` | Upload video/audio recording |
| GET | `/api/interview/video-status/:sessionId` | Check video processing status |
| GET | `/api/interview/recording/:sessionId` | Get interview recording details |

**Interview Flow Example:**
```javascript
// 1. Start interview
POST /api/interview/start/mock
Response: {
  sessionId: 123,
  firstQuestion: "Tell me about yourself..."
}

// 2. Submit responses
POST /api/interview/respond
Body: {
  sessionId: 123,
  answer: "I am a software engineer with 5 years..."
}
Response: {
  nextQuestion: "What are your strengths?",
  feedback: "Good response..."
}

// 3. Upload recording (optional)
POST /api/interview/upload-recording
Body: FormData with video blob + sessionId

// 4. Complete interview
POST /api/interview/complete
Body: { sessionId: 123 }
Response: {
  overallFeedback: "...",
  score: 85
}
```

### Job Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/job-matches` | Get AI-generated job matches |
| POST | `/api/job-matches/refresh` | Trigger new job matching |
| GET | `/api/jobs` | List all available jobs |
| GET | `/api/jobs/:id` | Get specific job details |
| POST | `/api/jobs/:id/match` | Get match score for specific job |

### Application Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List user's applications |
| POST | `/api/applications` | Submit job application |
| PUT | `/api/applications/:id` | Update application status |
| DELETE | `/api/applications/:id` | Withdraw application |

### Career Coaching

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coaching/career-guidance` | Get AI career guidance |
| POST | `/api/coaching/mock-interview` | Start AI mock interview chat |
| POST | `/api/coaching/job-interview-prep` | Job-specific interview prep |

**Request Example:**
```javascript
POST /api/coaching/career-guidance
Body: {
  question: "Should I transition from frontend to full-stack?",
  context: { currentRole: "Frontend Developer", yearsExperience: 3 }
}
Response: {
  advice: "...",
  actionItems: ["Learn Node.js", "Build full-stack project"]
}
```

---

## External Integrations

### 1. OpenAI API

**Usage:**
- AI interview question generation
- Resume parsing and data extraction
- Profile analysis and improvement suggestions
- Job matching and recommendations
- Career coaching conversations
- Transcription (Whisper API)

**Models Used:**
- `gpt-4` - Complex reasoning tasks
- `gpt-3.5-turbo` - Faster, simpler tasks
- `whisper-1` - Audio transcription

**Configuration:**
```typescript
// server/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

**Key Functions:**
- `generateInterviewQuestion()` - Creates interview questions
- `analyzeInterviewResponse()` - Evaluates answers
- `parseResume()` - Extracts structured data from resumes
- `matchJobsToProfile()` - RAG-based job matching

### 2. Google Cloud Storage (GCS)

**Usage:**
- Resume file storage
- Interview recording storage
- User assessment documents
- Career insight uploads

**Bucket Structure:**
```
plato-applicant-tracker/
├── resumes/
│   └── userId_timestamp.pdf
├── recordings/
│   ├── sessionId.webm (original)
│   └── sessionId/ (HLS files)
│       ├── master.m3u8
│       ├── 720p.m3u8
│       └── *.ts
├── assessments/
└── career-insights/
```

**Configuration:**
```bash
# Environment variables
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_BUCKET_NAME=plato-applicant-tracker
```

**Implementation:** `server/storage.ts`

### 3. SendGrid Email Service

**Usage:**
- Email verification emails
- Password reset emails
- Interview reminder notifications
- Application status updates

**Email Templates:**
- Verification email with token link
- Password reset with secure token
- Interview scheduled reminder

**Configuration:**
```bash
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@plato.com
```

**Implementation:** `server/emailService.ts`

**Note:** Gracefully degrades if API key not provided (logs to console instead)

### 4. Google OAuth 2.0

**Usage:**
- One-click social login
- User profile information retrieval

**OAuth Flow:**
1. User clicks "Sign in with Google"
2. Redirect to `/api/auth/google`
3. Google authentication
4. Callback to `/api/auth/google/callback`
5. Create/link user account
6. Set session and redirect to dashboard

**Configuration:**
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**Implementation:** `server/auth.ts` (Passport Google Strategy)

### 5. Airtable (Job Listings Sync)

**Usage:**
- External job listings import
- Periodic sync of job data

**Sync Process:**
- Scheduled job pulls from Airtable
- Updates `jobs` table
- Maintains `airtableId` for deduplication

**Note:** Check implementation details in `server/routes.ts`

### 6. Stripe (Payment Processing)

**Usage:**
- Premium subscription payments (if implemented)
- One-time purchases (e.g., premium interview prep)

**Configuration:**
```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**Note:** Integration present but may not be fully implemented

---

## Background Jobs

### BullMQ Queue System

**Technology:** BullMQ 5.66.2 + Redis (ioredis)

**Why BullMQ:**
- Reliable job processing
- Automatic retries on failure
- Job progress tracking
- Delayed jobs support
- Priority queues

### Video Processing Queue

**Queue Definition:** `server/queues/videoQueue.ts`

**Worker:** `server/workers/videoWorker.ts`

**Job Type:** `processVideo`

**Process:**
1. User uploads WebM recording
2. Job added to `videoQueue`
3. Worker picks up job
4. FFmpeg converts WebM → HLS format (multiple quality levels)
5. Generates thumbnail image
6. Updates `interview_recordings` table with URLs
7. Marks job as complete

**FFmpeg Command Example:**
```bash
ffmpeg -i input.webm \
  -c:v libx264 -c:a aac \
  -f hls -hls_time 10 -hls_playlist_type vod \
  -hls_segment_filename "output_%03d.ts" \
  output.m3u8
```

**Job Data:**
```typescript
{
  recordingId: number,
  inputPath: string,
  outputDir: string,
  sessionId: number
}
```

**Retry Strategy:**
- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)

**Redis Configuration:**
```bash
REDIS_URL=redis://localhost:6379
```

**Running the Worker:**
```bash
# Worker runs automatically with server
npm run dev

# Or run separately
node server/workers/videoWorker.js
```

---

## Setup & Configuration

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL (local or Neon account)
- Redis server (for BullMQ)
- Google Cloud Platform account (for GCS)
- OpenAI API account
- SendGrid account (optional)
- Google OAuth credentials (optional)

### Installation Steps

**1. Clone and Install:**
```bash
cd /var/www/plato/ApplicantTracker
npm install
```

**2. Environment Variables:**

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/applicant_tracker
# OR for Neon:
# DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/applicant_tracker?sslmode=require

# Server
PORT=3000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-xxx

# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_BUCKET_NAME=plato-applicant-tracker

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-secret-key-change-in-production

# SendGrid (optional)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourapp.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**3. Database Setup:**
```bash
# Push schema to database
npm run db:push

# Verify connection
npm run check
```

**4. Google Cloud Storage Setup:**
- Create GCS bucket
- Download service account JSON key
- Set `GOOGLE_APPLICATION_CREDENTIALS` path
- Configure bucket CORS (if needed)

**5. Redis Setup:**
```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Or use Docker
docker run -d -p 6379:6379 redis:alpine

# Verify
redis-cli ping
# Should return: PONG
```

**6. Start Development Server:**
```bash
npm run dev
```

Server starts at: `http://localhost:3000`

**7. Verify Setup:**
- Visit `http://localhost:3000`
- Create test account
- Upload sample resume
- Start mock interview

### Production Deployment

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm run start
```

**Environment Checklist:**
- [ ] Use production database (Neon recommended)
- [ ] Set strong `SESSION_SECRET`
- [ ] Use production OpenAI API key
- [ ] Configure production GCS bucket
- [ ] Set `NODE_ENV=production`
- [ ] Use managed Redis (ElastiCache, Redis Cloud)
- [ ] Enable HTTPS
- [ ] Set proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Monitor OpenAI API usage and costs

---

## Development Workflow

### Running the App

**Development mode (hot reload):**
```bash
npm run dev
```
- Backend starts with nodemon (auto-restart on changes)
- Frontend starts with Vite HMR
- Full stack runs on port 3000

**Type checking:**
```bash
npm run check
```

**Build for production:**
```bash
npm run build
```

### Database Migrations

**Push schema changes:**
```bash
npm run db:push
```

**Edit schema:**
1. Modify `shared/schema.ts`
2. Run `npm run db:push`
3. Verify changes in database

**Note:** Drizzle doesn't use migration files - it directly syncs schema

### Adding New Features

**1. Add Database Table:**
```typescript
// shared/schema.ts
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  // ... columns
});
```

**2. Push to Database:**
```bash
npm run db:push
```

**3. Add API Endpoint:**
```typescript
// server/routes.ts
app.get('/api/new-feature', async (req, res) => {
  const data = await db.select().from(newTable);
  res.json(data);
});
```

**4. Create Frontend Component:**
```typescript
// client/src/pages/NewFeature.tsx
export default function NewFeature() {
  const { data } = useQuery({
    queryKey: ['newFeature'],
    queryFn: () => fetch('/api/new-feature').then(r => r.json())
  });
  // ...
}
```

**5. Add Route:**
```typescript
// client/src/App.tsx
import NewFeature from './pages/NewFeature';

<Route path="/new-feature" component={NewFeature} />
```

### Testing

**Manual Testing Workflow:**
1. Create test user account
2. Upload sample resume (PDF/DOCX)
3. Verify profile auto-generation
4. Start mock interview
5. Record sample response
6. Check video processing status
7. View job matches
8. Apply to test job

**API Testing:**
```bash
# Use curl or Postman

# Test auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password"}'

# Test profile
curl http://localhost:3000/api/candidate/profile \
  -H "Cookie: connect.sid=xxx"
```

### Debugging

**Backend Debugging:**
- Logs output to console
- Check `server/index.ts` for error handlers
- Use `console.log()` in route handlers
- Check BullMQ dashboard for job failures

**Frontend Debugging:**
- React DevTools browser extension
- TanStack Query DevTools (built-in)
- Browser console for errors
- Network tab for API calls

**Database Debugging:**
```typescript
// Enable Drizzle query logging
import { drizzle } from 'drizzle-orm/node-postgres';
const db = drizzle(pool, { logger: true });
```

**Redis/Queue Debugging:**
```bash
# Check Redis
redis-cli
> KEYS *
> GET key_name

# BullMQ UI (if installed)
# Visit http://localhost:3000/admin/queues
```

---

## Important Files Reference

### Entry Points

| File | Purpose |
|------|---------|
| `/server/index.ts` | Backend server entry point |
| `/client/src/main.tsx` | Frontend React entry point |
| `/client/src/App.tsx` | Main React app component |

### Core Backend Files

| File | Lines | Purpose |
|------|-------|---------|
| `/server/routes.ts` | 244KB | **Main API routes** - all endpoints |
| `/server/auth.ts` | - | Authentication logic (Passport strategies) |
| `/server/openai.ts` | - | OpenAI service integration |
| `/server/storage.ts` | - | Data access layer (database queries) |
| `/server/db.ts` | - | Database connection setup |
| `/server/emailService.ts` | - | SendGrid email integration |
| `/server/resumeService.ts` | - | Resume parsing & processing |

### Background Jobs

| File | Purpose |
|------|---------|
| `/server/queues/videoQueue.ts` | BullMQ video queue definition |
| `/server/workers/videoWorker.ts` | Video processing worker |

### Database

| File | Lines | Purpose |
|------|-------|---------|
| `/shared/schema.ts` | 1172 | **Complete database schema** |

### Configuration

| File | Purpose |
|------|---------|
| `/package.json` | Dependencies and scripts |
| `/tsconfig.json` | TypeScript configuration |
| `/vite.config.ts` | Vite build configuration |
| `/.env` | Environment variables (not in git) |

### Frontend Pages (Examples)

| File | Purpose |
|------|---------|
| `/client/src/pages/Dashboard.tsx` | Main dashboard |
| `/client/src/pages/Profile.tsx` | Profile management |
| `/client/src/pages/Interview.tsx` | Interview interface |
| `/client/src/pages/JobMatches.tsx` | Job matching page |
| `/client/src/pages/Applications.tsx` | Application tracking |

### Frontend Components (Examples)

| File | Purpose |
|------|---------|
| `/client/src/components/InterviewSession.tsx` | Interview UI component |
| `/client/src/components/ProfileForm.tsx` | Profile editing form |
| `/client/src/components/ResumeUpload.tsx` | Resume upload component |
| `/client/src/components/VideoRecorder.tsx` | Video recording component |

---

## Common Issues & Troubleshooting

### Database Connection Issues

**Problem:** `ECONNREFUSED` or connection timeout

**Solutions:**
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` format
- For Neon: Ensure `?sslmode=require` in connection string
- Check firewall rules

### Redis Connection Failed

**Problem:** BullMQ jobs not processing

**Solutions:**
- Start Redis: `brew services start redis`
- Verify Redis: `redis-cli ping`
- Check `REDIS_URL` environment variable
- Ensure port 6379 not blocked

### OpenAI API Errors

**Problem:** 429 Too Many Requests or 401 Unauthorized

**Solutions:**
- Check API key is valid
- Verify billing is set up in OpenAI account
- Check rate limits on OpenAI dashboard
- Implement request throttling if needed

### Video Processing Failures

**Problem:** Videos stuck in "processing" status

**Solutions:**
- Check FFmpeg is installed: `ffmpeg -version`
- Check worker is running
- View BullMQ failed jobs in Redis
- Check disk space for temp files
- Verify GCS upload permissions

### File Upload Errors

**Problem:** Resume upload fails

**Solutions:**
- Check file size limits (configured in routes)
- Verify GCS credentials path
- Check bucket permissions
- Verify bucket CORS configuration

### Session/Auth Issues

**Problem:** User logged out unexpectedly

**Solutions:**
- Check `SESSION_SECRET` is set
- Verify session table exists in database
- Check cookie settings in production (secure flag)
- Clear browser cookies and retry

---

## Next Steps for New Developer

1. **Environment Setup:**
   - [ ] Install all prerequisites
   - [ ] Configure `.env` file
   - [ ] Run database migrations
   - [ ] Test local development server

2. **Code Familiarization:**
   - [ ] Read `shared/schema.ts` to understand data model
   - [ ] Review `server/routes.ts` for API endpoints
   - [ ] Explore `client/src/pages/` for user flows
   - [ ] Check `server/openai.ts` for AI integration patterns

3. **Test Core Features:**
   - [ ] Create test account
   - [ ] Upload resume and verify parsing
   - [ ] Complete mock interview
   - [ ] Test video recording and playback
   - [ ] View job matches

4. **Documentation Deep Dive:**
   - [ ] Review all TODO comments in codebase
   - [ ] Check for FIXME notes
   - [ ] Identify incomplete features
   - [ ] Document any unclear logic

5. **Connect External Services:**
   - [ ] Set up Google Cloud Storage
   - [ ] Configure SendGrid (or alternative)
   - [ ] Set up Google OAuth
   - [ ] Configure Stripe (if needed)

6. **Monitoring & Debugging:**
   - [ ] Set up error tracking (Sentry recommended)
   - [ ] Configure logging
   - [ ] Set up BullMQ monitoring
   - [ ] Monitor OpenAI API costs

---

## Support & Resources

**Official Documentation:**
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Drizzle ORM: https://orm.drizzle.team/
- BullMQ: https://docs.bullmq.io/
- OpenAI API: https://platform.openai.com/docs/
- TailwindCSS: https://tailwindcss.com/docs

**Project-Specific:**
- Database Schema: `/var/www/plato/ApplicantTracker/shared/schema.ts`
- API Routes: `/var/www/plato/ApplicantTracker/server/routes.ts`
- Main Entry: `/var/www/plato/ApplicantTracker/server/index.ts`

**Troubleshooting:**
- Check console logs for errors
- Review BullMQ job queue for failures
- Verify all environment variables are set
- Test external API connections separately

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
**Codebase Location:** `/var/www/plato/ApplicantTracker/`
