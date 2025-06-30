import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiInterviewService } from "./openai";
import multer from "multer";
import { z } from "zod";
import { insertApplicantProfileSchema, insertApplicationSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getApplicantProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertApplicantProfileSchema.parse({
        ...req.body,
        userId
      });

      const profile = await storage.upsertApplicantProfile(profileData);
      await storage.updateProfileCompletion(userId);
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Resume upload route
  app.post('/api/candidate/resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const resumeContent = req.file.buffer.toString('utf-8');
      const parsedData = await aiInterviewService.parseResume(resumeContent);

      // Update profile with parsed resume data
      const existingProfile = await storage.getApplicantProfile(userId);
      const updatedProfile = {
        userId,
        resumeContent,
        resumeUrl: `/uploads/resume_${userId}_${Date.now()}.pdf`,
        ...existingProfile,
        ...parsedData,
      };

      const profile = await storage.upsertApplicantProfile(updatedProfile);
      await storage.updateProfileCompletion(userId);

      res.json({ message: "Resume uploaded successfully", profile });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });

  // Interview routes
  app.post('/api/interview/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      const questions = await aiInterviewService.generateInitialQuestions({
        ...user,
        ...profile
      });

      const session = await storage.createInterviewSession({
        userId,
        sessionData: { questions, responses: [], currentQuestionIndex: 0 },
        isCompleted: false
      });

      res.json({ sessionId: session.id, questions });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  app.post('/api/interview/respond', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, question, answer } = req.body;

      const session = await storage.getInterviewSession(userId);
      if (!session || session.id !== sessionId) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const sessionData = session.sessionData as any;
      sessionData.responses = sessionData.responses || [];
      sessionData.responses.push({ question, answer });

      // Generate follow-up question
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      
      const followUpQuestion = await aiInterviewService.generateFollowUpQuestion(
        sessionData.responses,
        { ...user, ...profile }
      );

      const isComplete = !followUpQuestion || sessionData.responses.length >= 6;

      if (isComplete) {
        // Generate AI profile
        const generatedProfile = await aiInterviewService.generateProfile(
          sessionData.responses,
          { ...user, ...profile },
          profile?.resumeContent
        );

        // Update profile with AI data
        await storage.upsertApplicantProfile({
          userId,
          ...profile,
          aiProfile: generatedProfile,
          summary: generatedProfile.summary,
          skillsList: generatedProfile.skills
        });

        await storage.updateInterviewSession(session.id, {
          sessionData: { ...sessionData, isComplete: true },
          isCompleted: true,
          generatedProfile,
          completedAt: new Date()
        });

        // Calculate job matches
        await storage.calculateJobMatches(userId);

        res.json({ 
          isComplete: true, 
          profile: generatedProfile,
          message: "Interview completed successfully!" 
        });
      } else {
        sessionData.questions = sessionData.questions || [];
        sessionData.questions.push(followUpQuestion);

        await storage.updateInterviewSession(session.id, {
          sessionData
        });

        res.json({ 
          isComplete: false, 
          nextQuestion: followUpQuestion 
        });
      }
    } catch (error) {
      console.error("Error processing interview response:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });

  app.get('/api/interview/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getInterviewSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching interview session:", error);
      res.status(500).json({ message: "Failed to fetch interview session" });
    }
  });

  // Job routes
  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const { search, location, experienceLevel } = req.query;
      
      let jobs;
      if (search || location || experienceLevel) {
        jobs = await storage.searchJobs(
          search as string,
          location as string,
          experienceLevel as string
        );
      } else {
        jobs = await storage.getAllJobs();
      }
      
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // Job matches routes
  app.get('/api/job-matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });

  app.post('/api/job-matches/refresh', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.calculateJobMatches(userId);
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error refreshing job matches:", error);
      res.status(500).json({ message: "Failed to refresh job matches" });
    }
  });

  // Application routes
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId
      });

      // Check if already applied
      const existing = await storage.getApplication(userId, applicationData.jobId);
      if (existing) {
        return res.status(400).json({ message: "Already applied to this job" });
      }

      const application = await storage.createApplication(applicationData);
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Seed some sample jobs for demonstration
  app.post('/api/admin/seed-jobs', async (req, res) => {
    try {
      const sampleJobs = [
        {
          title: "Senior Frontend Developer",
          company: "TechCorp Inc.",
          description: "Build amazing user experiences with React and TypeScript. Work with a dynamic team to create cutting-edge web applications.",
          location: "San Francisco, CA",
          salaryMin: 120000,
          salaryMax: 150000,
          experienceLevel: "Senior",
          skills: ["React", "TypeScript", "JavaScript", "CSS", "HTML"],
          jobType: "hybrid",
          requirements: "5+ years of frontend development experience, strong React skills",
          benefits: "Health insurance, stock options, flexible hours"
        },
        {
          title: "React Developer",
          company: "InnovateAI",
          description: "Join our dynamic team building the future of AI-powered applications. Work with cutting-edge technology and talented engineers.",
          location: "Remote",
          salaryMin: 130000,
          salaryMax: 160000,
          experienceLevel: "Mid Level",
          skills: ["React", "Node.js", "TypeScript", "GraphQL", "AWS"],
          jobType: "remote",
          requirements: "3+ years React experience, full-stack capabilities preferred",
          benefits: "Competitive salary, equity, unlimited PTO"
        },
        {
          title: "Full Stack Engineer",
          company: "StartupXYZ",
          description: "Build scalable web applications from the ground up. Great opportunity for someone looking to make a big impact.",
          location: "New York, NY",
          salaryMin: 100000,
          salaryMax: 130000,
          experienceLevel: "Mid Level",
          skills: ["React", "Node.js", "Python", "PostgreSQL", "Docker"],
          jobType: "onsite",
          requirements: "2+ years full-stack development, startup experience a plus",
          benefits: "Equity, learning budget, catered meals"
        },
        {
          title: "Junior Frontend Developer",
          company: "GrowthCo",
          description: "Perfect opportunity for a recent graduate or career changer. We provide mentorship and growth opportunities.",
          location: "Austin, TX",
          salaryMin: 70000,
          salaryMax: 90000,
          experienceLevel: "Entry Level",
          skills: ["JavaScript", "HTML", "CSS", "React", "Git"],
          jobType: "hybrid",
          requirements: "Computer Science degree or bootcamp graduate, passion for web development",
          benefits: "Mentorship program, health insurance, growth opportunities"
        },
        {
          title: "Lead Software Engineer",
          company: "Enterprise Solutions",
          description: "Lead a team of talented engineers building enterprise-grade software solutions.",
          location: "Chicago, IL",
          salaryMin: 160000,
          salaryMax: 200000,
          experienceLevel: "Senior",
          skills: ["React", "TypeScript", "Node.js", "Kubernetes", "Microservices"],
          jobType: "hybrid",
          requirements: "7+ years experience, 2+ years leadership experience",
          benefits: "Excellent benefits, leadership development, stock options"
        }
      ];

      for (const jobData of sampleJobs) {
        await storage.getAllJobs(); // This will insert if using seeding logic
      }

      res.json({ message: "Sample jobs seeded successfully" });
    } catch (error) {
      console.error("Error seeding jobs:", error);
      res.status(500).json({ message: "Failed to seed jobs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
