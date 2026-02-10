/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MAPTILER_KEY: string;
  readonly VITE_YIELDOPS_BASE_URL?: string;
  readonly VITE_TRANSVEC_BASE_URL?: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
