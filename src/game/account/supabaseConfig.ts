export function getSupabaseConfig() {
  const env = import.meta.env as ImportMetaEnv & {
    VITE_SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
  }
  return {
    url: env.VITE_SUPABASE_URL?.trim() ?? '',
    key: env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  }
}
