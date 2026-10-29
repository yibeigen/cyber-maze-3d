export type Dir = 0 | 1 | 2 | 3 // 0: N (-z), 1: E (+x), 2: S (+z), 3: W (-x)

export const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 }, // N
  1: { dx: 1, dy: 0 },  // E
  2: { dx: 0, dy: 1 },  // S
  3: { dx: -1, dy: 0 }, // W
}

export const DIRS: readonly Dir[] = [0, 1, 2, 3]

export interface Maze {
  w: number
  h: number
  open: Uint8Array   // 逻辑通道（生成树），长度 E
  start: number      // 房间 id
  exit: number       // 房间 id
}

export function roomId(x: number, y: number, w: number): number {
  return y * w + x
}

export function roomXY(r: number, w: number): { x: number; y: number } {
  return {
    x: r % w,
    y: Math.floor(r / w),
  }
}

export function edgeCount(w: number, h: number): number {
  return h * (w - 1) + w * (h - 1)
}

/**
 * 获取边 e 连接的两个房间 [a, b]，恒满足 a < b
 */
export function edgeRooms(e: number, w: number, h: number): [number, number] {
  const horizCount = h * (w - 1)
  if (e < horizCount) {
    // 水平边
    const y = Math.floor(e / (w - 1))
    const x = e % (w - 1)
    const a = y * w + x
    const b = y * w + (x + 1)
    return [a, b]
  } else {
    // 垂直边
    const ve = e - horizCount
    const y = Math.floor(ve / w)
    const x = ve % w
    const a = y * w + x
    const b = (y + 1) * w + x
    return [a, b]
  }
}

/**
 * 查询相邻房间与穿过的边，越界返回 null
 */
export function neighbor(
  room: number,
  dir: Dir,
  w: number,
  h: number,
): { room: number; edge: number } | null {
  const x = room % w
  const y = Math.floor(room / w)
  const horizCount = h * (w - 1)

  switch (dir) {
    case 0: { // N: y - 1
      if (y <= 0) return null
      const targetRoom = (y - 1) * w + x
      const edge = horizCount + (y - 1) * w + x
      return { room: targetRoom, edge }
    }
    case 1: { // E: x + 1
      if (x >= w - 1) return null
      const targetRoom = y * w + (x + 1)
      const edge = y * (w - 1) + x
      return { room: targetRoom, edge }
    }
    case 2: { // S: y + 1
      if (y >= h - 1) return null
      const targetRoom = (y + 1) * w + x
      const edge = horizCount + y * w + x
      return { room: targetRoom, edge }
    }
    case 3: { // W: x - 1
      if (x <= 0) return null
      const targetRoom = y * w + (x - 1)
      const edge = y * (w - 1) + (x - 1)
      return { room: targetRoom, edge }
    }
  }
}

/**
 * 获取相邻两房间 a 和 b 之间的边编号。若不相邻返回 -1
 */
export function edgeBetween(a: number, b: number, w: number, h: number): number {
  if (a === b) return -1
  const minR = a < b ? a : b
  const maxR = a < b ? b : a

  const xa = minR % w
  const ya = Math.floor(minR / w)
  const xb = maxR % w
  const yb = Math.floor(maxR / w)

  if (ya === yb && xb === xa + 1) {
    // 水平相邻
    return ya * (w - 1) + xa
  }
  if (xa === xb && yb === ya + 1) {
    // 垂直相邻
    return h * (w - 1) + ya * w + xa
  }
  return -1
}

/**
 * 屏幕方向转世界方向（根据相机 yawStep）
 * yawStep: 0, 1, 2, 3 对应相机绕 Y 轴的 90° 旋转步数
 */
export function screenToWorldDir(screenDir: Dir, yawStep: number): Dir {
  return (((screenDir + yawStep) % 4 + 4) % 4) as Dir
}

/**
 * 计算房间对应的世界 X, Z 坐标（以迷宫中心为原点）
 */
export function roomToWorld(r: number, w: number, h: number): { x: number; z: number } {
  const x = r % w
  const y = Math.floor(r / w)
  return {
    x: 2 * x + 1 - w,
    z: 2 * y + 1 - h,
  }
}

/**
 * 检验是否满足生成树不变量：
 * 1. 通道数恰好等于 w * h - 1
 * 2. 从任意节点（如 0）沿通道可到达所有房间
 */
export function isSpanningTree(maze: Pick<Maze, 'w' | 'h' | 'open'>): boolean {
  const { w, h, open } = maze
  const totalRooms = w * h
  let openCount = 0
  for (let i = 0; i < open.length; i++) {
    if (open[i] === 1) openCount++
  }
  if (openCount !== totalRooms - 1) return false

  const visited = new Uint8Array(totalRooms)
  const queue: number[] = [0]
  visited[0] = 1
  let visitedCount = 1

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (let d = 0; d < 4; d++) {
      const nb = neighbor(cur, d as Dir, w, h)
      if (nb && open[nb.edge] === 1 && visited[nb.room] === 0) {
        visited[nb.room] = 1
        visitedCount++
        queue.push(nb.room)
      }
    }
  }

  return visitedCount === totalRooms
}
