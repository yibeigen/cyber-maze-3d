import { DIRS, neighbor, roomXY } from './grid'

export type SolveAlgo = 'bfs' | 'dfs' | 'astar'

export type SolveEvent =
  | { t: 'push'; room: number; parent: number }  // 进入前沿；起点 parent = -1
  | { t: 'pop'; room: number }                   // 被展开

export interface SolveResult {
  path: number[] | null
  trace: SolveEvent[]
  expanded: number
}

interface AStarNode {
  room: number
  parent: number
  g: number
  h: number
  f: number
  order: number
}

class MinHeap {
  private data: AStarNode[] = []

  get size(): number {
    return this.data.length
  }

  push(node: AStarNode): void {
    this.data.push(node)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const bottom = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = bottom
      this.bubbleDown(0)
    }
    return top
  }

  private compare(a: AStarNode, b: AStarNode): number {
    if (a.f !== b.f) return a.f - b.f
    if (a.h !== b.h) return a.h - b.h
    return a.order - b.order
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1
      if (this.compare(this.data[idx], this.data[parentIdx]) < 0) {
        const tmp = this.data[idx]
        this.data[idx] = this.data[parentIdx]
        this.data[parentIdx] = tmp
        idx = parentIdx
      } else {
        break
      }
    }
  }

  private bubbleDown(idx: number): void {
    const len = this.data.length
    while (true) {
      const left = (idx << 1) + 1
      const right = left + 1
      let best = idx

      if (left < len && this.compare(this.data[left], this.data[best]) < 0) {
        best = left
      }
      if (right < len && this.compare(this.data[right], this.data[best]) < 0) {
        best = right
      }
      if (best !== idx) {
        const tmp = this.data[idx]
        this.data[idx] = this.data[best]
        this.data[best] = tmp
        idx = best
      } else {
        break
      }
    }
  }
}

export function solve(
  algo: SolveAlgo,
  maze: { w: number; h: number },
  from: number,
  to: number,
  passable: (edge: number) => boolean,
): SolveResult {
  const { w, h } = maze
  const totalRooms = w * h
  const trace: SolveEvent[] = []

  if (from === to) {
    trace.push({ t: 'push', room: from, parent: -1 })
    trace.push({ t: 'pop', room: from })
    return {
      path: [from],
      trace,
      expanded: 1,
    }
  }

  const discovered = new Uint8Array(totalRooms)
  const parent = new Int32Array(totalRooms).fill(-1)

  const toCoords = roomXY(to, w)

  const manhattan = (r: number) => {
    const coords = roomXY(r, w)
    return Math.abs(coords.x - toCoords.x) + Math.abs(coords.y - toCoords.y)
  }

  let expanded = 0
  let found = false

  if (algo === 'bfs') {
    const queue: number[] = [from]
    discovered[from] = 1
    trace.push({ t: 'push', room: from, parent: -1 })

    while (queue.length > 0) {
      const cur = queue.shift()!
      expanded++
      trace.push({ t: 'pop', room: cur })

      if (cur === to) {
        found = true
        break
      }

      for (let i = 0; i < 4; i++) {
        const dir = DIRS[i]
        const nb = neighbor(cur, dir, w, h)
        if (nb && passable(nb.edge) && discovered[nb.room] === 0) {
          discovered[nb.room] = 1
          parent[nb.room] = cur
          trace.push({ t: 'push', room: nb.room, parent: cur })
          queue.push(nb.room)
        }
      }
    }
  } else if (algo === 'dfs') {
    const stack: number[] = [from]
    discovered[from] = 1
    trace.push({ t: 'push', room: from, parent: -1 })

    while (stack.length > 0) {
      const cur = stack.pop()!
      expanded++
      trace.push({ t: 'pop', room: cur })

      if (cur === to) {
        found = true
        break
      }

      for (let i = 0; i < 4; i++) {
        const dir = DIRS[i]
        const nb = neighbor(cur, dir, w, h)
        if (nb && passable(nb.edge) && discovered[nb.room] === 0) {
          discovered[nb.room] = 1
          parent[nb.room] = cur
          trace.push({ t: 'push', room: nb.room, parent: cur })
          stack.push(nb.room)
        }
      }
    }
  } else {
    // A*
    const heap = new MinHeap()
    let pushOrder = 0

    const startH = manhattan(from)
    heap.push({
      room: from,
      parent: -1,
      g: 0,
      h: startH,
      f: startH,
      order: pushOrder++,
    })
    discovered[from] = 1
    trace.push({ t: 'push', room: from, parent: -1 })

    const gScores = new Int32Array(totalRooms).fill(-1)
    gScores[from] = 0

    while (heap.size > 0) {
      const current = heap.pop()!
      const cur = current.room
      expanded++
      trace.push({ t: 'pop', room: cur })

      if (cur === to) {
        found = true
        break
      }

      for (let i = 0; i < 4; i++) {
        const dir = DIRS[i]
        const nb = neighbor(cur, dir, w, h)
        if (nb && passable(nb.edge) && discovered[nb.room] === 0) {
          discovered[nb.room] = 1
          parent[nb.room] = cur
          const g = gScores[cur] + 1
          gScores[nb.room] = g
          const hVal = manhattan(nb.room)
          trace.push({ t: 'push', room: nb.room, parent: cur })
          heap.push({
            room: nb.room,
            parent: cur,
            g,
            h: hVal,
            f: g + hVal,
            order: pushOrder++,
          })
        }
      }
    }
  }

  if (!found) {
    return { path: null, trace, expanded }
  }

  // 重建路径：从 to 回溯到 from
  const path: number[] = [to]
  let step = to
  while (step !== from) {
    step = parent[step]
    if (step === -1) {
      return { path: null, trace, expanded }
    }
    path.push(step)
  }
  path.reverse()

  return { path, trace, expanded }
}
