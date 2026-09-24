const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy apps/web/.env.example to apps/web/.env.local.',
  )
}

export const env = {
  supabaseUrl: url as string,
  supabasePublishableKey: publishableKey as string,
  appVersion: __APP_VERSION__,
}
