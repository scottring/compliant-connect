// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
// Removed import for non-existent env file

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

console.log('import.meta.env.VITE_SUPABASE_URL',import.meta.env.VITE_SUPABASE_URL)

// Initialize Supabase client with custom settings
export const supabase = createClient<Database>(
  // Access environment variables directly via import.meta.env
  // Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in your .env files
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true, // Enable session persistence
      autoRefreshToken: true, // Automatically refresh token
      detectSessionInUrl: true, // Detect auth tokens in URL
      storage: localStorage, // Explicitly use localStorage
    },
    global: {
      // Add custom headers if needed
      headers: {
        'x-client-info': '@stacksdata/compliance-platform'
      },
    },
    realtime: {
      // Disable realtime subscriptions if not needed
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  }
);
