import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./workers/videoWorker"; // Initialize video processing worker

const app = express();
app.use(cors()); // Enable CORS for all origins
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Debug logging for all requests
  console.log(`[DEBUG] ${req.method} ${path} - ${req.ip} - ${req.get('User-Agent')?.substring(0, 50)}`);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler - ensures all errors return JSON, never HTML
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`Error in ${req.method} ${req.path}:`, err);

    res.status(status).json({
      error: message,
      path: req.path,
      method: req.method
    });
  });

  // Security middleware: block requests to system files
  app.use((req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /^\/home\//,
      /^\/root\//,
      /^\/etc\//,
      /^\/var\//,
      /^\/usr\//,
      /^\/bin\//,
      /^\/sbin\//,
      /^\/proc\//,
      /^\/sys\//,
      /\.\.\//, // Path traversal
      /\.bash_history$/,
      /\.ssh\//,
      /\.env$/,
      /passwd$/,
      /shadow$/,
    ];

    const path = req.path;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(path));

    if (isSuspicious) {
      console.warn(`[SECURITY] Blocked suspicious request: ${req.method} ${path} from ${req.ip}`);
      return res.status(404).json({ error: 'Not Found' });
    }

    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000 for deployment
  // this serves both the API and the client.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
