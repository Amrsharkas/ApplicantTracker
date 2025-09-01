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
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - updated for custom auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  username: varchar("username").unique(),
  displayName: varchar("display_name"), // Keep existing column to avoid data loss
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("applicant"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applicant profiles table
export const applicantProfiles = pgTable("applicant_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // General Information (Essential fields)
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
  address: varchar("address"), // Street address
  zipCode: varchar("zip_code"), // Postal code
  willingToRelocate: boolean("willing_to_relocate"),
  
  // Contact Information (Essential)
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
  careerLevel: varchar("career_level"), // student, entry_level, experienced, manager, senior_management
  jobTypes: text("job_types").array(), // fulltime, part_time, freelance, internship, shift_based, volunteering, student_activity
  workplaceSettings: varchar("workplace_settings"), // onsite, remote, hybrid
  jobTitles: text("job_titles").array(),
  jobCategories: text("job_categories").array(),
  minimumSalary: integer("minimum_salary"),
  hideSalaryFromCompanies: boolean("hide_salary_from_companies").default(false),
  preferredWorkCountries: text("preferred_work_countries").array(),
  jobSearchStatus: varchar("job_search_status"), // actively_looking, happy_but_open, specific_opportunities, not_looking, immediate_hiring
  
  // Work Eligibility (additional fields)
  workAuthorization: varchar("work_authorization"),
  visaStatus: varchar("visa_status"),
  visaExpiryDate: varchar("visa_expiry_date"),
  sponsorshipRequired: boolean("sponsorship_required"),
  availabilityDate: varchar("availability_date"),
  noticePeriod: varchar("notice_period"),
  travelWillingness: varchar("travel_willingness"),
  
  // Experience
  totalYearsOfExperience: integer("total_years_of_experience"),
  workExperiences: jsonb("work_experiences"), // Array of experience objects
  languages: jsonb("languages"), // Array of language proficiency objects
  
  // Skills (enhanced)
  skillsData: jsonb("skills_data"), // Complete skills with years of experience
  
  // Education
  currentEducationLevel: varchar("current_education_level"), // bachelors, masters, phd, high_school, vocational, diploma
  degrees: jsonb("degrees"), // Array of degree objects
  highSchools: jsonb("high_schools"), // Array of high school objects
  certifications: jsonb("certifications"), // Array of certification objects
  trainingCourses: jsonb("training_courses"), // Array of training course objects
  
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
  
  // Legacy fields (keeping for backward compatibility)
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
  
  // System fields
  aiProfile: jsonb("ai_profile"), // Generated from AI interview
  aiProfileGenerated: boolean("ai_profile_generated").default(false),
  honestProfile: jsonb("honest_profile"), // Brutally honest profile for employers
  honestProfileGenerated: boolean("honest_profile_generated").default(false),
  profileGeneratedAt: timestamp("profile_generated_at"),
  personalInterviewCompleted: boolean("personal_interview_completed").default(false),
  professionalInterviewCompleted: boolean("professional_interview_completed").default(false),
  technicalInterviewCompleted: boolean("technical_interview_completed").default(false),
  completionPercentage: integer("completion_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job listings table (shared with employer platform)
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  description: text("description").notNull(),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  experienceLevel: varchar("experience_level"),
  skills: text("skills").array(),
  jobType: varchar("job_type"), // remote, hybrid, onsite
  requirements: text("requirements"),
  benefits: text("benefits"),
  isActive: boolean("is_active").default(true),
  postedAt: timestamp("posted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job matches table
export const jobMatches = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  matchScore: real("match_score").notNull(), // 0-100
  matchReasons: text("match_reasons").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  status: varchar("status").default("applied"), // applied, reviewed, interviewed, rejected, offered
  appliedAt: timestamp("applied_at").defaultNow(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
});

// Resume uploads table
export const resumeUploads = pgTable("resume_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(), // Object storage path
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  extractedText: text("extracted_text"), // PDF text extraction
  aiAnalysis: jsonb("ai_analysis"), // AI analysis of the resume
  isActive: boolean("is_active").default(true), // Allow multiple uploads, mark latest as active
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Interview sessions table
export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  interviewType: varchar("interview_type").notNull(), // 'personal', 'professional', 'technical'
  sessionData: jsonb("session_data").notNull(), // Q&A pairs, progress
  isCompleted: boolean("is_completed").default(false),
  generatedProfile: jsonb("generated_profile"),
  resumeContext: jsonb("resume_context"), // Resume analysis context for the interview
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});


// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(applicantProfiles, {
    fields: [users.id],
    references: [applicantProfiles.userId],
  }),
  matches: many(jobMatches),
  applications: many(applications),
  interviews: many(interviewSessions),
  resumes: many(resumeUploads),
}));

export const applicantProfilesRelations = relations(applicantProfiles, ({ one }) => ({
  user: one(users, {
    fields: [applicantProfiles.userId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  matches: many(jobMatches),
  applications: many(applications),
}));

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  user: one(users, {
    fields: [jobMatches.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [jobMatches.jobId],
    references: [jobs.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
}));

export const resumeUploadsRelations = relations(resumeUploads, ({ one }) => ({
  user: one(users, {
    fields: [resumeUploads.userId],
    references: [users.id],
  }),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one }) => ({
  user: one(users, {
    fields: [interviewSessions.userId],
    references: [users.id],
  }),
}));


// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertApplicantProfileSchema = createInsertSchema(applicantProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertJobSchema = createInsertSchema(jobs).omit({
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Applicant Profile types
export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
export type InsertApplicantProfile = typeof applicantProfiles.$inferInsert;
export type UpdateApplicantProfile = Partial<InsertApplicantProfile>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertResumeUpload = z.infer<typeof insertResumeUploadSchema>;
export type ResumeUpload = typeof resumeUploads.$inferSelect;
