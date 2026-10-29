import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCampaignProgress, saveCampaignResult } from '../persistence'

describe('campaign progress persistence', () => {
  let data: Map<string, string>

  beforeEach(() => {
    data = new Map()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('unlocks the next level and keeps the best star result', () => {
    expect(saveCampaignResult(1, 2)).toEqual({ unlocked: 2, stars: { 1: 2 } })
    expect(saveCampaignResult(1, 1)).toEqual({ unlocked: 2, stars: { 1: 2 } })
    expect(saveCampaignResult(2, 3)).toEqual({ unlocked: 3, stars: { 1: 2, 2: 3 } })
    expect(getCampaignProgress()).toEqual({ unlocked: 3, stars: { 1: 2, 2: 3 } })
  })

  it('recovers safely from corrupted saved data', () => {
    data.set('ckl:campaign:v1', '{broken')
    expect(getCampaignProgress()).toEqual({ unlocked: 1, stars: {} })
  })

  it('does not unlock beyond the final campaign level', () => {
    expect(saveCampaignResult(12, 3)).toEqual({ unlocked: 12, stars: { 12: 3 } })
  })
})
