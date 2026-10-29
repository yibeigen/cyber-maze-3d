import { describe, it, expect, vi } from 'vitest'
import { CAMPAIGN_LEVELS, getCampaignLevel } from '../../core/constants'
import { Dir, DIRS, edgeBetween, isSpanningTree, neighbor } from '../../core/grid'
import { solve } from '../../core/solve'
import { GameEngine } from '../GameEngine'

function advanceTime(engine: GameEngine, totalSeconds: number, step = 0.05) {
  let remaining = totalSeconds
  while (remaining > 1e-6) {
    const dt = Math.min(step, remaining)
    engine.tick(dt)
    remaining -= dt
  }
}

describe('GameEngine: Pure TS Authoritative Engine', () => {
  it('skipReveal immediately transitions to ready and all passages become passable', () => {
    const engine = new GameEngine({
      seed: 'test-reveal-skip',
      size: 's',
      shifting: false,
    })

    expect(engine.phase).toBe('revealing')
    engine.remainingDistance
    const phaseListener = vi.fn()
    engine.on((ev) => {
      if (ev.type === 'phase') phaseListener(ev.phase)
    })

    engine.skipReveal()
    expect(engine.phase).toBe('ready')
    expect(phaseListener).toHaveBeenCalledWith('ready')

    // All logical passage edges should now be passable
    for (let e = 0; e < engine.maze.open.length; e++) {
      if (engine.maze.open[e] === 1) {
        expect(engine.isEdgePassable(e)).toBe(true)
        expect(engine.getEdgeHeight(e)).toBeLessThan(0.1) // WALL_LOW
      }
    }
    const path = solve('astar', engine.maze, engine.maze.start, engine.maze.exit, (e) => engine.isEdgePassable(e)).path!
    expect(engine.remainingDistance).toBe(path.length - 1)
  })

  it('elapsed does not increase in ready phase, but starts increasing upon first move attempt', () => {
    const engine = new GameEngine({
      seed: 'test-elapsed-clock',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()
    expect(engine.phase).toBe('ready')

    engine.tick(0.05)
    engine.tick(0.05)
    expect(engine.time).toBeCloseTo(0.1)
    expect(engine.elapsed).toBe(0)

    // Tap a direction transitions ready -> playing
    engine.tap(0)
    engine.tick(0.02)
    expect(engine.phase).toBe('playing')
    // Next tick in playing phase advances elapsed
    engine.tick(0.02)
    expect(engine.elapsed).toBeCloseTo(0.02)
  })

  it('pausing freezes time and elapsed; resuming continues from freeze point', () => {
    const engine = new GameEngine({
      seed: 'test-pause-resume',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()
    engine.tap(1)
    engine.tick(0.05)
    expect(engine.phase).toBe('playing')

    const tBefore = engine.time
    const eBefore = engine.elapsed

    engine.pause()
    expect(engine.phase).toBe('paused')

    // Ticks while paused do nothing
    engine.tick(0.1)
    engine.tick(0.1)
    expect(engine.time).toBe(tBefore)
    expect(engine.elapsed).toBe(eBefore)

    engine.resume()
    expect(engine.phase).toBe('playing')

    engine.tick(0.05)
    expect(engine.time).toBeCloseTo(tBefore + 0.05)
    expect(engine.elapsed).toBeCloseTo(eBefore + 0.05)
  })

  it('bumping against wall does not change room or moves, triggers bump with cooldown', () => {
    const engine = new GameEngine({
      seed: 'test-wall-bump',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()

    const startRoom = engine.currentRoom
    // Find an impassable direction from start
    let wallDir: Dir = 0
    for (const d of DIRS) {
      const nb = neighbor(startRoom, d, engine.maze.w, engine.maze.h)
      if (!nb || !engine.isEdgePassable(nb.edge)) {
        wallDir = d
        break
      }
    }

    const bumpListener = vi.fn()
    engine.on((ev) => {
      if (ev.type === 'bump') bumpListener(ev)
    })

    // First bump
    engine.tap(wallDir)
    engine.tick(0.02)
    expect(bumpListener).toHaveBeenCalledTimes(1)
    expect(engine.currentRoom).toBe(startRoom)
    expect(engine.moves).toBe(0)

    // Immediate second attempt within cooldown (0.18s) should NOT fire second bump
    engine.setHeld(wallDir)
    engine.tick(0.05)
    engine.tick(0.05)
    expect(bumpListener).toHaveBeenCalledTimes(1)

    // Tick past cooldown (total dt > 0.18s)
    engine.tick(0.1)
    expect(bumpListener).toHaveBeenCalledTimes(2)
  })

  it('input buffering: tap during movement keeps only the last buffered input', () => {
    const engine = new GameEngine({
      seed: 'test-input-buffer',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()

    // Find a valid move from start
    const start = engine.currentRoom
    let firstDir: Dir | null = null
    for (const d of DIRS) {
      const nb = neighbor(start, d, engine.maze.w, engine.maze.h)
      if (nb && engine.isEdgePassable(nb.edge)) {
        firstDir = d
        break
      }
    }
    expect(firstDir).not.toBeNull()

    // Start first move
    engine.tap(firstDir!)
    engine.tick(0.02)
    const visual = engine.getPlayerVisual()
    expect(visual).toBeDefined()

    // During movement, buffer multiple taps: dirA then dirB
    // Only the last tap should be executed once first move completes
    engine.tap(0)
    engine.tap(2)

    // Complete the first move (0.14s duration)
    advanceTime(engine, 0.16)
    expect(engine.moves).toBe(1)
  })

  it('scripted walk to exit reaches won phase, freezes elapsed and records correct stats', () => {
    const engine = new GameEngine({
      seed: 'test-win-path',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()

    // Solve for path from start to exit
    const solveRes = solve(
      'astar',
      engine.maze,
      engine.maze.start,
      engine.maze.exit,
      (e) => engine.isEdgePassable(e),
    )
    expect(solveRes.path).not.toBeNull()
    const path = solveRes.path!

    const wonListener = vi.fn()
    engine.on((ev) => {
      if (ev.type === 'won') wonListener(ev)
    })

    // Walk along path step by step
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i]
      const to = path[i + 1]

      let moveDir: Dir | null = null
      for (const d of DIRS) {
        const nb = neighbor(from, d, engine.maze.w, engine.maze.h)
        if (nb && nb.room === to) {
          moveDir = d
          break
        }
      }
      expect(moveDir).not.toBeNull()

      engine.tap(moveDir!)
      // Advance past move start + MOVE_DURATION (0.14s)
      advanceTime(engine, 0.2)
      expect(engine.currentRoom).toBe(to)
    }

    expect(engine.phase).toBe('won')
    expect(engine.currentRoom).toBe(engine.maze.exit)
    expect(engine.moves).toBe(path.length - 1)
    expect(wonListener).toHaveBeenCalledTimes(1)

    // 结算数据里的最优步数应等于 A* 解出的路径长度
    const wonEvent = wonListener.mock.calls[0][0]
    expect(wonEvent.optimalMoves).toBe(path.length - 1)
    expect(engine.optimalMoves).toBe(path.length - 1)

    const finalElapsed = engine.elapsed
    // Further ticks should not increase elapsed
    engine.tick(0.1)
    engine.tick(0.1)
    expect(engine.elapsed).toBe(finalElapsed)
  })

  it('shift dynamics: warn makes edges impassable, motion starts ripples, end restores tree invariant and busy blocks scan', () => {
    const engine = new GameEngine({
      seed: 'test-shift-engine',
      size: 's',
      shifting: true,
    })
    engine.skipReveal()

    // Start playing
    engine.tap(1)
    engine.tick(0.01)
    expect(engine.phase).toBe('playing')

    const warnListener = vi.fn()
    const motionListener = vi.fn()
    const endListener = vi.fn()

    engine.on((ev) => {
      if (ev.type === 'shiftWarn') warnListener(ev)
      if (ev.type === 'shiftMotion') motionListener(ev)
      if (ev.type === 'shiftEnd') endListener(ev)
    })

    // Tick until first shift at 15.0s (step by 0.1s)
    while (engine.elapsed < 15.0) {
      engine.tick(0.1)
    }

    expect(warnListener).toHaveBeenCalledTimes(1)
    expect(engine.inShiftWindow).toBe(true)

    // In shift window, scan() must return 'busy' and not deduct charges
    const initialCharges = engine.scanChargesRemaining
    expect(engine.scan()).toBe('busy')
    expect(engine.scanChargesRemaining).toBe(initialCharges)

    const warnEvent = warnListener.mock.calls[0][0]
    // Closed edges are impassable immediately
    for (const e of warnEvent.close) {
      expect(engine.isEdgePassable(e)).toBe(false)
      expect(engine.getEdgeVisual(e)).toBe('warn-close')
    }
    // Open edges are also not yet passable during warning
    for (const e of warnEvent.open) {
      expect(engine.isEdgePassable(e)).toBe(false)
      expect(engine.getEdgeVisual(e)).toBe('warn-open')
    }

    // Tick past SHIFT_WARN (1.2s)
    let elapsedInShift = 0
    while (motionListener.mock.calls.length === 0 && elapsedInShift < 3.0) {
      engine.tick(0.05)
      elapsedInShift += 0.05
    }
    expect(motionListener).toHaveBeenCalledTimes(1)

    // Tick past all ripple motions until shiftEnd
    while (endListener.mock.calls.length === 0 && elapsedInShift < 6.0) {
      engine.tick(0.05)
      elapsedInShift += 0.05
    }
    expect(endListener).toHaveBeenCalledTimes(1)
    expect(engine.inShiftWindow).toBe(false)
    expect(engine.shiftsDone).toBe(1)

    // Spanning tree invariant holds!
    expect(isSpanningTree(engine.maze)).toBe(true)

    // Now newly opened edges should be passable!
    for (const e of warnEvent.open) {
      expect(engine.isEdgePassable(e)).toBe(true)
    }
  })

  it('forceShift consumes limited charges, keeps tree invariant, and blocks re-entry while shifting', () => {
    const engine = new GameEngine({
      seed: 'test-force-shift',
      size: 's', // 2 次主动变形
      shifting: true,
    })
    engine.skipReveal()
    engine.tap(1)
    engine.tick(0.01)
    expect(engine.phase).toBe('playing')

    const usedListener = vi.fn()
    engine.on((ev) => {
      if (ev.type === 'forceShiftUsed') usedListener(ev)
    })

    expect(engine.forceChargesRemaining).toBe(2)

    // 第一次主动变形
    expect(engine.forceShift()).toBe('ok')
    expect(engine.forceChargesRemaining).toBe(1)
    expect(engine.inShiftWindow).toBe(true)
    expect(usedListener).toHaveBeenCalledTimes(1)

    // 变形进行中再次请求：拒绝且不扣次数
    expect(engine.forceShift()).toBe('busy')
    expect(engine.forceChargesRemaining).toBe(1)

    // 等待本次变形结束
    let t = 0
    while (engine.inShiftWindow && t < 8) {
      engine.tick(0.05)
      t += 0.05
    }
    expect(engine.inShiftWindow).toBe(false)
    expect(isSpanningTree(engine.maze)).toBe(true)

    // 第二次主动变形
    expect(engine.forceShift()).toBe('ok')
    expect(engine.forceChargesRemaining).toBe(0)

    t = 0
    while (engine.inShiftWindow && t < 8) {
      engine.tick(0.05)
      t += 0.05
    }
    expect(isSpanningTree(engine.maze)).toBe(true)

    // 次数耗尽
    expect(engine.forceShift()).toBe('no-charges')
    expect(engine.forceChargesRemaining).toBe(0)
  })

  it('forceShift is rejected when the run has shifting disabled', () => {
    const engine = new GameEngine({
      seed: 'test-force-shift-off',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()

    expect(engine.forceShift()).toBe('not-allowed')
    expect(engine.forceChargesRemaining).toBe(2)
    expect(engine.inShiftWindow).toBe(false)
  })

  it('scan charges are depleted correctly and returns no-charges when empty', () => {
    const engine = new GameEngine({
      seed: 'test-scan-charges',
      size: 's', // 2 charges
      shifting: false,
    })
    engine.skipReveal()
    engine.tap(1)
    engine.tick(0.01)

    expect(engine.scanChargesRemaining).toBe(2)

    // First scan
    const res1 = engine.scan()
    expect(res1).toBe('ok')
    // Advance past flooding animation to reveal path line
    advanceTime(engine, 1.0)
    expect(engine.currentScanPath).not.toBeNull()

    // Second scan while active scan is displayed returns 'busy'
    expect(engine.scan()).toBe('busy')

    // Fast forward past scan duration (popDuration + SCAN_KEEP_DUR 15s)
    advanceTime(engine, 20.0)
    expect(engine.currentScanPath).toBeNull()

    // Second scan now succeeds
    const res2 = engine.scan()
    expect(res2).toBe('ok')
    expect(engine.scanChargesRemaining).toBe(0)
    expect(engine.scansUsed).toBe(2)

    // Fast forward
    advanceTime(engine, 20.0)

    // Third scan returns 'no-charges'
    const res3 = engine.scan()
    expect(res3).toBe('no-charges')
    expect(engine.scanChargesRemaining).toBe(0)
    expect(engine.scansUsed).toBe(2)
  })

  it('campaign rules override free-size dimensions and resource presets', () => {
    const level = getCampaignLevel(1)
    const engine = new GameEngine({
      seed: level.seed,
      size: 'l',
      shifting: level.shifting,
      mode: 'campaign',
      campaign: level,
    })

    expect(engine.maze.w).toBe(5)
    expect(engine.maze.h).toBe(5)
    expect(engine.scanChargesRemaining).toBe(0)
    expect(engine.forceChargesRemaining).toBe(0)
    expect(engine.initialOptimalMoves).toBeGreaterThan(0)
    expect(engine.visitedHistory).toEqual([engine.maze.start])
  })

  it('all twelve campaign mazes are connected and solvable with their configured rules', () => {
    for (const level of CAMPAIGN_LEVELS) {
      const engine = new GameEngine({
        seed: level.seed,
        size: 's',
        shifting: level.shifting,
        mode: 'campaign',
        campaign: level,
      })
      engine.skipReveal()
      const path = solve('astar', engine.maze, engine.maze.start, engine.maze.exit, (e) => engine.isEdgePassable(e)).path
      expect(isSpanningTree(engine.maze)).toBe(true)
      expect(path).not.toBeNull()
      expect(engine.initialOptimalMoves).toBe(path!.length - 1)
    }
  })

  it('scan tutorial grants unlimited scans without changing the charge display value', () => {
    const level = getCampaignLevel(2)
    const engine = new GameEngine({
      seed: level.seed,
      size: 's',
      shifting: false,
      mode: 'campaign',
      campaign: level,
    })
    engine.skipReveal()
    engine.tap(0)
    engine.tick(0.01)

    expect(engine.scan()).toBe('ok')
    expect(engine.scanChargesRemaining).toBe(Infinity)
    advanceTime(engine, 20)
    expect(engine.scan()).toBe('ok')
    expect(engine.scanChargesRemaining).toBe(Infinity)
    expect(engine.scansUsed).toBe(2)
  })

  it('visited history records the real route including backtracking and latest visit ages', () => {
    const engine = new GameEngine({
      seed: 'test-trajectory-history',
      size: 's',
      shifting: false,
    })
    engine.skipReveal()
    const path = solve('astar', engine.maze, engine.maze.start, engine.maze.exit, (e) => engine.isEdgePassable(e)).path!
    const start = path[0]
    const next = path[1]
    const forward = DIRS.find((d) => neighbor(start, d, engine.maze.w, engine.maze.h)?.room === next)!
    const backward = DIRS.find((d) => neighbor(next, d, engine.maze.w, engine.maze.h)?.room === start)!

    engine.tap(forward)
    advanceTime(engine, 0.2)
    engine.tap(backward)
    advanceTime(engine, 0.2)

    expect(engine.visitedHistory).toEqual([start, next, start])
    expect(engine.getRoomVisitAge(start)).toBe(0)
    expect(engine.getRoomVisitAge(next)).toBe(1)
    expect(engine.getRoomVisitAge(engine.maze.exit)).toBe(Infinity)
  })

  it('campaign shift cadence uses the level interval instead of the free-mode default', () => {
    const level = getCampaignLevel(6)
    const engine = new GameEngine({
      seed: level.seed,
      size: 's',
      shifting: true,
      mode: 'campaign',
      campaign: level,
    })
    engine.skipReveal()
    engine.tap(0)
    engine.tick(0.01)

    advanceTime(engine, 11.8)
    expect(engine.inShiftWindow).toBe(false)
    advanceTime(engine, 0.3)
    expect(engine.shiftInterval).toBe(12)
    expect(engine.inShiftWindow).toBe(true)
  })
})
