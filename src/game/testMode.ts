/**
 * TEMPORARY testing aid.
 *
 * When true, the Settings menu shows a "TEST MODE: GATE" button that opens or
 * closes the quest-locked torii gate at runtime, so collision can be tested
 * without replaying the Elder's quest each time.
 *
 * It does not touch quest progress or saved data: reloading the page restores
 * the real gate state. To remove the feature before submission, set this to
 * false (or delete the "TEST MODE" blocks marked TEMP in SettingsModal.tsx,
 * GameWorld.tsx, MainScene.ts and settingsModal.css).
 */
export const TEST_MODE_BUTTON_ENABLED = true
