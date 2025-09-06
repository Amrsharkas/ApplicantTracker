import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine if we're using Neon (production) or local PostgreSQL (development)
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.xyz');
const isProduction = process.env.NODE_ENV === 'production';

let pool: any;
let db: any;

// Initialize database connection based on environment
async function initializeDatabase() {
  if (isNeon || isProduction) {
    // Use Neon serverless database for production
    const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import("ws");

    neonConfig.webSocketConstructor = ws.default;
    
    pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
    db = neonDrizzle({ client: pool, schema });
    
    console.log('🔗 Using Neon serverless database');
  } else {
    // Use local PostgreSQL for development
    const pkg = await import('pg');
    const { drizzle: pgDrizzle } = await import('drizzle-orm/node-postgres');
    
    const { Pool } = pkg.default;
    
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = pgDrizzle(pool, { schema });
    
    console.log('🔗 Using local PostgreSQL database');
  }
}

// Initialize the database
await initializeDatabase();

export { pool, db };