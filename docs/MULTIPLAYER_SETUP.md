# DSA Quest multiplayer setup

The multiplayer lobby uses Supabase Realtime over WebSockets for room presence and party chat. The existing Phaser adventure remains playable while this first multiplayer layer is configured.

## 1. Create a Supabase project

Create a project at https://supabase.com/dashboard. In Project Settings → API, copy the Project URL and the publishable/anon key. These values are intended for browser clients; never put a service-role key in a Vite environment variable.

## 2. Configure local development

Create a `.env.local` file at the repository root:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Restart Vite after changing environment variables. Do not commit `.env.local`.

## 3. Configure Vercel

In Vercel → DSA Quest → Settings → Environment Variables, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Enable them for Preview and Production as needed, then redeploy. Vite variables are bundled into the public client; only use the publishable/anon key, never a service-role secret.

## 4. Realtime

The lobby uses public Realtime channels named `room:<ROOM_CODE>`. Ensure Realtime is enabled for your Supabase project and that public channels are allowed for this project. Room codes are invitations, not a security boundary; do not send private information in party chat.

## Current scope and next milestone

This first slice provides room creation/joining, live presence, invite links, and party chat. It does not yet render other players as sprites inside the Phaser map, persist player accounts/progression, or implement authoritative coding battles. Those require the next integration phase and server-side validation. Test with two separate browser profiles/devices after configuring the keys.
