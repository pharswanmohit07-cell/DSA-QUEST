# DSA Quest

**DSA Quest** is a pixel-art browser RPG that helps BCA and B.Tech students learn Data Structures and Algorithms through exploration, visual lessons, quests and interactive challenges.

The game combines a React interface with a Phaser-powered village world. Players explore, interact with the Elder, learn core concepts and practise them through quizzes and hands-on activities.

**[Play DSA Quest](https://dsa-quest-delta.vercel.app)**

---

## What the game includes

- **Village exploration:** A pixel-art world with player movement, collision, NPC interaction and a quest gate.
- **Guided learning:** The Elder introduces array concepts with dialogue and visual examples.
- **Array quiz:** A three-question knowledge check with a three-heart attempt system.
- **Stack practice:** A hands-on Push/Pop challenge that demonstrates the Last In, First Out (LIFO) principle. DSA Vision can display stack indices.
- **Coding challenge:** A separate JavaScript sorting exercise where players write a sortArray(arr) function and run it against test cases.
- **Player progression:** Quests, XP, levels, a player profile, character skins and topic-progress display.
- **Save and continue:** Browser-based save data with a versioned campaign save format and legacy-save migration.
- **Optional online features:** Supabase authentication, guest access and a multiplayer lobby with realtime room presence, chat and player-position updates.

## Campaign roadmap

The campaign progression model defines seven topics in sequence:

1. Arrays
2. Stack Operations
3. Queues
4. Linked Lists
5. Searching
6. Sorting
7. Trees

The campaign foundation includes prerequisite checks, topic progress, attempt and hint tracking, mastery grades, relic entitlements and first-completion reward claims.

**Implementation status:** The seven-topic progression foundation is in place, but all seven topics are not yet complete playable quest lines. The current main learning path focuses on the Elder's array lesson and quiz, followed by stack practice. The JavaScript sorting exercise is a separate existing challenge; it should not be mistaken for a completed Sorting campaign topic. The remaining campaign topics are planned for further development.

## Technology

| Area | Technology |
|---|---|
| User interface | React 19 |
| Game engine | Phaser 4 |
| Language | TypeScript |
| Build and development | Vite |
| Tests | Vitest |
| Linting | Oxlint |
| Optional authentication and realtime | Supabase |

React manages the surrounding interface and overlays. Phaser owns the game world, scene, rendering, player movement and in-world interactions.

## Run locally

### Requirements

- Node.js 24.15 or later in the 24.x line, or 22.22.2 or later in the 22.x line
- npm

### Install and start

~~~bash
git clone https://github.com/pharswanmohit07-cell/DSA-QUEST.git
cd DSA-QUEST
npm ci
npm run dev
~~~

Vite prints the local development URL in the terminal.

## Controls

| Input | Action |
|---|---|
| WASD or arrow keys | Move |
| E | Interact with nearby NPCs and objects |
| Esc | Open or close the in-game pause/settings menu |
| On-screen touch controls | Move and interact on supported touch devices |

## Optional Supabase configuration

The single-player game can be used without configuring Supabase. Supabase configuration is needed for online authentication and multiplayer rooms.

Create a root-level .env.local file:

~~~env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
~~~

Use only the browser-safe publishable/anon key. **Never put a Supabase service-role key or other secret key in a VITE_ variable**, because Vite exposes these values to the browser.

Restart the development server after changing environment variables. Do not commit .env.local.

For the Supabase and Vercel setup steps, see [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md).

### Multiplayer scope

The current multiplayer slice supports room creation/joining, presence, chat and player-position updates. It does **not** synchronize quest completion, challenge results or saved campaign progress. It is intended as an optional social feature, not an authoritative competitive system.

## Useful commands

~~~bash
npm run dev           # Start the local development server
npm run build         # Type-check and create the production build
npm run lint          # Run Oxlint
npm test              # Run the Vitest test suite
npm run check:village # Check village collision and walk-behind rules
npm run preview       # Preview the production build locally
~~~

## Project structure

~~~text
src/
  screens/             # Home screen, profile and settings screens
  game/
    scenes/            # Phaser MainScene and in-world gameplay
    challenge/         # Array quiz and stack practice
    quests/            # Quest manager, campaign progression and coding challenges
    dialogue/          # NPC dialogue and dialogue UI
    npc/               # NPC definitions and interaction behaviour
    map/               # Map layers, tile rules and collision helpers
    multiplayer/       # Supabase auth, lobby and realtime room client
    stats/             # Player profile, XP, levels and statistics
    player/            # Player appearance, skins and movement settings
  audio/               # Music, sound effects and audio settings
  assets/              # Pixel-art characters, UI and village assets

scripts/               # Project validation utilities
~~~

## Tests and project checks

Before submitting changes, run:

~~~bash
npm test
npm run build
npm run lint
npm run check:village
~~~

The village checker is a development validation utility. It does not edit the map.

## Deployment

The project is configured for deployment on Vercel. The production site is:

**https://dsa-quest-delta.vercel.app**

Production deployment is managed through the repository's connected Vercel project.

---

DSA Quest is developed as a college Project-Based Learning (PBL) project. Its focus is to make DSA concepts easier to understand through visual interaction and game-based practice.
