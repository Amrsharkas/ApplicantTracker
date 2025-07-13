import admin from 'firebase-admin';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "plato-244d4",
  });
}

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
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user exists by email (for migration from Replit auth)
    let userId = decodedToken.uid;
    if (decodedToken.email) {
      const existingUser = await storage.getUserByEmail(decodedToken.email);
      if (existingUser) {
        // Use existing user ID for backward compatibility
        userId = existingUser.id;
      } else {
        // New user - create with Firebase UID
        await storage.upsertUser({
          id: decodedToken.uid,
          email: decodedToken.email || null,
          firstName: decodedToken.name?.split(' ')[0] || null,
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || null,
          profileImageUrl: decodedToken.picture || null,
        });
      }
    }

    // Store user info in request
    req.user = {
      uid: userId,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};