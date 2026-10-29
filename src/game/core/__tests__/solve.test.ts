import { describe, it, expect } from 'vitest'
import { generate, pickStartExit } from '../generate'
import { edgeBetween } from '../grid'
import { rngFor } from '../rng'
import { solve, SolveAlgo } from '../solve'

describe('solve.ts: Pathfinding Solvers (BFS, DFS, A*)', () => {
  const w = 15
  const h = 15
  const rng = rngFor('solve-test-tree', 'gen', 'm')
  const { open } = generate('dfs', w, h, rng)
  const { start, exit } = pickStartExit(w, h, open)

  const passable = (edge: number) => open[edge] === 1

  it('from === to should immediately return single element [from]', () => {
    const algos: SolveAlgo[] = ['bfs', 'dfs', 'astar']
    for (const algo of algos) {
      const res = solve(algo, { w, h }, start, start, passable)
      expect(res.path).toEqual([start])
      expect(res.expanded).toBe(1)
      expect(res.trace).toEqual([
        { t: 'push', room: start, parent: -1 },
        { t: 'pop', room: start },
      ])
    }
  })

  it('all three algorithms produce identical unique paths on a spanning tree', () => {
    const bfsRes = solve('bfs', { w, h }, start, exit, passable)
    const dfsRes = solve('dfs', { w, h }, start, exit, passable)
    const astarRes = solve('astar', { w, h }, start, exit, passable)

    expect(bfsRes.path).not.toBeNull()
    expect(dfsRes.path).not.toBeNull()
    expect(astarRes.path).not.toBeNull()

    // On a spanning tree (no cycles), the path between any two rooms is unique
    expect(bfsRes.path).toEqual(dfsRes.path)
    expect(astarRes.path).toEqual(bfsRes.path)

    // Path verification: starts with start, ends with exit
    const path = astarRes.path!
    expect(path[0]).toBe(start)
    expect(path[path.length - 1]).toBe(exit)

    // Adjacent rooms in path must have passable edge
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      const edge = edgeBetween(a, b, w, h)
      expect(edge).toBeGreaterThanOrEqual(0)
      expect(open[edge]).toBe(1)
    }
  })

  it('artificially severed edge results in path === null', () => {
    const astarRes = solve('astar', { w, h }, start, exit, passable)
    const path = astarRes.path!
    const midEdge = edgeBetween(path[0], path[1], w, h)

    // Block the first edge in the path
    const severedPassable = (e: number) => (e === midEdge ? false : open[e] === 1)

    const resBfs = solve('bfs', { w, h }, start, exit, severedPassable)
    const resDfs = solve('dfs', { w, h }, start, exit, severedPassable)
    const resAstar = solve('astar', { w, h }, start, exit, severedPassable)

    expect(resBfs.path).toBeNull()
    expect(resDfs.path).toBeNull()
    expect(resAstar.path).toBeNull()
  })

  it('trace recording: push and pop events match algorithm expansion', () => {
    const astarRes = solve('astar', { w, h }, start, exit, passable)
    expect(astarRes.expanded).toBeGreaterThan(0)
    expect(astarRes.trace.length).toBeGreaterThan(0)

    const popEvents = astarRes.trace.filter((ev) => ev.t === 'pop')
    expect(popEvents.length).toBe(astarRes.expanded)
    expect(popEvents[popEvents.length - 1].room).toBe(exit)
  })
})
