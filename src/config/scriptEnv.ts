import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    env: 'development' | 'staging' | 'production';
  };
}

function loadEnv(mode?: string): void {
  const envFile = mode ? `.env.${mode}` : '.env.development';
  const result = dotenv.config({
    path: path.resolve(rootDir, envFile)
  });

  if (result.error) {
    throw new Error(`Error loading environment file ${envFile}: ${result.error.message}`);
  }
}

export function getScriptEnv(mode?: string): EnvConfig {
  // Load environment variables
  loadEnv(mode);

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_NAME',
    'VITE_APP_ENV'
  ];

  // Check for required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    supabase: {
      url: process.env.VITE_SUPABASE_URL!,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY!
    },
    app: {
      name: process.env.VITE_APP_NAME!,
      env: process.env.VITE_APP_ENV as EnvConfig['app']['env']
    }
  };
}

export const isDevelopment = (env: EnvConfig['app']['env']) => env === 'development';
export const isStaging = (env: EnvConfig['app']['env']) => env === 'staging';
export const isProduction = (env: EnvConfig['app']['env']) => env === 'production'; 