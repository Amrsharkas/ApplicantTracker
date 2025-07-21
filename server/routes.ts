import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiInterviewService, aiProfileAnalysisAgent, aiInterviewAgent } from "./openai";
import { airtableService } from "./airtable";
import { employerQuestionService } from "./employerQuestions";
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

  app.put('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        displayName: z.string().optional(),
      }).parse(req.body);

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
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

  // Handle both PUT and POST for profile updates
  const handleProfileUpdate = async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Profile update request for user:", userId, "with data:", req.body);
      
      // Preprocess the data to handle empty date fields
      const processedBody = { ...req.body };
      
      // Convert empty date strings to null
      const dateFields = ['birthdate'];
      dateFields.forEach(field => {
        if (processedBody[field] === '') {
          processedBody[field] = null;
        }
      });
      
      // Convert empty arrays to null where appropriate
      const arrayFields = ['jobTypes', 'jobTitles', 'jobCategories', 'preferredWorkCountries', 'workExperiences', 'languages', 'degrees', 'highSchools', 'certifications', 'trainingCourses', 'otherUrls'];
      arrayFields.forEach(field => {
        if (Array.isArray(processedBody[field]) && processedBody[field].length === 0) {
          processedBody[field] = null;
        }
      });
      
      // For simple profile updates, validate only the fields being sent
      const profileData = {
        userId,
        ...processedBody
      };

      console.log("Attempting to upsert profile with data:", profileData);
      const profile = await storage.upsertApplicantProfile(profileData);
      await storage.updateProfileCompletion(userId);
      
      console.log("Profile update successful:", profile.id);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  app.put('/api/candidate/profile', isAuthenticated, handleProfileUpdate);
  app.post('/api/candidate/profile', isAuthenticated, handleProfileUpdate);

  // Resume upload route
  app.post('/api/candidate/resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
  app.post("/api/realtime/session", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "verse",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Realtime API error:", response.status, errorText);
        return res.status(500).json({ 
          error: "Failed to create realtime session",
          details: `OpenAI API returned ${response.status}`
        });
      }

      const data = await response.json();
      console.log("Successfully created realtime session:", data.id);
      res.json(data);
    } catch (error) {
      console.error("Error creating realtime session:", error);
      res.status(500).json({ 
        error: "Failed to create realtime session",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voice interview initialization route
  app.post("/api/interview/start-voice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { interviewType } = req.body;
      
      // Validate interview type
      if (!['personal', 'professional', 'technical'].includes(interviewType)) {
        return res.status(400).json({ 
          error: "Invalid interview type",
          details: "Must be personal, professional, or technical"
        });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content from profile
      const resumeContent = profile?.resumeContent || null;

      // Get context from previous interviews to maintain continuity
      const interviewContext = await storage.getInterviewContext(userId, interviewType);

      // Generate the specific interview set with context
      let currentSet;
      if (interviewType === 'personal') {
        currentSet = await aiInterviewService.generatePersonalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined);
      } else if (interviewType === 'professional') {
        currentSet = await aiInterviewService.generateProfessionalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext);
      } else if (interviewType === 'technical') {
        currentSet = await aiInterviewService.generateTechnicalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext);
      }

      if (!currentSet) {
        return res.status(500).json({
          error: "Failed to generate interview questions",
          details: `Could not create ${interviewType} interview`
        });
      }

      // Create interview session
      const session = await storage.createInterviewSession({
        userId,
        interviewType,
        sessionData: { 
          questions: currentSet.questions, 
          responses: [], 
          currentQuestionIndex: 0,
          interviewSet: currentSet,
          context: interviewContext
        },
        isCompleted: false
      });

      // Generate welcome message
      const welcomeMessage = await aiInterviewService.generateWelcomeMessage({
        ...user,
        ...profile
      });

      res.json({ 
        sessionId: session.id,
        interviewType,
        interviewSet: currentSet,
        questions: currentSet.questions,
        welcomeMessage,
        userProfile: {
          ...user,
          ...profile
        }
      });
    } catch (error) {
      console.error("Error starting voice interview:", error);
      res.status(500).json({ 
        error: "Failed to start voice interview",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Interview routes
  app.post('/api/interview/welcome', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/interview/types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/interview/start/:type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const interviewType = req.params.type;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Validate interview type
      if (!['personal', 'professional', 'technical'].includes(interviewType)) {
        return res.status(400).json({ message: "Invalid interview type" });
      }

      // Get resume content from profile
      const resumeContent = profile?.resumeContent || null;

      // Get context from previous interviews to maintain continuity
      const interviewContext = await storage.getInterviewContext(userId, interviewType);

      // Generate the specific interview set with context
      let currentSet;
      if (interviewType === 'personal') {
        currentSet = await aiInterviewService.generatePersonalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined);
      } else if (interviewType === 'professional') {
        currentSet = await aiInterviewService.generateProfessionalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext);
      } else if (interviewType === 'technical') {
        currentSet = await aiInterviewService.generateTechnicalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext);
      }

      if (!currentSet) {
        throw new Error(`Interview set not found for type: ${interviewType}`);
      }

      const session = await storage.createInterviewSession({
        userId,
        interviewType,
        sessionData: { 
          questions: currentSet.questions, 
          responses: [], 
          currentQuestionIndex: 0,
          interviewSet: currentSet,
          context: interviewContext
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
  app.post('/api/interview/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          // Individual interview complete - determine next interview type
          let nextInterviewType = null;
          if (interviewType === 'personal' && !updatedProfile?.professionalInterviewCompleted) {
            nextInterviewType = 'professional';
          } else if ((interviewType === 'personal' || interviewType === 'professional') && !updatedProfile?.technicalInterviewCompleted) {
            nextInterviewType = 'technical';
          }
          
          res.json({ 
            isComplete: true,
            allInterviewsCompleted: false,
            nextInterviewType,
            message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed successfully!`
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

  // New Job Application Endpoint with AI Skill Analysis
  app.post('/api/job-applications/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { job } = req.body;

      console.log('📝 Job application submission attempt:', {
        userId,
        jobTitle: job?.jobTitle,
        jobId: job?.recordId,
        hasEmployerAnswers: !!job?.notes
      });

      if (!job) {
        console.error('❌ No job data provided in request body');
        return res.status(400).json({ message: 'Job data is required' });
      }

      // Extract employer question answers from notes field if present
      const employerQuestionAnswers = job.notes || '';
      console.log('📋 Employer question answers:', employerQuestionAnswers ? 'Present' : 'None');

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch complete user profile from Airtable "platouserprofiles" table
      console.log('📋 Fetching complete user profile from Airtable...');
      const completeUserProfileString = await airtableService.getUserProfileFromInterview(userId);
      
      let userProfileData: any = {};
      let userSkills: string[] = [];
      
      if (completeUserProfileString) {
        // The profile is stored as formatted markdown text, not JSON
        // Extract skills from the markdown text using regex
        const skillsMatch = completeUserProfileString.match(/## ✅ \*\*VERIFIED SKILLS\*\*[\s\S]*?(?=##|$)/);
        if (skillsMatch) {
          const skillsSection = skillsMatch[0];
          const skillLines = skillsSection.match(/• \*\*(.*?)\*\*/g);
          if (skillLines) {
            userSkills = skillLines.map(line => 
              line.replace(/• \*\*(.*?)\*\*.*/, '$1').toLowerCase().trim()
            ).filter(Boolean);
          }
        }
        
        // If no verified skills section, try to extract from any skills mentions
        if (userSkills.length === 0) {
          const allSkillMatches = completeUserProfileString.match(/\*\*([\w\s]+)\*\*/g);
          if (allSkillMatches) {
            userSkills = allSkillMatches
              .map(match => match.replace(/\*\*/g, '').toLowerCase().trim())
              .filter(skill => 
                skill.length > 2 && 
                !skill.includes('overview') && 
                !skill.includes('profile') &&
                !skill.includes('skills') &&
                !skill.includes('insights')
              );
          }
        }
        
        userProfileData = { formattedProfile: completeUserProfileString };
        console.log('✅ Using complete user profile from Airtable interview');
      } else {
        console.warn('⚠️ No complete user profile found in Airtable');
      }

      // Extract job skills from job description text instead of job.skills array
      let jobSkills: string[] = [];
      const jobDescription = job.jobDescription || '';
      
      // Look for skills in various formats within the job description
      const skillPatterns = [
        /(?:skills?|requirements?|qualifications?|experience)[:\s]*([^.]*)/gi,
        /(?:proficiency|knowledge|expertise)\s+(?:in|with|of)[:\s]*([^.]*)/gi,
        /(?:must have|required|essential)[:\s]*([^.]*)/gi
      ];
      
      skillPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Extract individual skills from the matched text
            const skillText = match.replace(/(?:skills?|requirements?|qualifications?|experience|proficiency|knowledge|expertise|must have|required|essential)[:\s]*/gi, '');
            const extractedSkills = skillText.split(/[,;•\-\n]/)
              .map(skill => skill.trim().toLowerCase())
              .filter(skill => skill.length > 2 && skill.length < 30);
            jobSkills.push(...extractedSkills);
          });
        }
      });
      
      // Remove duplicates and common words
      jobSkills = [...new Set(jobSkills)].filter(skill => 
        !['and', 'or', 'with', 'in', 'of', 'the', 'to', 'for', 'on'].includes(skill)
      );
      
      console.log('📋 Extracted job skills from description:', jobSkills);
      
      // If no skills found in description, allow application to proceed
      if (jobSkills.length === 0) {
        console.warn("⚠️ No specific skills extracted from job description");
        jobSkills = ['general experience']; // Use generic requirement
      }
      
      if (userSkills.length === 0) {
        console.warn("⚠️ User has no skills in their AI profile");
      }
      
      console.log('📋 Job Skills:', jobSkills);
      console.log('📋 User Skills:', userSkills);

      // Perform skill comparison
      const missingSkills = jobSkills.filter(skill => !userSkills.includes(skill));
      const matchedSkills = jobSkills.length - missingSkills.length;
      const totalSkills = jobSkills.length;

      console.log(`📊 Skills Analysis: ${matchedSkills}/${totalSkills} matched, ${missingSkills.length} missing`);

      // Generate notes based on missing skills  
      const skillsNotesString = missingSkills.length > 0
        ? missingSkills.map(skill => `• Missing: ${skill}`).join('\n')
        : "No missing skills";

      // Combine employer question answers with skill analysis notes
      let combinedNotes = skillsNotesString;
      if (employerQuestionAnswers && employerQuestionAnswers.trim() !== '') {
        combinedNotes = employerQuestionAnswers + '\n\n--- Skills Analysis ---\n' + skillsNotesString;
      }

      // Prepare application data with complete profile from Airtable
      const applicationData = {
        jobTitle: job.jobTitle,
        jobId: job.recordId,
        jobDescription: job.jobDescription,
        companyName: job.companyName,
        applicantName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${userId}`,
        applicantId: userId,
        aiProfile: userProfileData, // Use complete profile from Airtable
        notes: combinedNotes
      };

      // Submit to Airtable
      console.log('📤 Submitting to Airtable:', {
        jobTitle: applicationData.jobTitle,
        applicantName: applicationData.applicantName,
        totalSkills,
        matchedSkills,
        missingSkillsCount: missingSkills.length
      });
      
      await airtableService.submitJobApplication(applicationData);

      console.log('✅ Application submitted successfully to Airtable');

      res.json({
        success: true,
        message: 'Application submitted successfully',
        analysis: {
          missingSkills,
          notes: combinedNotes,
          totalRequiredSkills: totalSkills,
          matchedSkills: matchedSkills
        }
      });

    } catch (error) {
      console.error('Error submitting job application:', error);
      res.status(500).json({ 
        message: 'Failed to submit application. Please try again.',
        error: error.message 
      });
    }
  });

  app.post('/api/interview/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/interview/complete-voice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

        // Update profile completion percentage
        await storage.updateProfileCompletion(userId);

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

      // Check if all interviews are completed after this one
      if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
        res.json({ 
          isComplete: true,
          allInterviewsCompleted: true,
          profile: generatedProfile,
          message: "Voice interview completed! All interviews finished - your comprehensive profile has been generated."
        });
      } else {
        // Individual interview complete - determine next interview type
        let nextInterviewType = null;
        if (interviewType === 'personal' && !updatedProfile?.professionalInterviewCompleted) {
          nextInterviewType = 'professional';
        } else if ((interviewType === 'personal' || interviewType === 'professional') && !updatedProfile?.technicalInterviewCompleted) {
          nextInterviewType = 'technical';
        }
        
        res.json({ 
          isComplete: true,
          allInterviewsCompleted: false,
          nextInterviewType,
          profile: generatedProfile,
          message: "Voice interview completed successfully!"
        });
      }
    } catch (error) {
      console.error("Error completing voice interview:", error);
      res.status(500).json({ message: "Failed to complete voice interview" });
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



  app.post('/api/interview/voice-submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Update profile completion percentage
      await storage.updateProfileCompletion(userId);

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
  app.get('/api/job-matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check current job matches in Airtable
      const airtableMatches = await airtableService.getJobMatchesFromAirtable();
      const userAirtableMatches = airtableMatches.filter(match => match.userId === userId);
      
      console.log(`📋 Airtable matches for user ${userId}: ${userAirtableMatches.length}`);
      
      // If no matches in Airtable, clear database matches for this user
      if (userAirtableMatches.length === 0) {
        // Get current database matches and remove them
        const currentMatches = await storage.getJobMatches(userId);
        if (currentMatches.length > 0) {
          console.log(`🗑️ Clearing ${currentMatches.length} obsolete job matches for user ${userId}`);
          // Clear job matches from database since they're no longer in Airtable
          await storage.clearJobMatches(userId);
        }
        res.json([]);
        return;
      }
      
      // If matches exist in Airtable, ensure they're synced to database
      for (const airtableMatch of userAirtableMatches) {
        await airtableService.processJobMatch(airtableMatch);
      }
      
      // Return current database matches
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });

  // Upcoming interviews endpoint
  app.get('/api/upcoming-interviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const interviews = await airtableService.getUpcomingInterviews(userId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching upcoming interviews:", error);
      res.status(500).json({ message: "Failed to fetch upcoming interviews" });
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

  // Application routes - Real Airtable applications
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's applications from Airtable
      const airtableApplications = await airtableService.getUserApplications(userId);
      
      // Use status directly from Airtable instead of calculating it
      const processedApplications = airtableApplications.map((app) => {
        // Normalize status to lowercase and handle variations
        let status = 'pending'; // Default status
        if (app.status) {
          const normalizedStatus = app.status.toLowerCase().trim();
          // Map Airtable status values to our expected values
          if (['accepted', 'approved', 'hired'].includes(normalizedStatus)) {
            status = 'accepted';
          } else if (['pending', 'under review', 'reviewing'].includes(normalizedStatus)) {
            status = 'pending';
          } else if (['denied', 'rejected', 'declined'].includes(normalizedStatus)) {
            status = 'denied';
          } else if (['closed', 'cancelled', 'expired'].includes(normalizedStatus)) {
            status = 'closed';
          } else {
            status = normalizedStatus; // Use as-is if it's already a valid status
          }
        }
        
        return {
          recordId: app.recordId,
          jobTitle: app.jobTitle,
          jobId: app.jobId,
          companyName: app.companyName,
          appliedAt: app.createdTime,
          status,
          notes: app.notes,
          jobDescription: app.jobDescription
        };
      });
      
      console.log(`📋 Returning ${processedApplications.length} processed applications for user ${userId}`);
      res.json(processedApplications);
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

      // Get user's AI profile from their applicant profile
      const userProfile = await storage.getApplicantProfile(userId);
      if (!userProfile || !userProfile.aiProfile) {
        return res.status(400).json({ 
          message: "AI profile not found. Please complete your interviews first." 
        });
      }

      // Get user's basic info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create application
      const application = await storage.createApplication(applicationData);

      // Prepare complete application package for company
      const applicationPackage = {
        application,
        candidate: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          profileImage: user.profileImageUrl
        },
        aiProfile: userProfile.aiProfile,
        resumeUrl: userProfile.resumeUrl,
        resumeContent: userProfile.resumeContent,
        submittedAt: new Date().toISOString()
      };

      // Log the application submission for companies to retrieve
      console.log('📧 NEW JOB APPLICATION SUBMITTED');
      console.log('='.repeat(50));
      console.log(`📋 Job: ${applicationData.jobTitle} at ${applicationData.companyName}`);
      console.log(`👤 Candidate: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`🤖 AI Profile: ${userProfile.aiProfile ? 'Available' : 'Not Available'}`);
      console.log(`📄 Resume: ${userProfile.resumeUrl ? 'Available' : 'Not Available'}`);
      console.log(`⏰ Submitted: ${applicationPackage.submittedAt}`);
      console.log('='.repeat(50));

      // TODO: In production, send email to company or store in company portal
      // For now, we log the complete application data for companies to access
      console.log('📋 COMPLETE APPLICATION PACKAGE FOR COMPANY:');
      console.log(JSON.stringify(applicationPackage, null, 2));
      
      res.json({
        ...application,
        message: "Application submitted successfully with AI profile and CV"
      });
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Job postings routes
  app.get('/api/job-postings', isAuthenticated, async (req: any, res) => {
    try {
      const jobPostings = await airtableService.getAllJobPostings();
      res.json(jobPostings);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  // Cache for parsed employer questions (5-minute expiration)
  const employerQuestionsCache = new Map<string, {
    questions: any[];
    rawText: string;
    parsedAt: number;
  }>();

  // Real-time employer questions endpoint - fetches directly from Airtable
  app.post('/api/employer-questions/realtime', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.body;
      
      console.log('📋 Fetching real-time employer questions for job:', jobId);
      
      if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required' });
      }

      // Fetch the latest employer questions directly from Airtable
      const latestEmployerQuestions = await airtableService.getLatestEmployerQuestions(jobId);
      
      console.log('📋 Latest employer questions from Airtable:', latestEmployerQuestions ? 'Present' : 'None');
      
      if (!latestEmployerQuestions || latestEmployerQuestions.trim() === '') {
        console.log('❌ No employer questions found for this job');
        return res.json({ questions: [], rawText: '', lastUpdated: new Date().toISOString() });
      }

      // Check cache first (5-minute expiration)
      const cacheKey = `${jobId}_${Buffer.from(latestEmployerQuestions).toString('base64').slice(0, 20)}`;
      const cached = employerQuestionsCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.parsedAt) < 300000) { // 5 minutes = 300000ms
        console.log('✅ Using cached parsed questions');
        return res.json({
          questions: cached.questions,
          rawText: cached.rawText,
          lastUpdated: new Date(cached.parsedAt).toISOString(),
          fromCache: true
        });
      }

      // Parse the questions using OpenAI
      const questions = await employerQuestionService.parseEmployerQuestions(latestEmployerQuestions);
      
      console.log('✅ Parsed questions result:', questions);
      
      // Cache the result
      employerQuestionsCache.set(cacheKey, {
        questions,
        rawText: latestEmployerQuestions,
        parsedAt: now
      });

      // Clean old cache entries (keep only last 100 entries)
      if (employerQuestionsCache.size > 100) {
        const oldestKeys = Array.from(employerQuestionsCache.keys()).slice(0, 50);
        oldestKeys.forEach(key => employerQuestionsCache.delete(key));
      }
      
      res.json({ 
        questions,
        rawText: latestEmployerQuestions,
        lastUpdated: new Date().toISOString(),
        fromCache: false
      });
    } catch (error) {
      console.error("Error fetching real-time employer questions:", error);
      res.status(500).json({ message: "Failed to fetch employer questions" });
    }
  });

  // Smart Job Application with Skill Matching
  app.post('/api/applications/analyze-and-submit', isAuthenticated, multer({ storage: multer.memoryStorage() }).single('cv'), async (req: any, res) => {
    try {
      console.log('🎯 Smart job application analysis request received');
      console.log('📋 Request body:', req.body);
      console.log('📄 File uploaded:', req.file ? 'Yes' : 'No');
      
      const userId = req.user.claims.sub;
      const { jobId, jobTitle, companyName, jobDescription, requirements, skills, experienceLevel } = req.body;

      // CV upload is optional - proceed without it
      const cvContent = req.file ? 
        `CV file uploaded: ${req.file.originalname} (${req.file.size} bytes)` : 
        'No CV uploaded - using AI profile data';

      // Get user data and AI profile
      const user = await storage.getUser(userId);
      const userProfile = await storage.getApplicantProfile(userId);
      
      if (!user || !userProfile || !userProfile.aiProfile) {
        console.error('❌ User profile or AI profile not found');
        return res.status(400).json({ 
          success: false,
          qualified: false,
          message: "Failed to analyze application. Please try again." 
        });
      }

      console.log('🧠 AI Profile found:', !!userProfile.aiProfile);
      
      // Parse job required skills and user AI profile skills
      const jobRequiredSkills = skills ? 
        skills.split(',').map((s: string) => s.trim().toLowerCase()) : [];
      
      const userAISkills = userProfile.aiProfile?.verifiedSkills || 
        userProfile.aiProfile?.skills || 
        [];
      const userSkillsLower = userAISkills.map((s: string) => s.toLowerCase());

      console.log('🔍 Job required skills:', jobRequiredSkills);
      console.log('👤 User AI skills:', userSkillsLower);

      // Find missing skills
      const missingSkills = jobRequiredSkills.filter(
        jobSkill => !userSkillsLower.includes(jobSkill)
      );

      console.log('❌ Missing skills:', missingSkills);
      console.log('📊 Missing count:', missingSkills.length);

      // Determine if qualified (missing 3 or fewer skills)
      const qualified = missingSkills.length <= 3;
      
      console.log('✅ Qualified for application:', qualified);

      if (qualified) {
        // User is qualified - submit application to Airtable
        try {
          await airtableService.storeJobApplication({
            name: `${user.firstName} ${user.lastName}`,
            userId: userId,
            email: user.email || '',
            jobTitle: jobTitle,
            companyName: companyName,
            applicationDate: new Date().toISOString(),
            resume: cvContent,
            userProfile: JSON.stringify(userProfile.aiProfile),
            score: 100 - (missingSkills.length * 10), // Score based on skill match
            analysisDetails: `Skills Match Analysis: Missing ${missingSkills.length} out of ${jobRequiredSkills.length} required skills. Missing: ${missingSkills.join(', ')}`
          });

          console.log('✅ Application stored in Airtable successfully');
        } catch (airtableError) {
          console.error('❌ Failed to store in Airtable:', airtableError);
          return res.status(500).json({ 
            success: false,
            qualified: false,
            message: "Failed to analyze application. Please try again." 
          });
        }

        // Create local application record
        try {
          const applicationData = {
            userId,
            jobId: parseInt(jobId) || 1,
            jobTitle,
            companyName,
            appliedAt: new Date(),
            status: 'pending'
          };

          await storage.createApplication(applicationData);
          console.log('✅ Application stored locally');
        } catch (dbError) {
          console.error('❌ Failed to store locally:', dbError);
          // Continue even if local storage fails
        }

        // Return success response
        return res.json({
          success: true,
          qualified: true,
          submitted: true,
          message: `Application submitted successfully! You match ${jobRequiredSkills.length - missingSkills.length} out of ${jobRequiredSkills.length} required skills.`,
          skillsMatch: {
            total: jobRequiredSkills.length,
            matched: jobRequiredSkills.length - missingSkills.length,
            missing: missingSkills
          }
        });

      } else {
        // User is not qualified - do not submit
        console.log('❌ User not qualified - too many missing skills');
        
        return res.json({
          success: true,
          qualified: false,
          submitted: false,
          message: "Application Not Submitted\n\nUnfortunately, you don't meet enough of the job requirements to apply at this time. We encourage you to keep growing your skills and try again soon.",
          skillsMatch: {
            total: jobRequiredSkills.length,
            matched: jobRequiredSkills.length - missingSkills.length,
            missing: missingSkills
          }
        });
      }

    } catch (error) {
      console.error("❌ Error in smart job application analysis:", error);
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.claims?.sub,
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body || {})
      });
      
      return res.status(500).json({ 
        success: false,
        qualified: false,
        message: "Failed to analyze application. Please try again."
      });
    }
  });

  // AI Job Application Analysis Route
  app.post('/api/job-application/analyze', isAuthenticated, async (req: any, res) => {
    try {
      let userId = req.user?.claims?.sub;
      const { jobId, jobTitle, jobDescription, companyName, requirements, employmentType } = req.body;

      console.log('📊 Job Analysis Request:', { userId, jobTitle, companyName });

      // Get user profile and interview data
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      const interviewHistory = await storage.getInterviewHistory(userId);

      console.log('👤 User data:', { hasUser: !!user, hasProfile: !!profile, hasAiProfile: !!profile?.aiProfile });

      if (!profile?.aiProfile) {
        console.log('❌ No AI profile found for user');
        return res.status(400).json({ 
          message: "Complete your interview process first to get personalized job analysis" 
        });
      }

      // Get completed interviews for context
      const completedInterviews = interviewHistory.filter(session => session.isCompleted);
      let allInterviewResponses: any[] = [];
      
      completedInterviews.forEach(session => {
        const sessionData = session.sessionData as any;
        if (sessionData.responses) {
          allInterviewResponses = allInterviewResponses.concat(sessionData.responses);
        }
      });

      // Use AI to analyze comprehensive job match
      const analysisPrompt = `
You are a professional career counselor conducting a comprehensive job fit analysis. Analyze the job against the user's complete profile and all three interview responses.

USER COMPLETE PROFILE:
- Name: ${user?.firstName} ${user?.lastName}
- Email: ${user?.email}
- Profile Data: ${JSON.stringify(profile)}
- AI Generated Profile: ${JSON.stringify(profile.aiProfile)}
- Complete Interview History: ${JSON.stringify(allInterviewResponses)}

JOB DETAILS:
- Title: ${jobTitle}
- Company: ${companyName}
- Description: ${jobDescription}
- Requirements: ${JSON.stringify(requirements)}
- Employment Type: ${employmentType}

ANALYSIS REQUIREMENTS:
1. Extract ALL specific requirements from the job description (technical skills, tools, experience years, education, location, certifications, etc.)
2. Compare each requirement against user's complete profile and all three interview responses
3. Identify what the user is missing - be specific (e.g., "Python experience", "3+ years in sales", "willingness to relocate")
4. If user has 70%+ of requirements, it's a good match
5. If user has less than 70% of requirements, list only what's missing

EVALUATION CRITERIA:
- Technical skills and tools mentioned in job vs user's skills
- Experience level requirements vs user's actual experience
- Location requirements vs user's location/preferences
- Education requirements vs user's background
- Certifications mentioned vs user's certifications
- Soft skills required vs user's demonstrated abilities

Response format (JSON):
{
  "matchScore": number (0-100),
  "isGoodMatch": boolean,
  "missingRequirements": ["Missing item 1", "Missing item 2", "Missing item 3"] or null
}

IMPORTANT: Only include items in missingRequirements that the user clearly lacks. Be specific and factual.`;

      console.log('🤖 Sending comprehensive job analysis request to OpenAI...');
      const response = await aiInterviewAgent.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are a professional career counselor who analyzes job matches comprehensively using all available user data. Be direct, honest, and constructive." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      console.log('✅ OpenAI analysis response received');
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure proper format
      const formattedAnalysis = {
        matchScore: Math.min(Math.max(analysis.matchScore || 0, 0), 100),
        isGoodMatch: analysis.isGoodMatch || false,
        missingRequirements: analysis.missingRequirements || null
      };

      console.log('📊 Analysis complete:', { matchScore: formattedAnalysis.matchScore, isGoodMatch: formattedAnalysis.isGoodMatch, missingRequirements: formattedAnalysis.missingRequirements });
      res.json(formattedAnalysis);
    } catch (error) {
      console.error("❌ Error analyzing job application:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ message: "Failed to analyze job match. Please try again." });
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

  // Clear tracking for testing
  app.post('/api/debug/clear-tracking', isAuthenticated, async (req, res) => {
    try {
      airtableService.clearProcessedTracking();
      res.json({ message: 'Tracking cleared successfully' });
    } catch (error) {
      console.error('Error clearing tracking:', error);
      res.status(500).json({ message: 'Failed to clear tracking' });
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
  }, 60000); // Check every 60 seconds (1 minute)

  console.log("🚀 Airtable job monitoring system started - checking every 60 seconds");

  const httpServer = createServer(app);
  return httpServer;
}
