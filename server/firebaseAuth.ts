import { RequestHandler } from "express";
import { storage } from "./storage";

// Parse display name into first and last name
function parseDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

// Middleware to handle Firebase user creation/updating
export const handleFirebaseUser: RequestHandler = async (req: any, res, next) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ message: "Missing required user data" });
    }

    const parsedName = parseDisplayName(displayName || "");
    
    // Upsert user in database
    const user = await storage.upsertUser({
      id: uid,
      email,
      displayName: displayName || null,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      profileImageUrl: photoURL || null,
    });

    req.user = user;
    next();
  } catch (error) {
    console.error("Firebase user handling error:", error);
    res.status(500).json({ message: "Failed to process user" });
  }
};

// Simple authentication middleware (Firebase tokens should be validated on frontend)
export const requireAuth: RequestHandler = (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // In a real app, validate Firebase token here
  // For now, we'll extract user ID from token payload (simplified)
  const token = authHeader.split(' ')[1];
  
  try {
    // This is a simplified approach - in production, use Firebase Admin SDK
    const payload = JSON.parse(atob(token.split('.')[1]));
    req.userId = payload.user_id || payload.sub;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};