import { describe, expect, it } from 'vitest'
import { WALL_H, WALL_LOW } from '../../core/constants'
import { edgeBetween, roomId } from '../../core/grid'
import {
  computeDeadEnds,
  computeTreeDiameter,
  createLabGenModel,
  createLabSolveModel,
} from '../labModel'

describe('labModel - Tree Metrics', () => {
  it('computes tree diameter correctly on a 1x4 line maze', () => {
    // 4 房间一字排开：0 - 1 - 2 - 3 (w=4, h=1)
    // 边数 = 3
    const w = 4
    const h = 1
    const open = new Uint8Array(3)
    const e01 = edgeBetween(roomId(0, 0, w), roomId(1, 0, w), w, h)!
    const e12 = edgeBetween(roomId(1, 0, w), roomId(2, 0, w), w, h)!
    const e23 = edgeBetween(roomId(2, 0, w), roomId(3, 0, w), w, h)!

    open[e01] = 1
    open[e12] = 1
    open[e23] = 1

    expect(computeTreeDiameter(w, h, open)).toBe(3)
    expect(computeDeadEnds(w, h, open)).toBe(2) // 只有两端的房间度数为 1
  })

  it('computes tree diameter on a 2x2 star / T-junction maze', () => {
    // 4 房间 2x2:
    // (0,0)=0, (1,0)=1
    // (0,1)=2, (1,1)=3
    // 连接 0-1, 0-2, 0-3 (如果是网格图，0连接1和2，1连接3)
    // 0-1, 0-2, 1-3:
    // 2 - 0 - 1 - 3：最长路径 2->0->1->3，直径 3
    const w = 2
    const h = 2
    const open = new Uint8Array(4)
    const e01 = edgeBetween(0, 1, w, h)!
    const e02 = edgeBetween(0, 2, w, h)!
    const e13 = edgeBetween(1, 3, w, h)!

    open[e01] = 1
    open[e02] = 1
    open[e13] = 1

    expect(computeTreeDiameter(w, h, open)).toBe(3)
    expect(computeDeadEnds(w, h, open)).toBe(2) // 房间 2 和 3 是死胡同
  })
})

describe('labModel - Generation Model', () => {
  it('precomputes carvedAt and interpolates edge height smoothly over 8 steps', () => {
    const model = createLabGenModel(9, 9, 'dfs', 'test-gen-seed')
    expect(model.totalSteps).toBeGreaterThan(0)
    expect(model.stats.treeDiameter).toBeGreaterThan(0)
    expect(model.stats.deadEndCount).toBeGreaterThan(0)
    expect(model.stats.treeDiameter).toBeGreaterThanOrEqual(model.stats.startExitPathLength - 1)

    // 在第 0 步，没有任何边被 carve
    for (let e = 0; e < model.carvedAt.length; e++) {
      expect(model.isEdgeOpen(e, 0)).toBe(false)
      expect(model.getEdgeHeight(e, 0)).toBe(WALL_H)
    }

    // 找到第一条被 carve 的边
    let firstCarveEdge = -1
    let firstCarveIdx = -1
    for (let e = 0; e < model.carvedAt.length; e++) {
      const idx = model.carvedAt[e]
      if (idx !== -1 && (firstCarveIdx === -1 || idx < firstCarveIdx)) {
        firstCarveIdx = idx
        firstCarveEdge = e
      }
    }

    expect(firstCarveEdge).toBeGreaterThanOrEqual(0)
    expect(firstCarveIdx).toBeGreaterThanOrEqual(0)

    // 在 carvedAt 之前：闭合且全高
    expect(model.isEdgeOpen(firstCarveEdge, firstCarveIdx)).toBe(false)
    expect(model.getEdgeHeight(firstCarveEdge, firstCarveIdx)).toBe(WALL_H)

    // 在 carvedAt 之后 1 步：已经打开，高度开始下降
    expect(model.isEdgeOpen(firstCarveEdge, firstCarveIdx + 1)).toBe(true)
    const h1 = model.getEdgeHeight(firstCarveEdge, firstCarveIdx + 1)
    expect(h1).toBeLessThan(WALL_H)
    expect(h1).toBeGreaterThan(WALL_LOW)

    // 在 carvedAt 之后 4 步：下降到一半
    const h4 = model.getEdgeHeight(firstCarveEdge, firstCarveIdx + 4)
    expect(h4).toBeLessThan(h1)

    // 在 carvedAt 之后 8 步及以上：完全落下至 WALL_LOW
    expect(model.getEdgeHeight(firstCarveEdge, firstCarveIdx + 8)).toBe(WALL_LOW)
    expect(model.getEdgeHeight(firstCarveEdge, firstCarveIdx + 20)).toBe(WALL_LOW)
  })

  it('verifies DFS vs Prim structural differences', () => {
    const dfsModel = createLabGenModel(15, 15, 'dfs', 'compare-seed')
    const primModel = createLabGenModel(15, 15, 'prim', 'compare-seed')

    // 完美迷宫结构特性：Prim 迷宫分支极多，死胡同数通常明显多于 DFS；DFS 直径通常大于 Prim
    expect(dfsModel.stats.treeDiameter).toBeGreaterThan(primModel.stats.treeDiameter)
    expect(primModel.stats.deadEndCount).toBeGreaterThan(dfsModel.stats.deadEndCount)
  })
})

describe('labModel - Solve Model & Comparison', () => {
  it('verifies solve model steps and tile states', () => {
    const gen = createLabGenModel(9, 9, 'dfs', 'solve-test-seed')
    const solveModel = createLabSolveModel(9, 9, 'astar', gen.open, gen.start, gen.exit)

    expect(solveModel.totalSteps).toBeGreaterThan(0)
    expect(solveModel.path).not.toBeNull()

    // 初始状态：路径不可见
    expect(solveModel.isPathVisible(0)).toBe(false)
    expect(solveModel.getExpandedCountAt(0)).toBe(0)

    // 结束状态：路径可见，展开节点数大于 0
    expect(solveModel.isPathVisible(solveModel.totalSteps)).toBe(true)
    expect(solveModel.getExpandedCountAt(solveModel.totalSteps)).toBe(solveModel.stats.expandedCount)

    // 出口在结束时属于路径
    expect(solveModel.getRoomTileState(gen.exit, solveModel.totalSteps)).toBe('path')
    expect(solveModel.getRoomTileState(gen.start, solveModel.totalSteps)).toBe('path')
  })

  it('guarantees BFS, DFS, and A* find the EXACT same path length on perfect maze', () => {
    const gen = createLabGenModel(15, 15, 'dfs', 'benchmark-seed')
    const solveModel = createLabSolveModel(15, 15, 'astar', gen.open, gen.start, gen.exit)

    const comparison = solveModel.stats.comparison
    expect(comparison).toHaveLength(3)

    const [bfs, dfs, astar] = comparison
    // 完美迷宫中任意两点有且仅有一条简单路径，因此三者路径长度必完全相等！
    expect(bfs.pathLength).toBe(dfs.pathLength)
    expect(dfs.pathLength).toBe(astar.pathLength)

    // 区别在于搜索了多少格子（A* 启发式有明显方向性，展开数通常小于 BFS）
    expect(bfs.expanded).toBeGreaterThan(0)
    expect(astar.expanded).toBeGreaterThan(0)
    expect(astar.expanded).toBeLessThanOrEqual(bfs.expanded)

    // 展开比例合法
    expect(bfs.ratio).toBeGreaterThan(0)
    expect(bfs.ratio).toBeLessThanOrEqual(1)
  })
})
