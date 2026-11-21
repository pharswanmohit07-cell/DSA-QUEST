import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseConfig', () => ({
  getSupabaseConfig: () => ({
    url: 'https://unit-test.supabase.co',
    key: 'test-publishable-key',
  }),
}))

import { signIn } from './auth'

const profileEndpoint = 'https://unit-test.supabase.co/rest/v1/player_profiles'

describe('account profile persistence', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes the signed-in player profile to the table created by the migration', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: { id: 'player-123', user_metadata: { display_name: 'Village Ranger' } },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    await signIn('player@example.test', 'test-password')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(profileEndpoint)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Prefer: 'resolution=merge-duplicates',
      }),
    })
  })
})
