import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiInterviewService, aiProfileAnalysisAgent } from "./openai";
import { airtableService } from "./airtable";
import multer from "multer";
import { z } from "zod";
import { insertApplicantProfileSchema, insertApplicationSchema, signupSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.set("trust proxy", 1);
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'plato.sid', // Custom session name
    cookie: {
      httpOnly: true,
      secure: false, // Allow cookies over HTTP in development
      sameSite: 'lax', // Allow cross-site requests
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await storage.createUser({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: 'applicant'
      });

      // Create basic applicant profile for new user
      try {
        await storage.upsertApplicantProfile({
          userId: user.id,
          name: `${firstName} ${lastName}`.trim(),
          emailAddress: email
        });
        console.log("Successfully created profile for new user:", user.id);
      } catch (profileError) {
        console.error("Failed to create profile for new user:", profileError);
        // Don't fail the signup if profile creation fails
      }

      // Set session
      req.session.userId = user.id;
      
      // Save session explicitly
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        console.log("Session saved successfully for user:", user.id);
        res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Invalid input", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log("Login attempt with body:", req.body);
      const { email, password } = loginSchema.parse(req.body);
      console.log("Parsed email:", email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      console.log("Found user:", user ? { id: user.id, email: user.email, hasPassword: !!user.passwordHash } : "null");
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.passwordHash) {
        console.error("User has no password set");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      console.log("Comparing password with hash");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      console.log("Password valid:", isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      console.log("Session set with userId:", user.id);
      
      // Save session explicitly
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        console.log("Session saved successfully for user:", user.id);
        res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Invalid input", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('plato.sid'); // Use the custom session name
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/candidate/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const profile = await storage.getApplicantProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/candidate/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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
  app.post('/api/candidate/resume', requireAuth, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let resumeContent = '';
      
      try {
        console.log(`Processing file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, size: ${req.file.size}`);
        
        // Handle different file types
        if (req.file.mimetype === 'application/pdf') {
          // Parse PDF using pdf-parse
          const pdfParse = require('pdf-parse');
          try {
            const pdfData = await pdfParse(req.file.buffer);
            resumeContent = pdfData.text;
            console.log(`PDF parsed successfully, extracted ${resumeContent.length} characters`);
          } catch (pdfError) {
            console.error("PDF parsing error:", pdfError);
            // Continue with upload even if PDF parsing fails, but save the file
            resumeContent = `[PDF content could not be parsed - file uploaded as ${req.file.originalname}]`;
          }
        } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
          // Handle plain text files
          resumeContent = req.file.buffer.toString('utf-8');
          console.log(`Text file parsed successfully, ${resumeContent.length} characters`);
        } else if (req.file.mimetype === 'application/msword' || req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For now, we'll ask users to upload PDF or text files
          return res.status(400).json({ 
            message: "Please upload your resume as a PDF or text file for better parsing accuracy" 
          });
        } else {
          return res.status(400).json({ 
            message: "Unsupported file type. Please upload a PDF or text file." 
          });
        }
      } catch (parseError) {
        console.error("Error processing resume file:", parseError);
        // Don't fail the entire upload, just continue without text extraction
        resumeContent = `[File uploaded as ${req.file.originalname} - content parsing failed]`;
      }

      // Allow upload even if text extraction fails - the file itself is still valuable
      if (!resumeContent.trim()) {
        resumeContent = `[Resume file uploaded: ${req.file.originalname}]`;
        console.log("No text content extracted, but allowing upload with filename reference");
      }

      // Parse resume content with AI (with timeout)
      let parsedData = {};
      try {
        // Add timeout to prevent hanging
        const parsePromise = aiInterviewService.parseResume(resumeContent);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI parsing timeout')), 10000)
        );
        parsedData = await Promise.race([parsePromise, timeoutPromise]);
      } catch (aiError) {
        console.warn("AI parsing failed, continuing with resume upload:", aiError);
        // Continue with upload even if AI parsing fails
      }

      // Update profile with parsed resume data
      const existingProfile = await storage.getApplicantProfile(userId);
      const resumeUrl = `/uploads/resume_${userId}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      
      const updatedProfile = {
        userId,
        resumeContent: resumeContent.substring(0, 10000), // Limit to 10k chars to avoid DB issues
        resumeUrl,
        ...existingProfile,
        ...parsedData,
      };

      const profile = await storage.upsertApplicantProfile(updatedProfile);
      await storage.updateProfileCompletion(userId);

      res.json({ 
        message: "Resume uploaded successfully", 
        profile,
        extractedText: resumeContent.length > 0,
        aiParsed: Object.keys(parsedData).length > 0
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ 
        message: "Failed to upload resume. Please try again." 
      });
    }
  });

  // Create ephemeral token for Realtime API
  app.post("/api/realtime/session", requireAuth, async (req, res) => {
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "alloy",
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error creating realtime session:", error);
      res.status(500).json({ message: "Failed to create realtime session" });
    }
  });

  // Interview routes
  app.post('/api/interview/welcome', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Generate personalized welcome message
      const welcomeMessage = await aiInterviewService.generateWelcomeMessage({
        ...user,
        ...profile
      });

      res.json({ welcomeMessage });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      res.status(500).json({ message: "Failed to generate welcome message" });
    }
  });

  // Get available interview types for a user
  app.get('/api/interview/types', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const profile = await storage.getApplicantProfile(userId);

      const types = [
        {
          type: 'personal',
          title: 'Personal Interview',
          description: 'Understanding your background, values, and personal journey',
          completed: profile?.personalInterviewCompleted || false,
          questions: 5
        },
        {
          type: 'professional', 
          title: 'Professional Interview',
          description: 'Exploring your career journey, achievements, and professional expertise',
          completed: profile?.professionalInterviewCompleted || false,
          questions: 7
        },
        {
          type: 'technical',
          title: 'Technical Interview', 
          description: 'Assessing your technical abilities and problem-solving skills',
          completed: profile?.technicalInterviewCompleted || false,
          questions: 11
        }
      ];

      res.json({ interviewTypes: types });
    } catch (error) {
      console.error("Error fetching interview types:", error);
      res.status(500).json({ message: "Failed to fetch interview types" });
    }
  });

  app.post('/api/interview/start/:type', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const interviewType = req.params.type;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Validate interview type
      if (!['personal', 'professional', 'technical'].includes(interviewType)) {
        return res.status(400).json({ message: "Invalid interview type" });
      }

      // Get resume content from profile
      const resumeContent = profile?.resumeContent || null;

      // Generate specific interview set for this type only (much faster)
      let currentSet;
      const userData = { ...user, ...profile };
      
      if (interviewType === 'personal') {
        currentSet = await aiInterviewService.generatePersonalInterview(userData, resumeContent);
      } else if (interviewType === 'professional') {
        currentSet = await aiInterviewService.generateProfessionalInterview(userData, resumeContent);
      } else if (interviewType === 'technical') {
        currentSet = await aiInterviewService.generateTechnicalInterview(userData, resumeContent);
      } else {
        throw new Error(`Invalid interview type: ${interviewType}`);
      }

      const session = await storage.createInterviewSession({
        userId,
        interviewType,
        sessionData: { 
          questions: currentSet.questions, 
          responses: [], 
          currentQuestionIndex: 0,
          interviewSet: currentSet
        },
        isCompleted: false
      });

      // Return the first question for text interview
      const firstQuestion = currentSet.questions[0]?.question || "Let's begin this interview.";

      res.json({ 
        sessionId: session.id, 
        interviewSet: currentSet,
        questions: currentSet.questions,
        firstQuestion 
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post('/api/interview/start', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content from profile
      const resumeContent = profile?.resumeContent || null;

      // Use AI Agent 1 to generate personalized interview questions (legacy personal interview)
      const questions = await aiInterviewService.generateInitialQuestions({
        ...user,
        ...profile
      }, resumeContent);

      const session = await storage.createInterviewSession({
        userId,
        interviewType: 'personal',
        sessionData: { questions, responses: [], currentQuestionIndex: 0 },
        isCompleted: false
      });

      // Return the first question for text interview
      const firstQuestion = questions[0]?.question || "Tell me about yourself and your career journey.";

      res.json({ 
        sessionId: session.id, 
        questions,
        firstQuestion 
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  app.post('/api/interview/respond', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { sessionId, question, answer } = req.body;

      const session = await storage.getInterviewSession(userId);
      if (!session || session.id !== sessionId) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const sessionData = session.sessionData as any;
      sessionData.responses = sessionData.responses || [];
      sessionData.responses.push({ question, answer });

      // Check if interview is complete (7 questions answered for current interview type)
      const questions = sessionData.questions || [];
      const isComplete = sessionData.responses.length >= questions.length;

      if (isComplete) {
        // Mark this specific interview type as completed
        const interviewType = session.interviewType || 'personal';
        await storage.updateInterviewCompletion(userId, interviewType);

        // Update the interview session as completed
        await storage.updateInterviewSession(session.id, {
          sessionData: { ...sessionData, isComplete: true },
          isCompleted: true,
          completedAt: new Date()
        });

        // Check if all 3 interviews are completed
        const updatedProfile = await storage.getApplicantProfile(userId);
        const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                     updatedProfile?.professionalInterviewCompleted && 
                                     updatedProfile?.technicalInterviewCompleted;

        if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
          // Get user data for comprehensive analysis
          const user = await storage.getUser(userId);
          
          // Get all interview sessions for this user
          const allSessions = await storage.getInterviewHistory(userId);
          const completedSessions = allSessions.filter(s => s.isCompleted);
          
          // Combine all responses from all interview types
          let allResponses: any[] = [];
          completedSessions.forEach(s => {
            const sessionData = s.sessionData as any;
            if (sessionData.responses) {
              allResponses = allResponses.concat(sessionData.responses);
            }
          });

          // Get resume content from profile
          const resumeContent = updatedProfile?.resumeContent || null;

          // Use AI Agent 2 to generate comprehensive profile from ALL interviews
          const generatedProfile = await aiInterviewService.generateProfile(
            { ...user, ...updatedProfile },
            resumeContent,
            allResponses
          );

          // Update profile with AI data
          await storage.upsertApplicantProfile({
            userId,
            ...updatedProfile,
            aiProfile: generatedProfile,
            aiProfileGenerated: true,
            summary: generatedProfile.summary,
            skillsList: generatedProfile.skills
          });

          // Calculate job matches
          await storage.calculateJobMatches(userId);

          // Store profile in Airtable
          try {
            const userName = user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user?.email || `User ${userId}`;
            
            await airtableService.storeUserProfile(userName, generatedProfile, userId, user?.email);
          } catch (error) {
            console.error('Failed to store profile in Airtable:', error);
            // Don't fail the entire request if Airtable fails
          }

          res.json({ 
            isComplete: true,
            allInterviewsCompleted: true,
            profile: generatedProfile,
            message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed! All interviews finished - your comprehensive profile has been generated.`
          });
        } else {
          res.json({ 
            isComplete: true,
            allInterviewsCompleted: false,
            message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed successfully! ${allInterviewsCompleted ? 'All interviews are now complete.' : 'Continue with the remaining interviews to complete your profile.'}`
          });
        }
      } else {
        // Get next question from pre-defined question set (we have exactly 5 questions)
        const currentQuestionIndex = sessionData.responses.length;
        const questions = sessionData.questions || [];
        const nextQuestion = questions[currentQuestionIndex];
        
        if (nextQuestion) {
          await storage.updateInterviewSession(session.id, {
            sessionData
          });

          res.json({ 
            isComplete: false, 
            nextQuestion: nextQuestion.question 
          });
        } else {
          res.json({ 
            isComplete: false, 
            message: "No more questions available" 
          });
        }
      }
    } catch (error) {
      console.error("Error processing interview response:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });

  app.post('/api/interview/complete', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { sessionId, interviewType } = req.body;

      const session = await storage.getInterviewSession(userId);
      if (!session || session.id !== sessionId) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const sessionData = session.sessionData as any;
      
      // Mark this specific interview type as completed
      await storage.updateInterviewCompletion(userId, interviewType);

      // Update the interview session as completed
      await storage.updateInterviewSession(session.id, {
        sessionData: { ...sessionData, isComplete: true },
        isCompleted: true,
        completedAt: new Date()
      });

      // Check if all 3 interviews are completed
      const updatedProfile = await storage.getApplicantProfile(userId);
      const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                   updatedProfile?.professionalInterviewCompleted && 
                                   updatedProfile?.technicalInterviewCompleted;

      if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
        // Get user data for comprehensive analysis
        const user = await storage.getUser(userId);
        
        // Get all interview sessions for this user
        const allSessions = await storage.getInterviewHistory(userId);
        const completedSessions = allSessions.filter(s => s.isCompleted);
        
        // Combine all responses from all interview types
        let allResponses: any[] = [];
        completedSessions.forEach(s => {
          const sessionData = s.sessionData as any;
          if (sessionData.responses) {
            allResponses = allResponses.concat(sessionData.responses);
          }
        });

        // Get resume content from profile
        const resumeContent = updatedProfile?.resumeContent || null;

        // Use AI Agent 2 to generate comprehensive profile from ALL interviews
        const generatedProfile = await aiInterviewService.generateProfile(
          { ...user, ...updatedProfile },
          resumeContent,
          allResponses
        );

        // Update profile with AI data
        await storage.upsertApplicantProfile({
          userId,
          ...updatedProfile,
          aiProfile: generatedProfile,
          aiProfileGenerated: true,
          summary: generatedProfile.summary,
          skillsList: generatedProfile.skills
        });

        // Calculate job matches
        await storage.calculateJobMatches(userId);

        // Store profile in Airtable
        try {
          const userName = user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.email || `User ${userId}`;
          
          await airtableService.storeUserProfile(userName, generatedProfile, userId, user?.email);
        } catch (error) {
          console.error('Failed to store profile in Airtable:', error);
          // Don't fail the entire request if Airtable fails
        }

        res.json({ 
          isComplete: true,
          allInterviewsCompleted: true,
          profile: generatedProfile,
          message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed! All interviews finished - your comprehensive profile has been generated.`
        });
      } else {
        res.json({ 
          isComplete: true,
          allInterviewsCompleted: false,
          message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed successfully! ${allInterviewsCompleted ? 'All interviews are now complete.' : 'Continue with the remaining interviews to complete your profile.'}`
        });
      }
    } catch (error) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Failed to complete interview" });
    }
  });

  app.post('/api/interview/complete-voice', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { conversationHistory, interviewType } = req.body;

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: "Invalid conversation history" });
      }

      // Get user and profile data for AI Agent 2
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content if available
      let resumeContent = null;
      if (profile?.resumeUrl) {
        try {
          resumeContent = null; // TODO: Implement resume fetching
        } catch (error) {
          console.warn("Could not fetch resume content:", error);
        }
      }

      // Use AI Agent 2 to generate comprehensive profile
      const generatedProfile = await aiProfileAnalysisAgent.generateComprehensiveProfile(
        { ...user, ...profile },
        resumeContent,
        conversationHistory
      );

      // Mark this specific interview type as completed
      if (interviewType) {
        await storage.updateInterviewCompletion(userId, interviewType);
      }

      // Save the interview session with completion
      const session = await storage.createInterviewSession({
        userId,
        interviewType: interviewType || 'personal',
        sessionData: { 
          questions: conversationHistory.map(item => ({ question: item.question })),
          responses: conversationHistory,
          currentQuestionIndex: conversationHistory.length 
        },
        isCompleted: true,
        generatedProfile
      });

      // Check if all 3 interviews are completed
      const updatedProfile = await storage.getApplicantProfile(userId);
      const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                   updatedProfile?.professionalInterviewCompleted && 
                                   updatedProfile?.technicalInterviewCompleted;

      if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
        // Update profile with AI-generated data and mark as complete
        await storage.upsertApplicantProfile({
          userId,
          ...updatedProfile,
          aiProfile: generatedProfile,
          aiProfileGenerated: true,
          summary: generatedProfile.summary,
          skillsList: generatedProfile.skills
        });

        // Calculate job matches
        await storage.calculateJobMatches(userId);
      } else {
        // Just mark the individual interview as complete
        await storage.upsertApplicantProfile({
          userId,
          ...updatedProfile
        });
      }

      // Store in Airtable
      try {
        const userName = user?.firstName 
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user?.email || 'Unknown User';
        
        await airtableService.storeUserProfile(userName, generatedProfile, userId, user?.email);
      } catch (error) {
        console.error('Failed to store profile in Airtable:', error);
      }

      res.json({ 
        isComplete: true, 
        profile: generatedProfile,
        message: "Voice interview completed successfully!" 
      });
    } catch (error) {
      console.error("Error completing voice interview:", error);
      res.status(500).json({ message: "Failed to complete voice interview" });
    }
  });

  app.get('/api/interview/session', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const session = await storage.getInterviewSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching interview session:", error);
      res.status(500).json({ message: "Failed to fetch interview session" });
    }
  });

  app.get('/api/interview/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const history = await storage.getInterviewHistory(userId);
      const profile = await storage.getApplicantProfile(userId);
      
      // If user has completed all interviews and has an AI profile, use that for all interviews
      const hasCompleteProfile = profile?.aiProfileGenerated && profile?.aiProfile;
      
      // Modify history to show unified profile for completed interviews
      const modifiedHistory = history.map(session => {
        if (session.isCompleted && hasCompleteProfile) {
          return {
            ...session,
            generatedProfile: profile.aiProfile
          };
        }
        return session;
      });
      
      res.json(modifiedHistory);
    } catch (error) {
      console.error("Error fetching interview history:", error);
      res.status(500).json({ message: "Failed to fetch interview history" });
    }
  });

  app.post('/api/interview/voice-submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { responses, conversationHistory } = req.body;

      // Get user and profile data
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content if available
      let resumeContent = null;
      if (profile?.resumeUrl) {
        try {
          // If resume exists, we'd fetch it here - for now we'll use null
          resumeContent = null; // TODO: Implement resume fetching from URL
        } catch (error) {
          console.warn("Could not fetch resume content:", error);
        }
      }

      // Use AI Agent 2 to generate comprehensive profile from resume, profile, and interview responses
      const generatedProfile = await aiInterviewService.generateProfile(
        { ...user, ...profile },
        resumeContent,
        responses
      );

      // Create interview session
      const session = await storage.createInterviewSession({
        userId,
        sessionData: { 
          questions: responses.map((r: any) => ({ question: r.question })), 
          responses, 
          currentQuestionIndex: responses.length 
        },
        isCompleted: true,
        generatedProfile
      });

      // Update profile with AI generated data
      const aiProfile = generatedProfile;
      await storage.upsertApplicantProfile({
        ...profile,
        userId,
        aiProfile,
        aiProfileGenerated: true
      });

      // Store in Airtable
      try {
        const userName = user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email || 'Unknown User';
        
        await airtableService.storeUserProfile(userName, generatedProfile, userId, user?.email);
      } catch (airtableError) {
        console.warn("Failed to store profile in Airtable:", airtableError);
        // Continue without failing the interview
      }

      res.json({ 
        isComplete: true, 
        profile: generatedProfile,
        sessionId: session.id,
        message: "Voice interview completed successfully!" 
      });
    } catch (error) {
      console.error("Error processing voice interview:", error);
      res.status(500).json({ message: "Failed to process voice interview" });
    }
  });



  // Job matches routes
  app.get('/api/job-matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });

  app.post('/api/job-matches/refresh', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.calculateJobMatches(userId);
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error refreshing job matches:", error);
      res.status(500).json({ message: "Failed to refresh job matches" });
    }
  });

  // Application routes
  app.get('/api/applications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const applications = await storage.getApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  // Job postings routes
  app.get('/api/job-postings', requireAuth, async (req: any, res) => {
    try {
      const jobPostings = await airtableService.getAllJobPostings();
      res.json(jobPostings);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  // Test endpoint to manually trigger job postings fetch
  app.get('/api/test-job-postings', async (req, res) => {
    try {
      console.log('🧪 Manual test of job postings fetch');
      const jobPostings = await airtableService.getAllJobPostings();
      res.json({ 
        count: jobPostings.length, 
        data: jobPostings,
        message: `Found ${jobPostings.length} job postings`
      });
    } catch (error) {
      console.error("Error in test fetch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Airtable job monitoring routes
  app.post('/api/admin/process-airtable-jobs', async (req, res) => {
    try {
      const newJobEntries = await airtableService.checkForNewJobEntries();
      
      if (newJobEntries.length === 0) {
        return res.json({ message: "No new job entries found", processed: 0 });
      }

      let processed = 0;
      for (const jobEntry of newJobEntries) {
        try {
          await airtableService.processJobEntry(jobEntry);
          processed++;
          console.log(`✅ Processed job entry for user ${jobEntry.userId}: ${jobEntry.jobTitle}`);
        } catch (error) {
          console.error(`❌ Failed to process job entry for user ${jobEntry.userId}:`, error);
        }
      }

      res.json({ 
        message: `Processed ${processed} out of ${newJobEntries.length} job entries`,
        processed,
        total: newJobEntries.length
      });
    } catch (error) {
      console.error("Error processing Airtable job entries:", error);
      res.status(500).json({ message: "Failed to process Airtable job entries" });
    }
  });

  // Debug endpoint to check Airtable connection
  app.get('/api/debug-airtable', async (req, res) => {
    try {
      console.log("🔍 Debug: Checking Airtable connection...");
      const allJobEntries = await airtableService.getRecordsWithJobData();
      
      res.json({
        success: true,
        totalEntries: allJobEntries.length,
        entries: allJobEntries.map(entry => ({
          userId: entry.userId,
          jobTitle: entry.jobTitle,
          hasJobDescription: !!entry.jobDescription
        }))
      });
    } catch (error) {
      console.error("Airtable debug error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Debug endpoint specifically for job matches base
  app.get('/api/debug-job-matches', async (req, res) => {
    try {
      console.log("🧪 Debug: Checking job matches base directly...");
      const Airtable = await import('airtable');
      const airtable = new Airtable.default({
        endpointUrl: 'https://api.airtable.com',
        apiKey: process.env.AIRTABLE_API_KEY
      });
      const jobMatchesBase = airtable.base(process.env.AIRTABLE_JOB_MATCHES_BASE_ID!);
      
      const records = await jobMatchesBase('Table 1').select({
        maxRecords: 10
      }).all();
      
      console.log('🧪 Raw records found:', records.length);
      const recordDetails = records.map(record => ({
        id: record.id,
        fields: record.fields,
        fieldNames: Object.keys(record.fields)
      }));
      
      console.log('🧪 Record details:', JSON.stringify(recordDetails, null, 2));
      
      res.json({
        success: true,
        baseId: process.env.AIRTABLE_JOB_MATCHES_BASE_ID,
        count: records.length,
        records: recordDetails
      });
    } catch (error) {
      console.error('Job matches debug error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Set up automatic Airtable monitoring (every 30 seconds)
  setInterval(async () => {
    try {
      console.log("⏰ Running Airtable monitoring check...");
      
      // Monitor platojobmatches table for job matches (creates job matches)
      const newJobMatches = await airtableService.checkForNewJobMatches();
      
      if (newJobMatches.length > 0) {
        console.log(`🎯 Found ${newJobMatches.length} new job matches in job matches table`);
        
        for (const jobMatch of newJobMatches) {
          try {
            await airtableService.processJobMatch(jobMatch);
            console.log(`✅ Auto-created job match for user ${jobMatch.userId}: ${jobMatch.jobTitle}`);
          } catch (error) {
            console.error(`❌ Failed to create job match for user ${jobMatch.userId}:`, error);
          }
        }
      } else {
        console.log("🔍 No new job matches found in current monitoring cycle");
      }
    } catch (error) {
      console.error("❌ Airtable monitoring error:", error);
    }
  }, 30000); // Check every 30 seconds

  console.log("🚀 Airtable job monitoring system started - checking every 30 seconds");

  const httpServer = createServer(app);
  return httpServer;
}
