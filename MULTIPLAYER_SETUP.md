# DSA Quest multiplayer setup

The multiplayer client uses Supabase Realtime Broadcast over WebSockets. It is deliberately optional: the existing single-player game continues to work when the multiplayer environment variables are absent.

## 1. Create a Supabase project

Create a project in the Supabase dashboard, then open **Project Settings → API** and copy the project URL and publishable/anon key. The key is intended for browser use; never put a service-role key in Vite or Vercel client environment variables.

## 2. Configure Vercel

In **Vercel → DSA Quest → Settings → Environment Variables**, add both variables for Preview and Production:

- `VITE_SUPABASE_URL` = your Supabase project URL (for example, `https://YOUR_PROJECT.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = your project's publishable/anon key

Redeploy after adding variables. **StackBlitz:** create a `.env.local` file in the repository root and add the same two variables there; StackBlitz does not automatically inherit Vercel variables. Restart the Vite dev server after saving. **Local development:** use the same root-level `.env.local` file. Do not commit `.env.local` or paste its values into public issues or chat. Use only the browser-safe publishable/anon key, never a service-role or secret key.

## 3. Play together

Open the game, expand **WORLD MULTIPLAYER**, create a room, and share its room code or invite URL. Other players open the same deployed site and join with that code. Player movement is broadcast in real time.

## Important security and launch notes

This first multiplayer slice synchronizes public room membership and player positions only. It does not synchronize quests, challenge results, or saved progress yet. Room codes are unguessable-enough for casual friend sessions, not private or authenticated rooms. Do not treat client-reported movement as authoritative for competitive play. Before public launch, add authenticated player identities, rate limits, private-channel authorization, and server-validated scoring. Supabase Realtime usage and project limits apply.
