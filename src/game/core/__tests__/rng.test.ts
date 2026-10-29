import { describe, it, expect } from 'vitest'
import {
  dailySeed,
  hashString,
  mazeFingerprint,
  mulberry32,
  randInt,
  randomSeed,
  rngFor,
  sanitizeSeed,
} from '../rng'

describe('rng.ts: Deterministic PRNG and Stream Isolation', () => {
  it('hashString should produce deterministic 32-bit uint', () => {
    const h1 = hashString('cyber-labyrinth')
    const h2 = hashString('cyber-labyrinth')
    expect(h1).toBe(h2)
    expect(h1).toBeGreaterThanOrEqual(0)
    expect(h1).toBeLessThanOrEqual(0xffffffff)
    expect(hashString('cyber-labyrinth-1')).not.toBe(h1)
  })

  it('mulberry32 should produce identical float sequences for the same seed', () => {
    const rng1 = mulberry32(12345)
    const rng2 = mulberry32(12345)

    const seq1 = Array.from({ length: 50 }, () => rng1())
    const seq2 = Array.from({ length: 50 }, () => rng2())

    expect(seq1).toEqual(seq2)
    expect(seq1.every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('rngFor should produce identical sequences for same (seed, tag, sub)', () => {
    const rngA = rngFor('test-seed-42', 'gen', 'm')
    const rngB = rngFor('test-seed-42', 'gen', 'm')

    const seqA = Array.from({ length: 20 }, () => rngA())
    const seqB = Array.from({ length: 20 }, () => rngB())
    expect(seqA).toEqual(seqB)
  })

  it('stream isolation: different tags/subs should produce completely independent streams without crosstalk', () => {
    // Generate stream
    const genRng1 = rngFor('my-seed', 'gen', 'm')
    const shiftRng1 = rngFor('my-seed', 'shift', 1)

    // Pulling numbers from genRng1 should not change shiftRng2 initialized with same seed
    for (let i = 0; i < 100; i++) genRng1()

    const shiftRng2 = rngFor('my-seed', 'shift', 1)
    const seq1 = Array.from({ length: 20 }, () => shiftRng1())
    const seq2 = Array.from({ length: 20 }, () => shiftRng2())

    expect(seq1).toEqual(seq2)
  })

  it('sanitizeSeed trims, truncates to 32 chars, and generates random seed if empty', () => {
    expect(sanitizeSeed('  hello-world  ')).toBe('hello-world')
    expect(sanitizeSeed('a'.repeat(50)).length).toBe(32)
    const emptySeed = sanitizeSeed('   ')
    expect(emptySeed.length).toBe(6)
  })

  it('randomSeed produces a 6-character alphanumeric string', () => {
    const s1 = randomSeed()
    const s2 = randomSeed()
    expect(s1.length).toBe(6)
    expect(s2.length).toBe(6)
    expect(/^[0-9a-z]{6}$/.test(s1)).toBe(true)
  })

  it('dailySeed matches daily-YYYY-MM-DD format', () => {
    const fixedDate = new Date(Date.UTC(2026, 9, 26))
    expect(dailySeed(fixedDate)).toBe('daily-2026-10-26')
  })

  it('mazeFingerprint outputs a 6-character hex string and is deterministic', () => {
    const openA = new Uint8Array([1, 0, 1, 1, 0, 1, 0, 0, 1])
    const openB = new Uint8Array([1, 0, 1, 1, 0, 1, 0, 0, 1])
    const openC = new Uint8Array([1, 0, 1, 1, 0, 1, 0, 0, 0])

    const fpA = mazeFingerprint(openA)
    const fpB = mazeFingerprint(openB)
    const fpC = mazeFingerprint(openC)

    expect(fpA.length).toBe(6)
    expect(fpA).toBe(fpB)
    expect(fpA).not.toBe(fpC)
    expect(/^[0-9a-f]{6}$/.test(fpA)).toBe(true)
  })
})
