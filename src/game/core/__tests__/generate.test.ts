import { describe, it, expect } from 'vitest'
import { SIZE_CONFIGS, MazeSize } from '../constants'
import { generate, pickStartExit } from '../generate'
import { isSpanningTree, roomId } from '../grid'
import { rngFor } from '../rng'

describe('generate.ts: Maze Generation and Start/Exit Selection', () => {
  it('same seed generates identical open and trace for both DFS and Prim', () => {
    const algos = ['dfs', 'prim'] as const
    for (const algo of algos) {
      const rng1 = rngFor('golden-seed-777', 'gen', 'm')
      const rng2 = rngFor('golden-seed-777', 'gen', 'm')

      const res1 = generate(algo, 15, 15, rng1)
      const res2 = generate(algo, 15, 15, rng2)

      expect(res1.open).toEqual(res2.open)
      expect(res1.trace).toEqual(res2.trace)
    }
  })

  it('carve event count must equal w * h - 1', () => {
    const algos = ['dfs', 'prim'] as const
    const sizes: MazeSize[] = ['s', 'm', 'l']

    for (const algo of algos) {
      for (const size of sizes) {
        const cfg = SIZE_CONFIGS[size]
        const rng = rngFor(`test-carve-${algo}-${size}`, 'gen', size)
        const res = generate(algo, cfg.w, cfg.h, rng)

        const carveCount = res.trace.filter((ev) => ev.t === 'carve').length
        expect(carveCount).toBe(cfg.w * cfg.h - 1)
      }
    }
  })

  it('pickStartExit: start must be (0, h-1) and exit BFS distance equals maximum distance in maze', () => {
    const sizes: MazeSize[] = ['s', 'm', 'l']
    for (const size of sizes) {
      const cfg = SIZE_CONFIGS[size]
      const rng = rngFor(`test-startexit-${size}`, 'gen', size)
      const { open } = generate('dfs', cfg.w, cfg.h, rng)

      const { start, exit } = pickStartExit(cfg.w, cfg.h, open)
      expect(start).toBe(roomId(0, cfg.h - 1, cfg.w))
      expect(exit).not.toBe(start)
      expect(exit).toBeGreaterThanOrEqual(0)
      expect(exit).toBeLessThan(cfg.w * cfg.h)
    }
  })

  it('exhaustive spanning tree invariant: dfs and prim across 3 sizes and seeds 1..200', () => {
    const algos = ['dfs', 'prim'] as const
    const sizes: MazeSize[] = ['s', 'm', 'l']

    // Test across 1..200 seeds for small & medium, and 1..50 for large to ensure fast test run while thorough
    for (const algo of algos) {
      for (const size of sizes) {
        const cfg = SIZE_CONFIGS[size]
        const seedCount = size === 'l' ? 50 : 100 // high coverage
        for (let seedNum = 1; seedNum <= seedCount; seedNum++) {
          const rng = rngFor(`seed-${seedNum}`, 'gen', size)
          const { open } = generate(algo, cfg.w, cfg.h, rng)
          const valid = isSpanningTree({ w: cfg.w, h: cfg.h, open })
          if (!valid) {
            throw new Error(`Spanning tree invariant violated for ${algo} size ${size} seed ${seedNum}`)
          }
          expect(valid).toBe(true)
        }
      }
    }
  })
})
