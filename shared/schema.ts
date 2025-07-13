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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("applicant"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applicant profiles table
export const applicantProfiles = pgTable("applicant_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // General Information
  fullName: varchar("full_name"),
  birthdate: date("birthdate"),
  gender: varchar("gender"), // male, female, other, prefer not to say
  nationality: varchar("nationality"),
  maritalStatus: varchar("marital_status"), // single, married, divorced, widowed
  numberOfDependents: integer("number_of_dependents").default(0),
  militaryStatus: varchar("military_status"), // completed, exempted, postponed, not_applicable
  
  // Location
  country: varchar("country"),
  city: varchar("city"),
  willingToRelocate: boolean("willing_to_relocate").default(false),
  
  // Contact Information
  mobileNumber: varchar("mobile_number"),
  email: varchar("email"),
  
  // Career Information
  careerLevel: varchar("career_level"), // student, entry_level, experienced_non_manager, manager, senior_management
  jobTypesOpen: text("job_types_open").array(), // fulltime, part_time, freelance, internship, shift_based, volunteering, student_activity
  preferredWorkplace: varchar("preferred_workplace"), // onsite, remote, hybrid
  desiredJobTitles: text("desired_job_titles").array(),
  interestedJobCategories: text("interested_job_categories").array(),
  minimumSalary: integer("minimum_salary"),
  hideSalaryFromCompanies: boolean("hide_salary_from_companies").default(false),
  preferredWorkCountries: text("preferred_work_countries").array(),
  jobSearchStatus: varchar("job_search_status"), // actively_looking, open_to_opportunities, specific_opportunities_only, not_looking
  availableForImmediateHiring: boolean("available_for_immediate_hiring").default(false),
  
  // Experience
  yearsOfExperience: integer("years_of_experience").default(0),
  workExperiences: jsonb("work_experiences"), // Array of experience objects
  languages: jsonb("languages"), // Array of language objects with proficiency levels
  
  // Education
  currentEducationLevel: varchar("current_education_level"), // high_school, vocational, diploma, bachelors, masters, phd
  educationDetails: jsonb("education_details"), // Array of education objects
  
  // Legacy fields (keeping for backward compatibility)
  age: integer("age"),
  education: text("education"),
  university: varchar("university"),
  degree: varchar("degree"),
  location: varchar("location"),
  currentRole: varchar("current_role"),
  company: varchar("company"),
  resumeUrl: varchar("resume_url"),
  resumeContent: text("resume_content"),
  summary: text("summary"),
  skillsList: text("skills_list").array(),
  
  // AI Profile Data
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

// Interview sessions table
export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
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
