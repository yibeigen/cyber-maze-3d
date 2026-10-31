import { WALL_H, WALL_LOW } from '../core/constants'
import { GenAlgo, generate, GenEvent, pickStartExit } from '../core/generate'
import { DIRS, edgeCount, neighbor } from '../core/grid'
import { rngFor } from '../core/rng'
import { solve, SolveAlgo, SolveEvent } from '../core/solve'
import { Lang, tMsg } from '../i18n/messages'

export type LabPhase = 'generate' | 'solve'

/**
 * 实验室地砖状态 → 色值（LabScene 的 3D 用它与图例共用同一份，保证"图例说的"就是"看到的"）
 */
export const LAB_TILE_COLORS = {
  active: '#22d3ee',   // 当前正在处理的房间
  frontier: '#a855f7', // 候选 / 边界
  visited: '#164e63',  // 已经到过（生成）
  expanded: '#164e63', // 已经展开（求解），与 visited 同色
  path: '#fbbf24',     // 最终最短路线
  default: '#0f1624',  // 还没被算法碰过
} as const

export interface LabGenStats {
  deadEndCount: number
  treeDiameter: number
  startExitPathLength: number
  totalRooms: number
}

export interface SolverComparisonItem {
  algo: SolveAlgo
  name: string
  expanded: number
  pathLength: number
  ratio: number
}

export interface LabSolveStats {
  expandedCount: number
  pathLength: number
  expansionRatio: number
  comparison: SolverComparisonItem[]
}

export interface LabGenModel {
  w: number
  h: number
  algo: GenAlgo
  seed: string
  open: Uint8Array
  start: number
  exit: number
  trace: GenEvent[]
  totalSteps: number
  carvedAt: Int32Array
  visitedAt: Int32Array
  frontierAt: Int32Array
  stats: LabGenStats
  getEdgeHeight: (edge: number, stepIndex: number) => number
  isEdgeOpen: (edge: number, stepIndex: number) => boolean
  getActiveRoom: (stepIndex: number) => number | null
  getRoomTileState: (
    room: number,
    stepIndex: number
  ) => 'default' | 'visited' | 'active' | 'frontier'
}

export interface LabSolveModel {
  w: number
  h: number
  algo: SolveAlgo
  start: number
  exit: number
  trace: SolveEvent[]
  totalSteps: number
  path: number[] | null
  pushedAt: Int32Array
  poppedAt: Int32Array
  stats: LabSolveStats
  isPathVisible: (stepIndex: number) => boolean
  getRoomTileState: (
    room: number,
    stepIndex: number
  ) => 'default' | 'frontier' | 'expanded' | 'path'
  getExpandedCountAt: (stepIndex: number) => number
}

/**
 * 两次 BFS 计算无环连通图（生成树迷宫）的树直径（最长简单路径长度）
 */
export function computeTreeDiameter(w: number, h: number, open: Uint8Array): number {
  const totalRooms = w * h
  if (totalRooms <= 1) return 0

  // 1. 从房间 0 BFS 寻找最远房间 u
  const dist = new Int32Array(totalRooms).fill(-1)
  dist[0] = 0
  const queue: number[] = [0]
  let farthestNode = 0
  let maxDist = 0

  while (queue.length > 0) {
    const cur = queue.shift()!
    const d = dist[cur]
    if (d > maxDist) {
      maxDist = d
      farthestNode = cur
    }
    for (let i = 0; i < 4; i++) {
      const nb = neighbor(cur, DIRS[i], w, h)
      if (nb && open[nb.edge] === 1 && dist[nb.room] === -1) {
        dist[nb.room] = d + 1
        queue.push(nb.room)
      }
    }
  }

  // 2. 从 u 出发 BFS 找到最远房间 v，两者距离即为树直径
  dist.fill(-1)
  dist[farthestNode] = 0
  queue.push(farthestNode)
  let diameter = 0

  while (queue.length > 0) {
    const cur = queue.shift()!
    const d = dist[cur]
    if (d > diameter) {
      diameter = d
    }
    for (let i = 0; i < 4; i++) {
      const nb = neighbor(cur, DIRS[i], w, h)
      if (nb && open[nb.edge] === 1 && dist[nb.room] === -1) {
        dist[nb.room] = d + 1
        queue.push(nb.room)
      }
    }
  }

  return diameter
}

/**
 * 计算迷宫中度数为 1 的房间数（死胡同数）
 */
export function computeDeadEnds(w: number, h: number, open: Uint8Array): number {
  const totalRooms = w * h
  if (totalRooms <= 1) return 0
  let deadEnds = 0

  for (let r = 0; r < totalRooms; r++) {
    let degree = 0
    for (let i = 0; i < 4; i++) {
      const nb = neighbor(r, DIRS[i], w, h)
      if (nb && open[nb.edge] === 1) {
        degree++
      }
    }
    if (degree === 1) {
      deadEnds++
    }
  }

  return deadEnds
}

/**
 * 创建生成算法模型（基于步数下标 i 纯函数计算）
 */
export function createLabGenModel(
  w: number,
  h: number,
  algo: GenAlgo,
  seed: string
): LabGenModel {
  const totalRooms = w * h
  const totalEdges = edgeCount(w, h)

  const rng = rngFor(seed, 'gen', algo)
  const { open, trace } = generate(algo, w, h, rng)
  const { start, exit } = pickStartExit(w, h, open)

  const carvedAt = new Int32Array(totalEdges).fill(-1)
  const visitedAt = new Int32Array(totalRooms).fill(-1)
  const frontierAt = new Int32Array(totalRooms).fill(-1)

  for (let i = 0; i < trace.length; i++) {
    const ev = trace[i]
    if (ev.t === 'carve') {
      if (carvedAt[ev.edge] === -1) {
        carvedAt[ev.edge] = i
      }
    } else if (ev.t === 'visit') {
      if (visitedAt[ev.room] === -1) {
        visitedAt[ev.room] = i
      }
    } else if (ev.t === 'frontier') {
      if (frontierAt[ev.room] === -1) {
        frontierAt[ev.room] = i
      }
    }
  }

  // 预计算统计数据
  const deadEndCount = computeDeadEnds(w, h, open)
  const treeDiameter = computeTreeDiameter(w, h, open)
  const solveRes = solve('bfs', { w, h }, start, exit, (e) => open[e] === 1)
  const startExitPathLength = solveRes.path ? solveRes.path.length : 0

  const stats: LabGenStats = {
    deadEndCount,
    treeDiameter,
    startExitPathLength,
    totalRooms,
  }

  const isEdgeOpen = (edge: number, stepIndex: number): boolean => {
    const idx = carvedAt[edge]
    return idx !== -1 && idx < stepIndex
  }

  const getEdgeHeight = (edge: number, stepIndex: number): number => {
    const idx = carvedAt[edge]
    if (idx === -1 || idx >= stepIndex) {
      return WALL_H
    }
    const elapsed = stepIndex - idx
    if (elapsed >= 8) {
      return WALL_LOW
    }
    const progress = elapsed / 8
    const ease = progress * progress * (3 - 2 * progress)
    return WALL_H - ease * (WALL_H - WALL_LOW)
  }

  const getActiveRoom = (stepIndex: number): number | null => {
    if (stepIndex <= 0 || trace.length === 0) return 0
    const ev = trace[Math.min(stepIndex - 1, trace.length - 1)]
    if (ev.t === 'visit') return ev.room
    if (ev.t === 'carve') return ev.to
    if (ev.t === 'backtrack') return ev.room
    if (ev.t === 'frontier') return ev.room
    return null
  }

  const getRoomTileState = (
    room: number,
    stepIndex: number
  ): 'default' | 'visited' | 'active' | 'frontier' => {
    const active = getActiveRoom(stepIndex)
    if (room === active) return 'active'

    const vIdx = visitedAt[room]
    if (vIdx !== -1 && vIdx < stepIndex) {
      return 'visited'
    }

    const fIdx = frontierAt[room]
    if (fIdx !== -1 && fIdx < stepIndex) {
      return 'frontier'
    }

    return 'default'
  }

  return {
    w,
    h,
    algo,
    seed,
    open,
    start,
    exit,
    trace,
    totalSteps: trace.length,
    carvedAt,
    visitedAt,
    frontierAt,
    stats,
    getEdgeHeight,
    isEdgeOpen,
    getActiveRoom,
    getRoomTileState,
  }
}

/**
 * 生成阶段：当前步的动态解说（实验室底部字幕条用，讲人话不报坐标）
 */
export function describeGenStep(model: LabGenModel, stepIndex: number, lang: Lang = 'zh'): string {
  const { trace, carvedAt, visitedAt, stats } = model
  if (stepIndex <= 0) {
    return tMsg(lang, 'lab.narration.genStart')
  }
  if (stepIndex >= model.totalSteps) {
    return tMsg(lang, 'lab.narration.genDone', {
      rooms: stats.totalRooms,
      edges: stats.totalRooms - 1,
    })
  }

  let carved = 0
  for (let e = 0; e < carvedAt.length; e++) {
    if (carvedAt[e] !== -1 && carvedAt[e] < stepIndex) carved++
  }
  let visited = 0
  for (let r = 0; r < visitedAt.length; r++) {
    if (visitedAt[r] !== -1 && visitedAt[r] < stepIndex) visited++
  }

  const ev = trace[Math.min(stepIndex - 1, trace.length - 1)]
  switch (ev.t) {
    case 'carve':
      return tMsg(lang, 'lab.narration.carve', { n: carved })
    case 'visit':
      return tMsg(lang, 'lab.narration.visit', { v: visited, total: stats.totalRooms })
    case 'backtrack':
      return tMsg(lang, 'lab.narration.backtrack')
    case 'frontier':
      return tMsg(lang, 'lab.narration.frontier')
    default:
      return ''
  }
}

/**
 * 求解阶段：当前步的动态解说
 */
export function describeSolveStep(model: LabSolveModel, stepIndex: number, lang: Lang = 'zh'): string {
  const { trace, poppedAt } = model
  const totalRooms = poppedAt.length
  if (stepIndex <= 0) {
    return tMsg(lang, 'lab.narration.solveStart')
  }
  if (model.isPathVisible(stepIndex)) {
    return tMsg(lang, 'lab.narration.solveDone', { n: model.path ? model.path.length - 1 : 0 })
  }

  let expanded = 0
  for (let r = 0; r < totalRooms; r++) {
    if (poppedAt[r] !== -1 && poppedAt[r] < stepIndex) expanded++
  }

  const ev = trace[Math.min(stepIndex - 1, trace.length - 1)]
  if (ev.t === 'push') {
    return tMsg(lang, 'lab.narration.push', { n: expanded, total: totalRooms })
  }
  return tMsg(lang, 'lab.narration.pop', { n: expanded, total: totalRooms })
}

/**
 * 求解算法对比表单项计算
 */
function computeComparisonItem(
  algo: SolveAlgo,
  name: string,
  w: number,
  h: number,
  start: number,
  exit: number,
  open: Uint8Array
): SolverComparisonItem {
  const res = solve(algo, { w, h }, start, exit, (e) => open[e] === 1)
  const total = w * h
  const pathLen = res.path ? res.path.length : 0
  return {
    algo,
    name,
    expanded: res.expanded,
    pathLength: pathLen,
    ratio: res.expanded / total,
  }
}

/**
 * 创建求解算法模型（基于步数下标 i 纯函数计算）
 */
export function createLabSolveModel(
  w: number,
  h: number,
  algo: SolveAlgo,
  open: Uint8Array,
  start: number,
  exit: number,
  lang: Lang = 'zh'
): LabSolveModel {
  const totalRooms = w * h
  const res = solve(algo, { w, h }, start, exit, (e) => open[e] === 1)
  const { path, trace, expanded } = res

  const pushedAt = new Int32Array(totalRooms).fill(-1)
  const poppedAt = new Int32Array(totalRooms).fill(-1)

  for (let i = 0; i < trace.length; i++) {
    const ev = trace[i]
    if (ev.t === 'push') {
      if (pushedAt[ev.room] === -1) {
        pushedAt[ev.room] = i
      }
    } else if (ev.t === 'pop') {
      if (poppedAt[ev.room] === -1) {
        poppedAt[ev.room] = i
      }
    }
  }

  const pathSet = new Set(path ?? [])

  // 计算三种算法对比表
  const comparison: SolverComparisonItem[] = [
    computeComparisonItem('bfs', tMsg(lang, 'lab.algo.bfs'), w, h, start, exit, open),
    computeComparisonItem('dfs', tMsg(lang, 'lab.algo.dfs'), w, h, start, exit, open),
    computeComparisonItem('astar', tMsg(lang, 'lab.algo.astar'), w, h, start, exit, open),
  ]

  const stats: LabSolveStats = {
    expandedCount: expanded,
    pathLength: path ? path.length : 0,
    expansionRatio: expanded / totalRooms,
    comparison,
  }

  const isPathVisible = (stepIndex: number): boolean => {
    return stepIndex >= trace.length
  }

  const getExpandedCountAt = (stepIndex: number): number => {
    let count = 0
    for (let r = 0; r < totalRooms; r++) {
      if (poppedAt[r] !== -1 && poppedAt[r] < stepIndex) {
        count++
      }
    }
    return count
  }

  const getRoomTileState = (
    room: number,
    stepIndex: number
  ): 'default' | 'frontier' | 'expanded' | 'path' => {
    if (isPathVisible(stepIndex) && pathSet.has(room)) {
      return 'path'
    }

    const popIdx = poppedAt[room]
    if (popIdx !== -1 && popIdx < stepIndex) {
      return 'expanded'
    }

    const pushIdx = pushedAt[room]
    if (pushIdx !== -1 && pushIdx < stepIndex) {
      return 'frontier'
    }

    return 'default'
  }

  return {
    w,
    h,
    algo,
    start,
    exit,
    trace,
    totalSteps: trace.length,
    path,
    pushedAt,
    poppedAt,
    stats,
    isPathVisible,
    getRoomTileState,
    getExpandedCountAt,
  }
}
