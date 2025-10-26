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

const scryptAsync = promisify(scrypt);

// Email verification utilities
function generateVerificationToken(): string {
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
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('Email is required from Google profile'));
          }

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);
          if (user) {
            console.log(`✅ Found existing Google user: ${user.email} (ID: ${user.id})`);
            return done(null, user);
          }

          // Check if user exists with this email (account linking)
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link Google account to existing user
            console.log(`🔗 Linking Google account to existing user: ${user.email} (ID: ${user.id})`);
            const updatedUser = await storage.updateUserGoogleAuth(user.id, {
              googleId,
              authProvider: 'google',
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });
            console.log(`✅ Successfully linked Google account for: ${updatedUser.email}`);
            return done(null, updatedUser);
          }

          // Create new user from Google profile
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
            role: 'applicant'
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
      const registerSchema = z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        username: z.string().min(3, 'Username must be at least 3 characters').optional(),
      });

      const { email, password, firstName, lastName, username } = registerSchema.parse(req.body);

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
        console.log(`✅ Google OAuth successful for user: ${user.email} (ID: ${user.id})`);

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