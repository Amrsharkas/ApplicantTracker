import { RequestHandler } from "express";

// Simple Firebase authentication middleware
// For development, we'll use a simplified approach with just the user ID from Firebase
export const isFirebaseAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // For development, we'll use a simple token validation
    // In production, you would verify the Firebase ID token here
    if (!token || token.length < 10) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Extract user ID from Firebase token structure for development
    // In real Firebase, the token would be decoded to get the actual user info
    let userId = token;
    let email = null;
    
    // Try to extract a realistic user ID from Firebase token structure
    try {
      // Firebase tokens are JWT format, but for development we'll use a simple approach
      if (token.includes('.')) {
        // Looks like a JWT token structure
        const parts = token.split('.');
        if (parts.length === 3) {
          // Use the middle part as a basis for user ID
          userId = Buffer.from(parts[1], 'base64').toString().substring(0, 10) || token.substring(0, 10);
        }
      }
    } catch (e) {
      // Fallback to using the token directly
      userId = token.substring(0, 28); // Firebase UIDs are usually 28 characters
    }

    // Mock user object for development
    (req as any).user = {
      uid: userId,
      email: email || `user${userId.substring(0, 8)}@demo.com`
    };

    next();
  } catch (error) {
    console.error("Firebase auth error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const setupFirebaseAuth = () => {
  console.log("✓ Firebase authentication configured for development");
};