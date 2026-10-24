# Security and data-retention policy

Last reviewed: 2026-10-24

This document describes the application's intended data handling and the controls that have been verified in the repository or production database. Provider-managed retention settings must be reviewed separately; this document does not claim those settings have been changed.

## Data inventory and purpose

| Data | Location | Purpose | Retention / deletion |
| --- | --- | --- | --- |
| Email, password verifier, Auth identity and sessions | Supabase Auth | Account authentication | Managed by Supabase Auth. Passwords are submitted only to Auth over HTTPS; application code must never log passwords or bearer tokens. Account deletion and provider-side Auth retention require an operational process. |
| Player display name and timestamps | `public.player_profiles` | Account profile | Keep while the account is active. Delete the profile when the associated account is deleted, subject to any applicable legal obligation. The current app does not expose self-service account deletion; an owner-operated deletion process is therefore required. |
| Game progress, challenge state, local profile | Browser local storage (including the game save store) | Preserve progress on the same browser | Remains until the user clears site data or the application removes it. Signing out does not necessarily clear game progress. Do not use this for secrets or sensitive personal data. |
| Multiplayer presence and game-state broadcasts | Supabase Realtime and browser memory | Live room interaction | Transient application state. Clear client-side state on disconnect. Do not persist movement or presence as a historical player record. Provider operational logs may have separate retention. |
| Multiplayer chat | Realtime broadcast and connected clients | Live room conversation | No application-level long-term chat history is implemented. Treat displayed chat as untrusted input. Provider logs and browser memory are outside this application-level retention rule. |
| Security / operational logs | Vercel and Supabase provider logs | Reliability, abuse detection, incident response | Minimize log content and access. Target a 30-day review/retention window where the provider plan and controls permit; actual provider retention must be confirmed in each dashboard and may differ. Preserve incident evidence only when necessary and restrict access. |

## Access controls

- `public.player_profiles` has row-level security enabled.
- `anon` has no table privileges on `player_profiles`.
- `authenticated` has only `SELECT`, `INSERT`, and `UPDATE` table privileges; it has no `DELETE` or `TRUNCATE` privilege.
- The three RLS policies restrict read, insert, and update operations to the row whose `id` matches `(select auth.uid())`. Update checks both the original and resulting row.
- Do not grant public access to profile listing or expose service-role/secret keys to browser code.
- The admin Edge Function must continue to authenticate the bearer token with Supabase Auth and authorize by a server-configured user UUID plus confirmed email. Do not authorize based on user-editable metadata.
- Client-side realtime validation is defense-in-depth only. Clients can forge broadcasts; never treat client-supplied movement or chat as authoritative evidence.

## Logging rules

Application logs should use an allowlist of structured fields, such as event name, timestamp, outcome, and a pseudonymous request or account identifier when needed.

Never log:
- Passwords, access tokens, refresh tokens, API keys, authorization headers, OAuth fragments, or session cookies.
- Full authentication request/response bodies.
- Unnecessary email addresses, raw chat text, full player payloads, or precise device/location information.
- Database row contents or personal data from failed queries.

For authentication and profile failures, log a stable event code and a sanitized provider error code rather than the full request. Admin actions should be auditable without copying the profile data returned to the administrator into logs. Restrict log access to personnel who need it and periodically review it.

## User-facing transparency and deletion

- Tell players that browser-local progress can remain after sign-out and is removed by clearing site data.
- Provide an account deletion contact/process before treating account deletion as supported. On deletion, revoke active sessions where possible, remove the profile, and document provider backup expiry and restore behavior.
- Do not promise immediate erasure from provider backups or logs unless the provider's actual retention controls and deletion semantics have been verified.
- Do not collect or persist multiplayer chat history unless a defined purpose, access model, retention period, and deletion process are approved and implemented.

## Outstanding operational checks

These items cannot be verified from repository source alone and remain operational tasks:
1. Confirm Supabase Auth leaked-password protection, password-strength rules, and bot/CAPTCHA protections against the project's actual plan and settings.
2. Confirm actual retention periods for Supabase Auth, Postgres, Realtime, Edge Function logs, and Vercel logs/backups in the provider dashboards.
3. Implement and test a supported account-deletion workflow, including session revocation and profile cleanup.
4. Consider a server-managed session/BFF design if HttpOnly cookies are required. The current client-only implementation stores session tokens in a JavaScript-readable cookie; reducing its lifetime does not eliminate XSS token-theft risk.
