import { describe, it, expect } from 'vitest'
import { generate, pickStartExit } from '../generate'
import { edgeRooms, isSpanningTree, Maze } from '../grid'
import { rngFor } from '../rng'
import { planShift } from '../shift'

describe('shift.ts: Spanning Tree Edge Swap Deformation', () => {
  it('deterministic: same input and rng produce exact same shift plan', () => {
    const w = 15
    const h = 15
    const seed = 'shift-determinism-seed'
    const genRng = rngFor(seed, 'gen', 'm')
    const { open } = generate('dfs', w, h, genRng)
    const { start, exit } = pickStartExit(w, h, open)

    const maze1: Maze = { w, h, open: new Uint8Array(open), start, exit }
    const maze2: Maze = { w, h, open: new Uint8Array(open), start, exit }

    const shiftRng1 = rngFor(seed, 'shift', 1)
    const shiftRng2 = rngFor(seed, 'shift', 1)

    const params = {
      player: start,
      locked: [start],
      exit,
      radius: 4,
      swaps: 5,
    }

    const plan1 = planShift(maze1, shiftRng1, params)
    const plan2 = planShift(maze2, shiftRng2, params)

    expect(plan1).not.toBeNull()
    expect(plan2).not.toBeNull()
    expect(plan1).toEqual(plan2)
  })

  it('close and open are equal in length, non-overlapping, and never touch locked rooms', () => {
    const w = 15
    const h = 15
    const seed = 'shift-rules-seed'
    const genRng = rngFor(seed, 'gen', 'm')
    const { open } = generate('dfs', w, h, genRng)
    const { start, exit } = pickStartExit(w, h, open)

    const maze: Maze = { w, h, open: new Uint8Array(open), start, exit }
    const lockedRooms = [start, start + 1, exit]

    const shiftRng = rngFor(seed, 'shift', 1)
    const plan = planShift(maze, shiftRng, {
      player: start,
      locked: lockedRooms,
      exit,
      radius: 4,
      swaps: 5,
    })

    expect(plan).not.toBeNull()
    if (!plan) return

    expect(plan.close.length).toBe(plan.open.length)
    expect(plan.close.length).toBeGreaterThan(0)

    const closeSet = new Set(plan.close)
    const openSet = new Set(plan.open)

    // No overlap
    for (const e of plan.close) {
      expect(openSet.has(e)).toBe(false)
    }

    // Never touch locked rooms
    const lockedSet = new Set(lockedRooms)
    for (const e of [...plan.close, ...plan.open]) {
      const [a, b] = edgeRooms(e, w, h)
      expect(lockedSet.has(a)).toBe(false)
      expect(lockedSet.has(b)).toBe(false)
    }
  })

  it('sequential 500 shifts on a single maze: invariant holds after EVERY single shift', () => {
    const w = 15
    const h = 15
    const seed = 'shift-500-consecutive'
    const genRng = rngFor(seed, 'gen', 'm')
    const { open } = generate('dfs', w, h, genRng)
    const { start, exit } = pickStartExit(w, h, open)

    const maze: Maze = {
      w,
      h,
      open: new Uint8Array(open),
      start,
      exit,
    }

    let player = start
    let successfulShifts = 0

    for (let k = 1; k <= 500; k++) {
      const shiftRng = rngFor(seed, 'shift', k)
      const plan = planShift(maze, shiftRng, {
        player,
        locked: [player],
        exit,
        radius: 4,
        swaps: 5,
      })

      if (plan) {
        successfulShifts++

        // Apply plan to maze
        for (const e of plan.close) {
          maze.open[e] = 0
        }
        for (const e of plan.open) {
          maze.open[e] = 1
        }

        // Verify spanning tree invariant after each shift
        const valid = isSpanningTree(maze)
        if (!valid) {
          throw new Error(`Spanning tree invariant broken at shift #${k}`)
        }
        expect(valid).toBe(true)

        // Verify close/open lengths and disjointness
        expect(plan.close.length).toBe(plan.open.length)
        const closeSet = new Set(plan.close)
        for (const o of plan.open) {
          expect(closeSet.has(o)).toBe(false)
        }

        // Move player along an open edge occasionally to test shift with moving player
        if (k % 5 === 0) {
          player = (player + 1) % (w * h)
        }
      }
    }

    expect(successfulShifts).toBeGreaterThan(450)
  })
})
