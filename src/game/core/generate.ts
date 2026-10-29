import { Dir, DIRS, edgeCount, neighbor, roomId } from './grid'
import { randInt } from './rng'

export type GenAlgo = 'dfs' | 'prim'

export type GenEvent =
  | { t: 'visit'; room: number }
  | { t: 'carve'; edge: number; from: number; to: number }
  | { t: 'backtrack'; room: number }      // 仅 dfs
  | { t: 'frontier'; room: number }       // 仅 prim

export function generate(
  algo: GenAlgo,
  w: number,
  h: number,
  rng: () => number,
): { open: Uint8Array; trace: GenEvent[] } {
  if (algo === 'dfs') {
    return generateDFS(w, h, rng)
  } else {
    return generatePrim(w, h, rng)
  }
}

/**
 * 显式栈实现的深度优先回溯生成算法（无递归）
 */
function generateDFS(
  w: number,
  h: number,
  rng: () => number,
): { open: Uint8Array; trace: GenEvent[] } {
  const totalRooms = w * h
  const open = new Uint8Array(edgeCount(w, h))
  const visited = new Uint8Array(totalRooms)
  const trace: GenEvent[] = []

  const stack: number[] = [0]
  visited[0] = 1
  trace.push({ t: 'visit', room: 0 })

  const unvisited: { room: number; edge: number }[] = []

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    unvisited.length = 0

    // 邻居遍历顺序固定为 N, E, S, W（保证确定性）
    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i]
      const nb = neighbor(current, dir, w, h)
      if (nb && visited[nb.room] === 0) {
        unvisited.push(nb)
      }
    }

    if (unvisited.length > 0) {
      const idx = randInt(rng, unvisited.length)
      const chosen = unvisited[idx]
      visited[chosen.room] = 1
      open[chosen.edge] = 1

      trace.push({
        t: 'carve',
        edge: chosen.edge,
        from: current,
        to: chosen.room,
      })
      trace.push({
        t: 'visit',
        room: chosen.room,
      })
      stack.push(chosen.room)
    } else {
      stack.pop()
      trace.push({
        t: 'backtrack',
        room: current,
      })
    }
  }

  return { open, trace }
}

/**
 * 随机 Prim 迷宫生成算法
 */
function generatePrim(
  w: number,
  h: number,
  rng: () => number,
): { open: Uint8Array; trace: GenEvent[] } {
  const totalRooms = w * h
  const open = new Uint8Array(edgeCount(w, h))
  const visited = new Uint8Array(totalRooms)
  const inFrontier = new Uint8Array(totalRooms)
  const trace: GenEvent[] = []

  visited[0] = 1
  trace.push({ t: 'visit', room: 0 })

  const frontier: number[] = []

  const addFrontier = (r: number) => {
    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i]
      const nb = neighbor(r, dir, w, h)
      if (nb && visited[nb.room] === 0 && inFrontier[nb.room] === 0) {
        inFrontier[nb.room] = 1
        frontier.push(nb.room)
        trace.push({ t: 'frontier', room: nb.room })
      }
    }
  }

  addFrontier(0)
  const visitedNeighbors: { room: number; edge: number }[] = []

  while (frontier.length > 0) {
    const fIdx = randInt(rng, frontier.length)
    const fRoom = frontier[fIdx]

    // 保持确定性的数组移除
    frontier.splice(fIdx, 1)
    inFrontier[fRoom] = 0

    visitedNeighbors.length = 0
    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i]
      const nb = neighbor(fRoom, dir, w, h)
      if (nb && visited[nb.room] === 1) {
        visitedNeighbors.push(nb)
      }
    }

    if (visitedNeighbors.length > 0) {
      const chosen = visitedNeighbors[randInt(rng, visitedNeighbors.length)]
      visited[fRoom] = 1
      open[chosen.edge] = 1

      trace.push({
        t: 'carve',
        edge: chosen.edge,
        from: chosen.room,
        to: fRoom,
      })
      trace.push({
        t: 'visit',
        room: fRoom,
      })

      addFrontier(fRoom)
    }
  }

  return { open, trace }
}

/**
 * 起点固定为左下角 (0, h-1)。
 * 出口的选择同时考虑"路径距离"和"视觉距离"：
 * 只取 BFS 最远的房间时，会出现终点就在起点隔壁、却要绕一百多步才能到的情形，
 * 玩家第一眼看过去会以为终点近在咫尺，实际怎么走都过不去。
 * 因此在路径距离达到最大值 85% 的候选里，挑曼哈顿距离最大的那个。
 */
export function pickStartExit(
  w: number,
  h: number,
  open: Uint8Array,
): { start: number; exit: number } {
  const start = roomId(0, h - 1, w)
  const totalRooms = w * h

  const dist = new Int32Array(totalRooms).fill(-1)
  dist[start] = 0
  const queue: number[] = [start]

  let maxDist = 0

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curDist = dist[cur]

    if (curDist > maxDist) {
      maxDist = curDist
    }

    for (let i = 0; i < 4; i++) {
      const dir = DIRS[i]
      const nb = neighbor(cur, dir, w, h)
      if (nb && open[nb.edge] === 1 && dist[nb.room] === -1) {
        dist[nb.room] = curDist + 1
        queue.push(nb.room)
      }
    }
  }

  const threshold = Math.max(1, Math.floor(maxDist * 0.85))
  const sx = start % w
  const sy = Math.floor(start / w)

  let exit = start
  let bestManhattan = -1

  for (let r = 0; r < totalRooms; r++) {
    if (dist[r] < threshold) continue
    const x = r % w
    const y = Math.floor(r / w)
    const manhattan = Math.abs(x - sx) + Math.abs(y - sy)
    if (manhattan > bestManhattan || (manhattan === bestManhattan && r < exit)) {
      bestManhattan = manhattan
      exit = r
    }
  }

  return { start, exit }
}
