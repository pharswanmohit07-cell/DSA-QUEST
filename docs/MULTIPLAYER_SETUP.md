# DSA Quest accounts and multiplayer setup

DSA Quest uses Supabase Auth for player accounts and Supabase Realtime for the multiplayer lobby. Accounts use an email, password, and display name. The app stores a refreshable auth session in browser storage so players stay signed in after reload; logging out clears the stored session. Passwords are handled by Supabase Auth and are not stored by DSA Quest.

## 1. Supabase configuration

In Supabase Project Settings → API, copy the Project URL and the publishable/anon key. These values are intended for browser clients. Never put a service-role or secret key in a Vite environment variable.

Set these values in a local `.env.local` file:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Restart Vite after changing environment variables. Do not commit `.env.local`.

## 2. Authentication and profiles

- Sign-up asks for a display name (2–20 characters), email, and password (at least 8 characters).
- Sign-in uses email and password. If email confirmation is enabled in Supabase Auth, new players must confirm their email before signing in.
- Sessions are restored on page load and refreshed when nearing expiry. Logging out clears the locally stored session.
- Player display names are saved to `public.player_profiles`. The table is protected by row-level security so authenticated users can only access their own profile row.
- The profile table migration is in `supabase/migrations/20261020060000_create_player_profiles.sql`.

## 3. Configure Vercel

In Vercel → DSA Quest → Settings → Environment Variables, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Enable them for Preview and Production, then redeploy. Only use the publishable/anon key in Vite variables; these values are bundled into the public client.

## 4. Realtime lobby

The lobby supports room creation/joining, invite links, live presence, and party chat using public Realtime channels named `room:<ROOM_CODE>`. Ensure Realtime is enabled for the Supabase project and public channels are allowed. Room codes are invitations, not a security boundary; do not send private information in party chat.

Test with two separate browser profiles or devices after configuring the keys.

## Current scope and next milestone

**Implemented:** account creation/sign-in, session restoration, logout, player display-name profiles, lobby rooms, presence, invite links, and party chat.

**Not yet implemented:** synchronized player sprites/movement inside the Phaser village, persistent game progression tied to accounts, and authoritative shared quests or coding battles. Those require a further gameplay/networking integration phase and server-side validation.
