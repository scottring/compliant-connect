// Environment variable configuration utility
interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    env: 'development' | 'staging' | 'production';
  };
  features: {
    enableMockData: boolean;
    enableDebugTools: boolean;
  };
  api: {
    timeout: number;
    maxUploadSize: number;
  };
}

// Validate and load environment variables
function validateEnv(): EnvConfig {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_NAME',
    'VITE_APP_ENV',
  ];

  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    app: {
      name: import.meta.env.VITE_APP_NAME,
      env: import.meta.env.VITE_APP_ENV as EnvConfig['app']['env'],
    },
    features: {
      enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
      enableDebugTools: import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true',
    },
    api: {
      timeout: Number(import.meta.env.VITE_API_TIMEOUT || 30000),
      maxUploadSize: Number(import.meta.env.VITE_MAX_UPLOAD_SIZE || 5242880),
    },
  };
}

// Export the validated configuration
export const env = validateEnv();

// Helper functions
export const isDevelopment = () => env.app.env === 'development';
export const isStaging = () => env.app.env === 'staging';
export const isProduction = () => env.app.env === 'production';

// Debug tools helper
export const shouldEnableDebugTools = () => 
  env.features.enableDebugTools && !isProduction(); 