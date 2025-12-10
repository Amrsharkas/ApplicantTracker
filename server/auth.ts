import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { emailService } from "./emailService";
import { registerSchema } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Email verification utilities
function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

function generateResetPasswordToken(): string {
  return randomBytes(32).toString("hex");
}

function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000';
  // Ensure no trailing slash and proper URL format
  return baseUrl.replace(/\/$/, '');
}

function generateVerificationLink(token: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/verify-email/${token}`;
}

function generateResetPasswordLink(token: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/reset-password/${token}`;
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [hashedPassword, salt] = hash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex") === hashedPassword;
}

// Authentication middleware
export const requireAuth: RequestHandler = async (req: any, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Get user data and attach to request
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Setup authentication routes
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
        try {
          console.log('🔍 Google OAuth callback triggered, profile:', JSON.stringify({
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.name,
            hasPhoto: !!profile.photos?.[0]?.value
          }, null, 2));

          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            console.error('❌ No email found in Google profile');
            return done(new Error('Email is required from Google profile'));
          }

          console.log(`🔍 Processing Google OAuth for: ${email}, Google ID: ${googleId}`);

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);
          if (user && user.role === "applicant") {
            console.log(`✅ Found existing Google user: ${user.email} (ID: ${user.id})`);
            return done(null, user);
          }

          // Check if user exists with this email and same role (account linking)
          user = await storage.getUserByEmail(email);
          if (user && user.role === "applicant") {
            // Link Google account to existing user with 'applicant' role
            console.log(`🔗 Linking Google account to existing user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
            const updatedUser = await storage.updateUserGoogleAuth(user.id, {
              googleId,
              authProvider: 'google',
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
            console.log(`✅ Successfully linked Google account for: ${updatedUser.email}`);
            return done(null, updatedUser);
          } else if (user && user.role !== "applicant") {
            // Email exists but with different role - create new Google OAuth user with 'applicant' role
            console.log(`📧 Email exists with different role (${user.role}) - creating new Google OAuth user: ${email}`);
            try {
              const userId = randomBytes(16).toString('hex'); // Generate unique ID
              const newUser = await storage.createUser({
                id: userId,
                email,
                password: await hashPassword(randomBytes(32).toString('hex')), // Random password for OAuth users
                firstName,
                lastName,
                profileImageUrl,
                isVerified: true, // Auto-verify Google users
                googleId,
                authProvider: 'google',
                passwordNeedsSetup: false,
                role: 'applicant', // Explicitly set role to 'applicant' for Google OAuth users
              });
              console.log(`✅ Created new Google OAuth user with 'applicant' role: ${email} (ID: ${newUser.id})`);
              return done(null, newUser);
            } catch (createError) {
              console.error(`❌ Failed to create Google OAuth user:`, createError);
              return done(createError as Error);
            }
          }

          // Create new user from Google profile
          console.log(`👤 Creating new Google user: ${email} (No existing user found)`);
          try {
            const userId = randomBytes(16).toString('hex'); // Generate unique ID
            const newUser = await storage.createUser({
              id: userId,
              email,
              password: await hashPassword(randomBytes(32).toString('hex')), // Random password for OAuth users
              firstName,
              lastName,
              profileImageUrl,
              isVerified: true, // Auto-verify Google users
              googleId,
              authProvider: 'google',
              passwordNeedsSetup: false,
              role: 'applicant', // Explicitly set role to 'applicant' for Google OAuth users
            });

            // Create basic applicant profile
            try {
              await storage.upsertApplicantProfile({
                userId: newUser.id,
                name: `${firstName} ${lastName}`,
                email: email,
              });
            } catch (profileError) {
              console.warn('Failed to create initial profile:', profileError);
              // Continue with registration even if profile creation fails
            }

            console.log(`✅ Created new Google user: ${email} (ID: ${newUser.id})`);
            return done(null, newUser);
          } catch (createError) {
            console.error(`❌ Failed to create new Google user:`, createError);
            return done(createError as Error);
          }
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error);
        }
      }
    )
  );

  // Passport serialization/deserialization
  passport.serializeUser((user, done) => done(null, (user as any).id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post('/api/register', async (req: any, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return res.status(400).json({
          error: firstIssue?.message ?? 'Invalid registration data',
          issues: parsed.error.issues,
        });
      }

      const { email, password, firstName, lastName, username, acceptedTermsText } = parsed.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Check username if provided
      if (username) {
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const userId = randomBytes(16).toString('hex'); // Generate unique ID

      const user = await storage.createUser({
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        role: 'applicant',
        isVerified: false, // Require email verification
        verificationToken,
        termsAcceptedAt: new Date(),
        termsAcceptedText: acceptedTermsText,
      });

      // Create basic applicant profile
      try {
        await storage.upsertApplicantProfile({
          userId: user.id,
          name: `${firstName} ${lastName}`,
          email: email,
        });
      } catch (profileError) {
        console.warn('Failed to create initial profile:', profileError);
        // Continue with registration even if profile creation fails
      }

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
          verificationLink: generateVerificationLink(verificationToken),
        });
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send verification email:", emailError);
        // Still allow registration to continue, but log the error
      }

      // Create session for the user (authenticated but not verified)
      req.session.userId = user.id;

      // Return success with user data and session
      const { password: _, verificationToken: __, ...userWithoutSensitiveData } = user;
      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: userWithoutSensitiveData,
        requiresVerification: !user.isVerified
      });

    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/login', async (req: any, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
      });

      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if email is verified
      if (!user.isVerified && user.authProvider === 'local') {
        return res.status(403).json({
          error: 'Email verification required',
          message: 'Please verify your email address before logging in. Check your inbox for the verification email.',
          requiresVerification: true,
          email: user.email
        });
      }

      // Check if user has the required role (only "applicant" role allowed)
      if (user.role !== "applicant") {
        return res.status(403).json({
          error: "Access denied",
          message: "This login is only available for users with 'applicant' role. Your account has a different role.",
          userRole: user.role
        });
      }

      // Create session
      req.session.userId = user.id;

      // Return user without password
      const { password: _, verificationToken: __, ...userWithoutSensitiveData } = user;
      res.json({ user: userWithoutSensitiveData, message: 'Login successful' });

    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  // Email verification endpoint
  app.get('/api/verify-email/:token', async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired verification token',
          message: 'The verification link is invalid or has expired. Please request a new verification email.'
        });
      }

      // Check if already verified
      if (user.isVerified) {
        return res.status(200).json({
          message: 'Email already verified',
          alreadyVerified: true
        });
      }

      // Verify the user's email
      const updatedUser = await storage.verifyUserEmail(user.id);
      console.log(`✅ Email verified for user: ${user.email}`);

      // Send success email
      try {
        await emailService.sendVerificationSuccessEmail({
          email: user.email,
          firstName: user.firstName,
        });
        console.log(`✅ Verification success email sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send verification success email:", emailError);
        // Continue with the process even if email fails
      }

      res.json({
        message: 'Email verified successfully! You can now log in to your account.',
        success: true
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        error: 'Email verification failed',
        message: 'An error occurred during email verification. Please try again or contact support.'
      });
    }
  });

  // Resend verification email endpoint
  app.post('/api/resend-verification', async (req, res) => {
    try {
      const resendSchema = z.object({
        email: z.string().email('Invalid email format'),
      });

      const { email } = resendSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No account found with this email address.'
        });
      }

      // Check if user is already verified
      if (user.isVerified) {
        return res.status(400).json({
          error: 'Email already verified',
          message: 'This email address has already been verified. You can log in to your account.'
        });
      }

      // Generate new verification token
      const newVerificationToken = generateVerificationToken();
      await storage.updateVerificationToken(user.id, newVerificationToken);

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
          verificationLink: generateVerificationLink(newVerificationToken),
        });
        console.log(`✅ New verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send verification email:", emailError);
        return res.status(500).json({
          error: 'Failed to send verification email',
          message: 'We could not send the verification email. Please try again later.'
        });
      }

      res.json({
        message: 'Verification email sent successfully! Please check your inbox.',
        success: true
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({
        error: 'Failed to resend verification email',
        message: 'An error occurred while resending the verification email. Please try again.'
      });
    }
  });

  // Password reset request endpoint
  app.post('/api/request-password-reset', async (req, res) => {
    try {
      const resetRequestSchema = z.object({
        email: z.string().email('Invalid email format'),
      });

      const { email } = resetRequestSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message: 'If an account with this email exists, a password reset link has been sent.',
          success: true
        });
      }

      // For Google OAuth users, we can still send reset email but they need to set up a password
      // We'll allow all users to reset password regardless of verification status

      // Generate reset token and expiration (1 hour)
      const resetToken = generateResetPasswordToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await storage.setResetPasswordToken(user.id, resetToken, expires);

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          resetLink: generateResetPasswordLink(resetToken),
        });
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send password reset email:", emailError);
        return res.status(500).json({
          error: 'Failed to send password reset email',
          message: 'We could not send the password reset email. Please try again later.'
        });
      }

      res.json({
        message: 'Password reset link sent! Please check your email inbox.',
        success: true
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({
        error: 'Failed to process password reset request',
        message: 'An error occurred while processing your request. Please try again.'
      });
    }
  });

  // Verify reset token endpoint
  app.get('/api/verify-reset-token/:token', async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Reset token is required' });
      }

      // Find user by reset token
      const user = await storage.getUserByResetPasswordToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid reset token',
          message: 'This reset link is invalid or has expired.'
        });
      }

      // Check if token has expired
      if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
        return res.status(400).json({
          error: 'Token expired',
          message: 'This reset link has expired. Please request a new password reset.'
        });
      }

      res.json({
        message: 'Reset token is valid',
        email: user.email,
        firstName: user.firstName
      });

    } catch (error) {
      console.error('Verify reset token error:', error);
      res.status(500).json({
        error: 'Failed to verify reset token',
        message: 'An error occurred while verifying the reset token.'
      });
    }
  });

  // Reset password endpoint
  app.post('/api/reset-password', async (req, res) => {
    try {
      const resetPasswordSchema = z.object({
        token: z.string().min(1, 'Reset token is required'),
        password: z.string()
          .min(8, 'Password must be at least 8 characters long')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number')
          .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
      });

      const { token, password } = resetPasswordSchema.parse(req.body);

      // Find user by reset token
      const user = await storage.getUserByResetPasswordToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid reset token',
          message: 'This reset link is invalid or has expired.'
        });
      }

      // Check if token has expired
      if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
        return res.status(400).json({
          error: 'Token expired',
          message: 'This reset link has expired. Please request a new password reset.'
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user password and clear reset token
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordNeedsSetup: false
      });

      await storage.clearResetPasswordToken(user.id);

      console.log(`✅ Password reset completed for user: ${user.email}`);

      // Return success response
      const { password: _, verificationToken: __, resetPasswordToken: ___, resetPasswordExpires: ____, ...userWithoutSensitiveData } = updatedUser;

      res.json({
        message: 'Password reset successfully! You can now log in with your new password.',
        user: userWithoutSensitiveData,
        success: true
      });

    } catch (error) {
      console.error('Reset password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({
        error: 'Failed to reset password',
        message: 'An error occurred while resetting your password. Please try again.'
      });
    }
  });

  // Set password endpoint (for users with passwordNeedsSetup flag)
  app.post('/api/set-password', async (req: any, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const setPasswordSchema = z.object({
        password: z.string().min(6, 'Password must be at least 6 characters'),
      });

      const { password } = setPasswordSchema.parse(req.body);

      // Get current user
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user needs password setup
      if (!user.passwordNeedsSetup) {
        return res.status(400).json({ error: 'Password already set or setup not required' });
      }

      // Hash password and update user
      const hashedPassword = await hashPassword(password);
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordNeedsSetup: false
      });

      console.log(`✅ Password set for user: ${user.email}`);

      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword, message: 'Password set successfully' });

    } catch (error) {
      console.error('Set password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to set password' });
    }
  });

  // Get current user endpoint
  app.get('/api/user', async (req: any, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Test login endpoint - allows login by ID without password
  // Only enabled when ENABLE_TEST_LOGIN environment variable is true
  app.get("/api/auth/test-login", async (req: any, res) => {
    // Check if test login is enabled
    if (process.env.ENABLE_TEST_LOGIN !== 'true') {
      return res.status(404).json({ error: "Test login endpoint is disabled" });
    }

    try {
      const { userId } = req.query;
      const userIdStr = Array.isArray(userId) ? userId[0] : String(userId);

      if (!userIdStr) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Get user by ID
      const user = await storage.getUser(userIdStr);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has the required role (only "applicant" role allowed)
      if (user.role !== "applicant") {
        console.error(`❌ Test login access denied for user: ${user.email} - Role: ${user.role} (required: applicant)`);
        return res.status(403).json({
          error: "Access denied",
          message: "This test login is only available for users with 'applicant' role",
          userRole: user.role
        });
      }

      // Create session for the user
      req.session.userId = user.id;

      console.log(`🔓 Test login successful for user: ${user.email} (ID: ${user.id})`);

      res.redirect('/dashboard');
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ error: "Test login failed" });
    }
  });

  // Google OAuth routes
  app.get("/auth/google", passport.authenticate("google"));

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth?error=google-auth-failed",
      failureFlash: true,
    }),
    (req, res) => {
      // Successful authentication
      if (req.user) {
        const user = req.user as any;
        console.log(`✅ Google OAuth successful for user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

        // Check if user has the required role (only "applicant" role allowed)
        if (user.role !== "applicant") {
          console.error(`❌ Google OAuth access denied for user: ${user.email} - Role: ${user.role} (required: applicant)`);
          return res.redirect("/auth?error=access-denied");
        }

        // Set session for user
        req.session.userId = user.id;

        // Ensure session is properly saved before redirect
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error:", err);
            return res.redirect("/auth?error=session-save-failed");
          }

          console.log("✅ Session saved successfully, redirecting to dashboard");
          res.redirect("/dashboard");
        });
      } else {
        console.error("❌ Google OAuth failed: No user in request");
        res.redirect("/auth?error=google-auth-failed");
      }
    }
  );

  // Google OAuth failure handler
  app.get("/auth/google/failure", (_req, res) => {
    res.redirect("/auth?error=google-auth-failed");
  });
}