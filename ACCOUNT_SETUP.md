# Optional account setup

DSA Quest works as a single-player game without Supabase. Configure Supabase only when you want account sign-in, player profiles, OAuth sign-in, and administrator account tools.

## Browser-safe configuration

Create a root-level `.env.local` file for local development:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use only the project's publishable/anon key in browser-exposed `VITE_` variables. Never put a service-role or secret key in `.env.local`, Vercel client environment variables, or source control. Restart the Vite development server after changing the file.

For Vercel, add the same two variables in the project Environment Variables settings for the environments where account features should be available, then redeploy that environment.

## Authentication providers

Email/password sign-in is handled by Supabase Auth. Google and Discord sign-in also require those providers to be enabled and configured in Supabase Auth, including the allowed redirect URLs for the deployed site.

Player display names are stored in `public.player_profiles`. The checked-in migration enables row-level security and restricts each authenticated player to their own row. Keep the service-role key on the server only.

## Current data behavior

The campaign save remains browser-local. The account integration restores the sign-in session and records best-effort quest activity events for the admin history view; it does not synchronize the complete campaign save across browsers or devices.

The current client-side session cookie is JavaScript-readable, not HttpOnly. For stronger token isolation, use a server-backed session/BFF that issues HttpOnly cookies. Do not treat browser-readable cookies as protection against XSS.
