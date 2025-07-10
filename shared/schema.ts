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

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  passwordHash: varchar("password_hash").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("applicant"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applicant profiles table
export const applicantProfiles = pgTable("applicant_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // General Information
  name: varchar("name"),
  birthdate: varchar("birthdate"), // stored as string for flexibility
  gender: varchar("gender"),
  nationality: varchar("nationality"),
  maritalStatus: varchar("marital_status"),
  dependents: integer("dependents"),
  militaryStatus: varchar("military_status"),
  country: varchar("country"),
  city: varchar("city"),
  willingToRelocate: boolean("willing_to_relocate").default(false),
  mobileNumber: varchar("mobile_number"),
  emailAddress: varchar("email_address"),
  
  // Career Interests
  careerLevel: varchar("career_level"), // Student, Entry Level, Experienced, Manager, Senior Management
  jobTypesOpen: text("job_types_open").array(), // Full-time, Part-time, etc.
  preferredWorkplace: varchar("preferred_workplace"), // Onsite, Remote, Hybrid
  desiredJobTitles: text("desired_job_titles").array(),
  jobCategories: text("job_categories").array(),
  minimumSalary: integer("minimum_salary"),
  hideSalaryFromEmployers: boolean("hide_salary_from_employers").default(false),
  preferredWorkCountries: text("preferred_work_countries").array(),
  jobSearchStatus: varchar("job_search_status"),
  
  // Work Experience & Skills
  totalYearsExperience: integer("total_years_experience"),
  workExperiences: jsonb("work_experiences"), // Array of experience objects
  skills: jsonb("skills"), // Array of skill objects with experience/proficiency
  languages: jsonb("languages"), // Array of language objects with ratings
  
  // Education & Certifications  
  currentEducationLevel: varchar("current_education_level"),
  universityDegrees: jsonb("university_degrees"), // Array of degree objects
  highSchools: jsonb("high_schools"), // Array of high school objects
  certifications: jsonb("certifications"), // Array of certificate objects
  trainingCourses: jsonb("training_courses"), // Array of training objects
  
  // Online Presence
  linkedinUrl: varchar("linkedin_url"),
  facebookUrl: varchar("facebook_url"), 
  twitterUrl: varchar("twitter_url"),
  instagramUrl: varchar("instagram_url"),
  githubUrl: varchar("github_url"),
  youtubeUrl: varchar("youtube_url"),
  websiteUrl: varchar("website_url"),
  otherUrl: varchar("other_url"),
  
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
  
  aiProfile: jsonb("ai_profile"), // Generated from AI interview
  aiProfileGenerated: boolean("ai_profile_generated").default(false),
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
  userId: integer("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  matchScore: real("match_score").notNull(), // 0-100
  matchReasons: text("match_reasons").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  status: varchar("status").default("applied"), // applied, reviewed, interviewed, rejected, offered
  appliedAt: timestamp("applied_at").defaultNow(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
});

// Interview sessions table
export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  interviewType: varchar("interview_type").notNull(), // 'personal', 'professional', 'technical'
  sessionData: jsonb("session_data").notNull(), // Q&A pairs, progress
  isCompleted: boolean("is_completed").default(false),
  generatedProfile: jsonb("generated_profile"),
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertApplicantProfile = z.infer<typeof insertApplicantProfileSchema>;
export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;
