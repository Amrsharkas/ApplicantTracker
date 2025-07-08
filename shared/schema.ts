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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Firebase UID
  email: varchar("email").unique(),
  displayName: varchar("display_name"),
  firstName: varchar("first_name"), // Parsed from displayName
  lastName: varchar("last_name"), // Parsed from displayName  
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("applicant"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applicant profiles table
export const applicantProfiles = pgTable("applicant_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
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
export type UpsertUser = typeof users.$inferInsert & {
  displayName?: string | null;
};
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
