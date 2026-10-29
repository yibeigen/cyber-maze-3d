import { DIRS, edgeCount, edgeRooms, Maze, neighbor, roomXY } from './grid'
import { randInt } from './rng'

export interface ShiftParams {
  player: number          // 玩家当前逻辑房间
  locked: number[]        // 其关联边不得改动的房间
  exit: number
  radius: number          // 区域半径（房间单位，切比雪夫距离）
  swaps: number           // 目标交换次数
}

export interface ShiftPlan {
  origin: number
  close: number[]         // 将由通道变墙的边
  open: number[]          // 将由墙变通道的边
  distBefore: number      // 变形前 player→exit 路径长度（边数）
  distAfter: number
}

/**
 * 沿 openArray 通道计算 from 到 to 的最短路径边数，不可达返回 -1
 */
function getPathDistance(
  w: number,
  h: number,
  open: Uint8Array,
  from: number,
  to: number,
): number {
  if (from === to) return 0
  const total = w * h
  const dist = new Int32Array(total).fill(-1)
  dist[from] = 0
  const queue: number[] = [from]

  while (queue.length > 0) {
    const cur = queue.shift()!
    const d = dist[cur]
    if (cur === to) return d

    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i]
      const nb = neighbor(cur, dir, w, h)
      if (nb && open[nb.edge] === 1 && dist[nb.room] === -1) {
        dist[nb.room] = d + 1
        queue.push(nb.room)
      }
    }
  }

  return -1
}

/**
 * 生成树边交换变形算法：
 * 保持生成树无环连通性，天然保证有解
 */
export function planShift(
  maze: Maze,
  rng: () => number,
  p: ShiftParams,
): ShiftPlan | null {
  const { w, h } = maze
  const totalEdges = edgeCount(w, h)
  const lockedSet = new Set(p.locked)

  const distBefore = getPathDistance(w, h, maze.open, p.player, p.exit)
  if (distBefore === -1) return null

  // 允许增量：max(6, ceil(0.25 * distBefore))
  const maxInc = Math.max(6, Math.ceil(0.25 * distBefore))

  // 玩家坐标
  const playerCoords = roomXY(p.player, w)

  // 备选 origin 列表：玩家切比雪夫距离 <= 4 的房间集合（裁剪到网格）
  const originCandidates: number[] = []
  const minOx = Math.max(0, playerCoords.x - 4)
  const maxOx = Math.min(w - 1, playerCoords.x + 4)
  const minOy = Math.max(0, playerCoords.y - 4)
  const maxOy = Math.min(h - 1, playerCoords.y + 4)

  for (let y = minOy; y <= maxOy; y++) {
    for (let x = minOx; x <= maxOx; x++) {
      originCandidates.push(y * w + x)
    }
  }

  let bestPlan: ShiftPlan | null = null
  let bestInc = Infinity

  // 至多尝试 5 次完整规划
  for (let attempt = 0; attempt < 5; attempt++) {
    const origin = originCandidates[randInt(rng, originCandidates.length)]
    const originCoords = roomXY(origin, w)

    const inRadius = (r: number) => {
      const coords = roomXY(r, w)
      const dx = Math.abs(coords.x - originCoords.x)
      const dy = Math.abs(coords.y - originCoords.y)
      return Math.max(dx, dy) <= p.radius
    }

    const workOpen = new Uint8Array(maze.open)
    const closeEdges: number[] = []
    const openEdges: number[] = []
    const touched = new Uint8Array(totalEdges)

    const maxTries = p.swaps * 6
    let tries = 0

    while (closeEdges.length < p.swaps && tries < maxTries) {
      tries++

      // 1. 寻找候选关闭边：通道、两端在半径内、不在 locked 中、未被触碰
      const candClose: number[] = []
      for (let e = 0; e < totalEdges; e++) {
        if (workOpen[e] === 1 && touched[e] === 0) {
          const [a, b] = edgeRooms(e, w, h)
          if (
            inRadius(a) &&
            inRadius(b) &&
            !lockedSet.has(a) &&
            !lockedSet.has(b)
          ) {
            candClose.push(e)
          }
        }
      }

      if (candClose.length === 0) {
        break
      }

      const e = candClose[randInt(rng, candClose.length)]
      const [a] = edgeRooms(e, w, h)

      // 临时在副本中关闭边 e
      workOpen[e] = 0

      // 2. 从 a 出发 BFS 标记连通分量 A
      const inA = new Uint8Array(w * h)
      const q: number[] = [a]
      inA[a] = 1

      while (q.length > 0) {
        const cur = q.shift()!
        for (let i = 0; i < 4; i++) {
          const dir = DIRS[i]
          const nb = neighbor(cur, dir, w, h)
          if (nb && workOpen[nb.edge] === 1 && inA[nb.room] === 0) {
            inA[nb.room] = 1
            q.push(nb.room)
          }
        }
      }

      // 3. 寻找候选打开边：墙、两端在半径内、不在 locked 中、未被触碰、且一端在 A，另一端不在 A（且不得是刚关闭的边 e）
      const candOpen: number[] = []
      for (let c = 0; c < totalEdges; c++) {
        if (c !== e && workOpen[c] === 0 && touched[c] === 0) {
          const [u, v] = edgeRooms(c, w, h)
          if (
            inRadius(u) &&
            inRadius(v) &&
            !lockedSet.has(u) &&
            !lockedSet.has(v)
          ) {
            if ((inA[u] === 1 && inA[v] === 0) || (inA[u] === 0 && inA[v] === 1)) {
              candOpen.push(c)
            }
          }
        }
      }

      if (candOpen.length === 0) {
        // 无法连通分量，恢复边 e 并继续尝试
        workOpen[e] = 1
        continue
      }

      const c = candOpen[randInt(rng, candOpen.length)]
      workOpen[c] = 1
      touched[e] = 1
      touched[c] = 1
      closeEdges.push(e)
      openEdges.push(c)
    }

    if (closeEdges.length === 0) {
      continue
    }

    const distAfter = getPathDistance(w, h, workOpen, p.player, p.exit)
    if (distAfter === -1) {
      continue
    }

    const inc = distAfter - distBefore
    const plan: ShiftPlan = {
      origin,
      close: closeEdges,
      open: openEdges,
      distBefore,
      distAfter,
    }

    if (inc <= maxInc) {
      return plan
    }

    if (!bestPlan || inc < bestInc) {
      bestPlan = plan
      bestInc = inc
    }
  }

  return bestPlan
}
