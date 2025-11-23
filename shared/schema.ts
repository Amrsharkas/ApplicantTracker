import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { TERMS_OF_SERVICE_TEXT } from "./terms";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Unified users table - combining both project schemas
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email").notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  username: varchar("username").unique(),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  isVerified: boolean("is_verified").notNull().default(false),
  passwordNeedsSetup: boolean("password_needs_setup").notNull().default(false),
  verificationToken: varchar("verification_token"),
  resetPasswordToken: varchar("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsAcceptedText: text("terms_accepted_text"),
  // Google OAuth fields
  googleId: varchar("google_id"),
  authProvider: varchar("auth_provider").default("local"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table (from HiringIntelligence)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: varchar("url").notNull().unique(),
  companyName: varchar("company_name").notNull(),
  industry: varchar("industry"),
  companySize: varchar("company_size"),
  description: text("description"),
  ownerId: varchar("owner_id"),
  // Separate credit balances for different action types
  cvProcessingCredits: integer("cv_processing_credits").notNull().default(0),
  interviewCredits: integer("interview_credits").notNull().default(0),
  // Legacy fields - kept for backward compatibility
  creditLimit: integer("credit_limit").notNull().default(0),
  currentCredits: integer("current_credits").notNull().default(0),
  // Subscription fields
  subscriptionStatus: varchar("subscription_status").default("inactive"), // active, inactive, trial, past_due, canceled
  currentSubscriptionId: varchar("current_subscription_id"),
  jobPostsUsed: integer("job_posts_used").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar("organization_id").notNull(),
  amount: integer("amount").notNull(),
  type: varchar("type").notNull(), // 'cv_processing', 'interview', 'manual_adjustment', 'subscription', 'purchase'
  actionType: varchar("action_type"), // 'resume_processing', 'interview_scheduling', etc. - specific action within type
  description: text("description"),
  relatedId: varchar("related_id"), // Can reference resume profile ID or other entities
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit pricing table - defines how much each action costs
export const creditPricing = pgTable("credit_pricing", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actionType: varchar("action_type").notNull().unique(), // 'resume_processing', 'ai_matching', etc.
  cost: integer("cost").notNull(), // How many credits this action costs
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit packages table - predefined credit bundles for purchase
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(), // e.g., "CV Processing Pack", "Interview Pack"
  description: text("description"),
  creditType: varchar("credit_type").notNull(), // 'cv_processing' or 'interview'
  creditAmount: integer("credit_amount").notNull(), // Number of credits in this package
  price: integer("price").notNull(), // Price in cents (e.g., 1000 = $10.00)
  currency: varchar("currency").notNull().default("EGP"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // For display ordering
  stripePriceId: varchar("stripe_price_id"), // Stripe price ID for this package
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans table - monthly/yearly subscription tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(), // Starter, Growth, Pro, Enterprise
  description: text("description"),
  monthlyPrice: integer("monthly_price").notNull(), // in cents (EGP)
  yearlyPrice: integer("yearly_price").notNull(), // with 18% discount
  // Separate monthly credits for different action types
  monthlyCvCredits: integer("monthly_cv_credits").notNull(), // CV processing credits per month
  monthlyInterviewCredits: integer("monthly_interview_credits").notNull(), // Interview credits per month
  // Legacy field - kept for backward compatibility
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  jobPostsLimit: integer("job_posts_limit"), // null = unlimited
  supportLevel: varchar("support_level").notNull(), // standard, priority, dedicated
  features: jsonb("features"), // Additional feature flags
  stripePriceIdMonthly: varchar("stripe_price_id_monthly"),
  stripePriceIdYearly: varchar("stripe_price_id_yearly"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization subscriptions table
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar("organization_id").notNull(),
  subscriptionPlanId: varchar("subscription_plan_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  status: varchar("status").notNull(), // active, canceled, past_due, trialing, incomplete
  billingCycle: varchar("billing_cycle").notNull(), // monthly, yearly
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription invoices table - track all subscription billing
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationSubscriptionId: varchar("organization_subscription_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  stripeInvoiceId: varchar("stripe_invoice_id").unique(),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").notNull().default("EGP"),
  status: varchar("status").notNull(), // paid, open, void, uncollectible
  // Separate credit allocations for different action types
  cvCreditsAllocated: integer("cv_credits_allocated").notNull().default(0),
  interviewCreditsAllocated: integer("interview_credits_allocated").notNull().default(0),
  // Legacy field - kept for backward compatibility
  creditsAllocated: integer("credits_allocated").notNull().default(0),
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit expirations table - track credit expiry (45 days)
export const creditExpirations = pgTable("credit_expirations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar("organization_id").notNull(),
  creditType: varchar("credit_type").notNull(), // 'cv_processing' or 'interview'
  creditAmount: integer("credit_amount").notNull(),
  source: varchar("source").notNull(), // subscription, purchase
  sourceId: varchar("source_id"), // subscription_invoice_id or payment_transaction_id
  expiresAt: timestamp("expires_at").notNull(),
  remainingCredits: integer("remaining_credits").notNull(),
  isExpired: boolean("is_expired").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment transactions table - stores all payment attempts and records
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar("organization_id").notNull(),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  creditPackageId: varchar("credit_package_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency").notNull().default("USD"),
  status: varchar("status").notNull(), // 'pending', 'succeeded', 'failed', 'canceled', 'refunded'
  paymentMethod: varchar("payment_method"), // e.g., 'card', 'apple_pay', 'google_pay'
  creditsPurchased: integer("credits_purchased").notNull(),
  creditsAdded: integer("credits_added").default(0), // Actual credits added to account
  failureReason: text("failure_reason"),
  refundedAmount: integer("refunded_amount").default(0), // Amount refunded in cents
  refundedCredits: integer("refunded_credits").default(0), // Credits refunded
  metadata: jsonb("metadata"), // Additional payment metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When payment was completed
});

// Payment attempts table - tracks all payment attempts for analytics
export const paymentAttempts = pgTable("payment_attempts", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar("organization_id").notNull(),
  transactionId: varchar("transaction_id"), // Link to payment_transactions if successful
  creditPackageId: varchar("credit_package_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency").notNull().default("USD"),
  status: varchar("status").notNull(), // 'initiated', 'succeeded', 'failed', 'abandoned'
  failureReason: text("failure_reason"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Organization members table
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id"),
  userId: varchar("user_id"),
  role: varchar("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization invitations table
export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id"),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("member"),
  token: varchar("token").notNull().unique(),
  inviteCode: varchar("invite_code").notNull().unique(),
  invitedBy: varchar("invited_by"),
  status: varchar("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Unified jobs table - combining both project schemas
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  location: varchar("location"),
  salaryRange: varchar("salary_range"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryNegotiable: boolean("salary_negotiable").default(false),
  softSkills: text("soft_skills").array(),
  technicalSkills: text("technical_skills").array(),
  employerQuestions: text("employer_questions").array(),
  aiPrompt: text("ai_prompt"),
  scoreMatchingThreshold: integer("score_matching_threshold").notNull().default(30),
  emailInviteThreshold: integer("email_invite_threshold").notNull().default(30),
  employmentType: varchar("employment_type").notNull(),
  workplaceType: varchar("workplace_type").notNull(),
  seniorityLevel: varchar("seniority_level").notNull(),
  industry: varchar("industry").notNull(),
  languagesRequired: jsonb("languages_required"),
  interviewLanguage: varchar("interview_language"),
  certifications: text("certifications"),
  organizationId: varchar("organization_id"),
  createdById: varchar("created_by_id"),
  is_active: boolean("is_active").notNull().default(true),
  views: integer("views").notNull().default(0),
  company: varchar("company"),
  experienceLevel: varchar("experience_level"),
  skills: text("skills").array(),
  jobType: varchar("job_type"),
  benefits: text("benefits"),
  airtableRecordId: varchar("airtable_record_id"),
  postedAt: timestamp("posted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table (from HiringIntelligence)
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique().notNull(),
  profileImageUrl: varchar("profile_image_url"),
  title: varchar("title"),
  location: varchar("location"),
  summary: text("summary"),
  skills: text("skills").array(),
  experience: text("experience"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Matches table (from HiringIntelligence)
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  candidateId: integer("candidate_id"),
  matchScore: integer("match_score").notNull(),
  matchReasoning: text("match_reasoning"),
  skillGaps: text("skill_gaps").array(),
  culturalFit: integer("cultural_fit"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Candidate applications table (from HiringIntelligence)
export const candidateApplications = pgTable("candidate_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  candidateId: varchar("candidate_id"),
  candidateName: varchar("candidate_name").notNull(),
  status: varchar("status").notNull().default("pending"),
  matchScore: integer("match_score"),
  matchReasoning: text("match_reasoning"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Interviews table (from HiringIntelligence)
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"),
  jobId: integer("job_id"),
  candidateId: varchar("candidate_id"),
  candidateName: varchar("candidate_name").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  interviewType: varchar("interview_type").default("video"),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  status: varchar("status").default("scheduled"),
  interviewVideoUrl: text("interview_video_url"), // HLS playlist URL for recorded interviews
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applicant profiles table (from ApplicantTracker)
export const applicantProfiles = pgTable("applicant_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),

  // General Information
  name: varchar("name"),
  birthdate: date("birthdate"),
  gender: varchar("gender"),
  nationality: varchar("nationality"),
  maritalStatus: varchar("marital_status"),
  dependents: integer("dependents"),
  militaryStatus: varchar("military_status"),

  // Location & Address
  country: varchar("country"),
  city: varchar("city"),
  address: varchar("address"),
  zipCode: varchar("zip_code"),
  willingToRelocate: boolean("willing_to_relocate"),

  // Contact Information
  phone: varchar("phone"),
  email: varchar("email"),

  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactRelationship: varchar("emergency_contact_relationship"),
  emergencyContactPhone: varchar("emergency_contact_phone"),

  // Government ID
  idType: varchar("id_type"),
  idNumber: varchar("id_number"),
  idExpiryDate: varchar("id_expiry_date"),
  idIssuingAuthority: varchar("id_issuing_authority"),
  idVerified: boolean("id_verified").default(false),

  // Career Interests
  careerLevel: varchar("career_level"),
  jobTypes: text("job_types").array(),
  workplaceSettings: varchar("workplace_settings"),
  jobTitles: text("job_titles").array(),
  jobCategories: text("job_categories").array(),
  minimumSalary: integer("minimum_salary"),
  hideSalaryFromCompanies: boolean("hide_salary_from_companies").default(false),
  preferredWorkCountries: text("preferred_work_countries").array(),
  jobSearchStatus: varchar("job_search_status"),

  // Work Eligibility
  workAuthorization: varchar("work_authorization"),
  visaStatus: varchar("visa_status"),
  visaExpiryDate: varchar("visa_expiry_date"),
  sponsorshipRequired: boolean("sponsorship_required"),
  availabilityDate: varchar("availability_date"),
  noticePeriod: varchar("notice_period"),
  travelWillingness: varchar("travel_willingness"),

  // Experience
  totalYearsOfExperience: integer("total_years_of_experience"),
  workExperiences: jsonb("work_experiences"),
  languages: jsonb("languages"),

  // Skills
  skillsData: jsonb("skills_data"),

  // Education
  currentEducationLevel: varchar("current_education_level"),
  degrees: jsonb("degrees"),
  highSchools: jsonb("high_schools"),
  certifications: jsonb("certifications"),
  trainingCourses: jsonb("training_courses"),

  // Online Presence
  linkedinUrl: varchar("linkedin_url"),
  facebookUrl: varchar("facebook_url"),
  twitterUrl: varchar("twitter_url"),
  instagramUrl: varchar("instagram_url"),
  githubUrl: varchar("github_url"),
  youtubeUrl: varchar("youtube_url"),
  websiteUrl: varchar("website_url"),
  otherUrls: text("other_urls").array(),

  // Achievements
  achievements: text("achievements"),

  // Legacy fields
  age: integer("age"),
  education: text("education"),
  university: varchar("university"),
  degree: varchar("degree"),
  location: varchar("location"),
  currentRole: varchar("current_role"),
  company: varchar("company"),
  yearsOfExperience: integer("years_of_experience"),
  resumeUrl: varchar("resume_url"),
  resumeContent: text("resume_content"),
  summary: text("summary"),
  skillsList: text("skills_list").array(),

  // AI profiles
  aiProfile: jsonb("ai_profile"),
  aiProfileGenerated: boolean("ai_profile_generated").default(false),
  honestProfile: jsonb("honest_profile"),
  honestProfileGenerated: boolean("honest_profile_generated").default(false),
  profileGeneratedAt: timestamp("profile_generated_at"),

  // New AI profile from static questions
  staticQuestionsAnswers: jsonb("static_questions_answers"),
  newAiProfile: jsonb("new_ai_profile"),
  newAiProfileGenerated: boolean("new_ai_profile_generated").default(false),
  staticQuestionsCompletedAt: timestamp("static_questions_completed_at"),

  personalInterviewCompleted: boolean("personal_interview_completed").default(false),
  professionalInterviewCompleted: boolean("professional_interview_completed").default(false),
  technicalInterviewCompleted: boolean("technical_interview_completed").default(false),
  completionPercentage: integer("completion_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job matches table (from ApplicantTracker)
export const jobMatches = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  jobId: integer("job_id"),
  matchScore: real("match_score").notNull(),
  matchReasons: text("match_reasons").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications table (from ApplicantTracker)
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  jobId: integer("job_id"),
  status: varchar("status").default("applied"),
  appliedAt: timestamp("applied_at").defaultNow(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
});

// Resume uploads table (from ApplicantTracker)
export const resumeUploads = pgTable("resume_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  extractedText: text("extracted_text"),
  aiAnalysis: jsonb("ai_analysis"),
  isActive: boolean("is_active").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Interview sessions table (from ApplicantTracker)
export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  interviewType: varchar("interview_type").notNull(),
  sessionData: jsonb("session_data").notNull(),
  isCompleted: boolean("is_completed").default(false),
  generatedProfile: jsonb("generated_profile"),
  resumeContext: jsonb("resume_context"),
  interviewVideoUrl: text("interview_video_url"), // HLS playlist URL for recorded interviews
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const interviewRecordings = pgTable("interview_recordings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: varchar("user_id"),
  jobMatchId: varchar("job_match_id"),
  recordingPath: varchar("recording_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Additional tables from HiringIntelligence
export const acceptedApplicants = pgTable("accepted_applicants", {
  id: serial("id").primaryKey(),
  candidateId: varchar("candidate_id"),
  candidateName: varchar("candidate_name"),
  candidateEmail: varchar("candidate_email"),
  jobId: varchar("job_id"),
  jobTitle: varchar("job_title"),
  organizationId: varchar("organization_id"),
  acceptedBy: varchar("accepted_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const realInterviews = pgTable("real_interviews", {
  id: varchar("id").primaryKey().notNull(),
  candidateName: varchar("candidate_name").notNull(),
  candidateEmail: varchar("candidate_email"),
  candidateId: varchar("candidate_id"),
  jobId: varchar("job_id"),
  jobTitle: varchar("job_title"),
  scheduledDate: varchar("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  timeZone: varchar("time_zone").default('UTC'),
  interviewType: varchar("interview_type").default('video'),
  meetingLink: varchar("meeting_link"),
  interviewer: varchar("interviewer"),
  status: varchar("status").default('scheduled'),
  notes: text("notes"),
  organizationId: varchar("organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scoredApplicants = pgTable("scored_applicants", {
  id: serial("id").primaryKey(),
  applicantId: varchar("applicant_id").unique(),
  matchScore: integer("match_score"),
  matchSummary: text("match_summary"),
  technicalSkillsScore: integer("technical_skills_score"),
  experienceScore: integer("experience_score"),
  culturalFitScore: integer("cultural_fit_score"),
  jobId: varchar("job_id"),
  organizationId: varchar("organization_id"),
  scoredAt: timestamp("scored_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resumeProfiles = pgTable("resume_profiles", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  summary: text("summary"),
  experience: jsonb("experience").$type<string[]>(),
  skills: jsonb("skills").$type<string[]>(),
  education: jsonb("education").$type<string[]>(),
  certifications: jsonb("certifications").$type<string[]>(),
  languages: jsonb("languages").$type<string[]>(),
  resumeText: text("resume_text").notNull(),
  fileId: varchar("file_id"),
  organizationId: varchar("organization_id"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resumeJobScores = pgTable("resume_job_scores", {
  id: serial("id").primaryKey(),
  profileId: varchar("profile_id"),
  jobId: integer("job_id"),
  overallScore: integer("overall_score"),
  technicalSkillsScore: integer("technical_skills_score"),
  experienceScore: integer("experience_score"),
  culturalFitScore: integer("cultural_fit_score"),
  matchSummary: text("match_summary"),
  strengthsHighlights: jsonb("strengths_highlights").$type<string[]>(),
  improvementAreas: jsonb("improvement_areas").$type<string[]>(),
  disqualified: boolean("disqualified"),
  disqualificationReason: text("disqualification_reason"),
  redFlags: jsonb("red_flags").$type<Array<{ issue: string; evidence: string; reason: string }>>(),
  fullResponse: jsonb("full_response"),
  scoredAt: timestamp("scored_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shortlistedApplicants = pgTable("shortlisted_applicants", {
  id: text("id").primaryKey().notNull(),
  employerId: text("employer_id"),
  applicantId: text("applicant_id"),
  applicantName: text("applicant_name"),
  jobTitle: text("job_title"),
  jobId: text("job_id"),
  note: text("note"),
  dateShortlisted: timestamp("date_shortlisted").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenAI requests table (common to both)
export const openaiRequests = pgTable("openai_requests", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestType: varchar("request_type").notNull(),
  model: varchar("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  cost: real("cost").notNull().default(0),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  status: varchar("status").notNull().default("success"),
  errorMessage: text("error_message"),
  userId: varchar("user_id"),
  organizationId: varchar("organization_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verificationToken: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to create an account" }),
  }),
  acceptedTermsText: z
    .string()
    .refine((value) => value === TERMS_OF_SERVICE_TEXT, {
      message: "Submitted terms do not match the current Terms of Service",
    }),
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export type Organization = typeof organizations.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
export type CreditPricing = typeof creditPricing.$inferSelect;
export type InsertCreditPricing = typeof creditPricing.$inferInsert;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type InsertPaymentAttempt = typeof paymentAttempts.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertOrganizationSubscription = typeof organizationSubscriptions.$inferInsert;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = typeof subscriptionInvoices.$inferInsert;
export type CreditExpiration = typeof creditExpirations.$inferSelect;
export type InsertCreditExpiration = typeof creditExpirations.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
export type InsertApplicantProfile = typeof applicantProfiles.$inferInsert;
export type UpdateApplicantProfile = Partial<InsertApplicantProfile>;
export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type ResumeUpload = typeof resumeUploads.$inferSelect;
export type InsertResumeUpload = z.infer<typeof insertResumeUploadSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewRecording = typeof interviewRecordings.$inferSelect;
export type InsertInterviewRecording = z.infer<typeof insertInterviewRecordingSchema>;
export type OpenAIRequest = typeof openaiRequests.$inferSelect;

// Additional type definitions for HiringIntelligence compatibility
export type UpsertUser = InsertUser;
export type InsertOrganization = typeof organizations.$inferInsert;
export type InsertJob = typeof jobs.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type CandidateApplication = typeof candidateApplications.$inferSelect;
export type InsertCandidateApplication = typeof candidateApplications.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;
export type ShortlistedApplicant = typeof shortlistedApplicants.$inferSelect;
export type InsertShortlistedApplicant = typeof shortlistedApplicants.$inferInsert;
export type AcceptedApplicant = typeof acceptedApplicants.$inferSelect;
export type InsertAcceptedApplicant = typeof acceptedApplicants.$inferInsert;
export type RealInterview = typeof realInterviews.$inferSelect;
export type InsertRealInterview = typeof realInterviews.$inferInsert;
export type ScoredApplicant = typeof scoredApplicants.$inferSelect;
export type InsertScoredApplicant = typeof scoredApplicants.$inferInsert;
export type ResumeProfile = typeof resumeProfiles.$inferSelect;
export type InsertResumeProfile = typeof resumeProfiles.$inferInsert;
export type ResumeJobScore = typeof resumeJobScores.$inferSelect;
export type InsertResumeJobScore = typeof resumeJobScores.$inferInsert;
export type InsertOpenAIRequest = typeof openaiRequests.$inferInsert;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = typeof organizationInvitations.$inferInsert;

export const insertOrganizationSchema = createInsertSchema(organizations, {
  url: (schema) => schema.trim().min(1, "Organization URL is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertCreditPricingSchema = createInsertSchema(creditPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertPaymentAttemptSchema = createInsertSchema(paymentAttempts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSubscriptionSchema = createInsertSchema(organizationSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditExpirationSchema = createInsertSchema(creditExpirations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({
  id: true,
  token: true,
  status: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
});

export const insertInterviewRecordingSchema = createInsertSchema(interviewRecordings).omit({
  id: true,
  createdAt: true,
});

export const insertJobMatchSchema = createInsertSchema(jobMatches).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedAt: true,
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertResumeUploadSchema = createInsertSchema(resumeUploads).omit({
  id: true,
  uploadedAt: true,
});

// Airtable replacement tables
export const airtableUserProfiles = pgTable("airtable_user_profiles", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  userId: varchar("user_id").unique().notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  professionalSummary: text("professional_summary"),
  workExperience: jsonb("work_experience"),
  education: jsonb("education"),
  skills: text("skills").array(),
  interviewScore: integer("interview_score"),
  salaryExpectation: varchar("salary_expectation"),
  experienceLevel: varchar("experience_level"),
  profilePicture: varchar("profile_picture"),
  location: varchar("location"),
  age: integer("age"),
  fileId: varchar("file_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const airtableJobPostings = pgTable("airtable_job_postings", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobTitle: varchar("job_title").notNull(),
  jobId: varchar("job_id").unique().notNull(),
  jobDescription: text("job_description").notNull(),
  datePosted: timestamp("date_posted").defaultNow(),
  company: varchar("company").notNull(),
  jobType: varchar("job_type"),
  salary: varchar("salary"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  location: varchar("location"),
  employerQuestions: text("employer_questions").array(),
  aiPrompt: text("ai_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const airtableJobApplications = pgTable("airtable_job_applications", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  applicantName: varchar("applicant_name").notNull(),
  applicantUserId: varchar("applicant_user_id").notNull(),
  applicantEmail: varchar("applicant_email").notNull(),
  jobTitle: varchar("job_title").notNull(),
  jobId: varchar("job_id").notNull(),
  company: varchar("company").notNull(),
  userProfile: jsonb("user_profile"),
  notes: text("notes"),
  status: varchar("status").default("applied"),
  applicationDate: timestamp("application_date").defaultNow(),
  jobDescription: text("job_description"),
  sessionId: integer("session_id"), // Reference to interview session for video URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const airtableJobMatches = pgTable("airtable_job_matches", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  userId: varchar("user_id").notNull(),
  jobTitle: varchar("job_title").notNull(),
  jobDescription: text("job_description"),
  companyName: varchar("company_name").notNull(),
  jobId: varchar("job_id").notNull(),
  interviewDate: timestamp("interview_date"),
  interviewTime: varchar("interview_time"),
  interviewLink: text("interview_link"),
  matchScore: integer("match_score"),
  score: integer("score"), // Interview score 0-100
  interviewComments: text("interview_comments"), // AI-generated feedback
  status: varchar("status").default("pending"),
  token: varchar("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions for Airtable replacement tables
export type AirtableUserProfile = typeof airtableUserProfiles.$inferSelect;
export type InsertAirtableUserProfile = typeof airtableUserProfiles.$inferInsert;
export type AirtableJobPosting = typeof airtableJobPostings.$inferSelect;
export type InsertAirtableJobPosting = typeof airtableJobPostings.$inferInsert;
export type AirtableJobApplication = typeof airtableJobApplications.$inferSelect;
export type InsertAirtableJobApplication = typeof airtableJobApplications.$inferInsert;
export type AirtableJobMatch = typeof airtableJobMatches.$inferSelect;
export type InsertAirtableJobMatch = typeof airtableJobMatches.$inferInsert;

// Schemas for Airtable replacement tables
export const insertAirtableUserProfileSchema = createInsertSchema(airtableUserProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirtableJobPostingSchema = createInsertSchema(airtableJobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirtableJobApplicationSchema = createInsertSchema(airtableJobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAirtableJobMatchSchema = createInsertSchema(airtableJobMatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});