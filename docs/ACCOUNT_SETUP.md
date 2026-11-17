# Optional account setup

DSA Quest is playable offline without Supabase. This document covers the optional account features only.

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the local/preview/production environment where account sign-in is needed.
- Use only the publishable/anon key in Vite variables. Never expose the service-role key in client code.
- Enable email/password sign-in in Supabase Auth. Configure Google or Discord separately in Supabase Auth if those buttons should work.
- Apply `supabase/migrations/20261020060000_create_player_profiles.sql`. It creates `public.player_profiles` with row-level security so players can access only their own profile.
- The browser-local campaign save is not uploaded to Supabase. The admin history view receives best-effort quest activity events only.

The account client stores its Supabase session in a JavaScript-readable cookie. It is not HttpOnly; use a server-backed BFF with HttpOnly cookies for stronger session-token isolation.
