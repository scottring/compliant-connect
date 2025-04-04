import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
      // Add CORS configuration for Supabase
      proxy: {
        '/supabase': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
      {
        name: 'enforce-import-paths',
        enforce: 'pre' as const,
        resolveId(source: string, importer: string) {
          if (source.includes('/lib/supabase')) {
            throw new Error(
              `Invalid import path "${source}". Please use "@/integrations/supabase/client" instead.`
            );
          }
        }
      } as Plugin
    ].filter(Boolean),
    resolve: {
      alias: {
        // Ensure path resolution is robust
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Ensure environment variables are properly typed
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },
    build: {
      // Optimize build settings
      target: 'es2020',
      outDir: 'dist',
      sourcemap: mode !== 'production',
      // Improve chunking strategy
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-toast',
            ],
          },
        },
      },
    },
  };
});
