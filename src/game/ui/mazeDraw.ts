import { edgeRooms, roomXY } from '../core/grid'
import { ThemeConfig } from '../core/themes'

/**
 * 迷宫缩略图的纯绘制函数（全案 5.4 / 5.5）
 * 结算面板与分享长图共用同一套逻辑，保证"屏幕上看到的"和"发出去的"是同一张图。
 *
 * 坐标系：网格为 (2w+1) × (2h+1)，房间 (x,y) 占中心格 (2x+1, 2y+1)。
 * 一条被墙封住的边 e 对应一个 1×1 的墙块，块中心是 (blockI+0.5, blockJ+0.5)。
 */

export interface MazeLike {
  w: number
  h: number
  open: Uint8Array | ArrayLike<number>
  start: number
  exit: number
  /** A* 最优路径（房间 id 序列），没有就不画 */
  path?: number[] | null
  playerPath?: number[] | null
}

export interface MazePalette {
  wall: string
  path: string
  start: string
  exit: string
  border: string
}

export interface MazeBox {
  x: number
  y: number
  w: number
  h: number
}

export interface MazeDrawStyle extends MazePalette {
  wallWidth?: number
  pathWidth?: number
  dotRadius?: number
  /** 为 true 时先铺一层极淡的房间格点，只在长图上用 */
  showCells?: boolean
  cellColor?: string
  playerPath?: string
  /** 0–1，用于结算页逐段回放真实轨迹；分享图默认完整绘制 */
  playerPathProgress?: number
}

const ACCENT_FALLBACK: Record<string, string> = {
  cyber: '#38bdf8',
  aurora: '#c084fc',
  light: '#0284c7',
}

/** 解析 #rgb / #rrggbb / rgb(r,g,b) 三种写法，解析不了返回 null */
function parseColor(color: string): [number, number, number] | null {
  const c = color.trim()
  if (c.startsWith('#')) {
    const h = c.slice(1)
    const full =
      h.length === 3
        ? h
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : h
    if (full.length < 6) return null
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ]
  }
  const m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return null
}

/** 颜色线性混色，t=0 返回 a，t=1 返回 b。支持 css 变量读出来的 rgb() 串 */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return a
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${mix(ca[0], cb[0])}, ${mix(ca[1], cb[1])}, ${mix(ca[2], cb[2])})`
}

/**
 * 从 [data-theme] 元素上读取 CSS 变量（形如 "56 189 248"），转成 canvas 可用的 rgb()。
 * 读不到时回落到该主题的默认 accent，绝不写死一套青色。
 */
export function cssVarColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const el = document.querySelector('[data-theme]')
  if (!el) return fallback
  const raw = getComputedStyle(el).getPropertyValue(name).trim()
  const parts = raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`
  }
  return fallback
}

export function mazePalette(theme: ThemeConfig): MazePalette {
  const fallbackAccent = ACCENT_FALLBACK[theme.id] ?? '#38bdf8'
  const accent = cssVarColor('--accent', fallbackAccent)
  if (theme.id === 'light') {
    return {
      wall: '#94a3b8',
      path: accent,
      start: accent,
      exit: '#db2777',
      border: 'rgba(100, 116, 139, 0.35)',
    }
  }
  return {
    wall: mixHex(theme.wallColor, '#ffffff', 0.34),
    path: accent,
    start: accent,
    exit: '#f472b6',
    border: 'rgba(148, 163, 184, 0.28)',
  }
}

/** 在给定画布区域内算出一个居中的绘制盒（保持迷宫本身的长宽比） */
export function computeMazeBox(
  w: number,
  h: number,
  width: number,
  height: number,
  padding = 8,
): MazeBox {
  const cols = 2 * w + 1
  const rows = 2 * h + 1
  const availW = Math.max(1, width - padding * 2)
  const availH = Math.max(1, height - padding * 2)
  const scale = Math.min(availW / cols, availH / rows)
  const drawW = cols * scale
  const drawH = rows * scale
  return {
    x: (width - drawW) / 2,
    y: (height - drawH) / 2,
    w: drawW,
    h: drawH,
  }
}

/**
 * 把迷宫画进 ctx 的指定绘制盒里。
 * 调用方负责 dpr 变换与清屏；这里只管线条与点。
 */
export function drawMaze(
  ctx: CanvasRenderingContext2D,
  maze: MazeLike,
  style: MazeDrawStyle,
  box: MazeBox,
): void {
  const { w, h, open, start, exit } = maze
  const cols = 2 * w + 1
  const rows = 2 * h + 1
  const cell = Math.min(box.w / cols, box.h / rows)
  const x0 = box.x + (box.w - cell * cols) / 2
  const y0 = box.y + (box.h - cell * rows) / 2
  const totalW = cell * cols
  const totalH = cell * rows

  // 1. 极淡的房间格点（只在长图上开，缩略图会糊成一片）
  if (style.showCells) {
    ctx.fillStyle = style.cellColor ?? 'rgba(148, 163, 184, 0.06)'
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillRect(
          x0 + (2 * x + 1) * cell + cell * 0.2,
          y0 + (2 * y + 1) * cell + cell * 0.2,
          cell * 0.6,
          cell * 0.6,
        )
      }
    }
  }

  // 2. 外框
  ctx.strokeStyle = style.border
  ctx.lineWidth = Math.max(1, cell * 0.14)
  ctx.strokeRect(x0 + ctx.lineWidth / 2, y0 + ctx.lineWidth / 2, totalW - ctx.lineWidth, totalH - ctx.lineWidth)

  // 3. 墙线：每条封闭边 = 一格宽的线段
  // 每个路口的墙块是 1×1 的格子，线只画在块中心；若两条墙在路口相接，
  // 两端各向路口中心延伸半格，线就连续了；孤立的一格墙不延伸，长度保持真实。
  const wallW = style.wallWidth ?? Math.min(2.2, Math.max(1.2, cell * 0.26))

  const segments: { vertical: boolean; bi: number; bj: number }[] = []
  const pillarHits = new Map<number, number>()

  for (let e = 0; e < open.length; e++) {
    if (open[e] === 1) continue
    const [a, b] = edgeRooms(e, w, h)
    const ca = roomXY(a, w)
    const cb = roomXY(b, w)
    const bi = ca.x + cb.x + 1
    const bj = ca.y + cb.y + 1
    const vertical = ca.y === cb.y
    segments.push({ vertical, bi, bj })

    const ends: [number, number][] = vertical
      ? [
          [bi, bj - 1],
          [bi, bj + 1],
        ]
      : [
          [bi - 1, bj],
          [bi + 1, bj],
        ]
    for (const [pi, pj] of ends) {
      const key = pi * cols + pj
      pillarHits.set(key, (pillarHits.get(key) ?? 0) + 1)
    }
  }

  ctx.strokeStyle = style.wall
  ctx.lineWidth = wallW
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const { vertical, bi, bj } of segments) {
    const half = cell / 2
    if (vertical) {
      const x = x0 + (bi + 0.5) * cell
      const top = (pillarHits.get(bi * cols + (bj - 1)) ?? 0) >= 2 ? half : 0
      const bottom = (pillarHits.get(bi * cols + (bj + 1)) ?? 0) >= 2 ? half : 0
      ctx.moveTo(x, y0 + bj * cell - top)
      ctx.lineTo(x, y0 + (bj + 1) * cell + bottom)
    } else {
      const y = y0 + (bj + 0.5) * cell
      const left = (pillarHits.get((bi - 1) * cols + bj) ?? 0) >= 2 ? half : 0
      const right = (pillarHits.get((bi + 1) * cols + bj) ?? 0) >= 2 ? half : 0
      ctx.moveTo(x0 + bi * cell - left, y)
      ctx.lineTo(x0 + (bi + 1) * cell + right, y)
    }
  }
  ctx.stroke()

  // 4. 当前最优路径：作为参照垫在底层
  const pathW = style.pathWidth ?? Math.min(3.2, Math.max(2, cell * 0.42))
  if (maze.path && maze.path.length > 1) {
    ctx.strokeStyle = style.path
    ctx.lineWidth = pathW
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    maze.path.forEach((room, idx) => {
      const c = roomXY(room, w)
      const px = x0 + (2 * c.x + 1.5) * cell
      const py = y0 + (2 * c.y + 1.5) * cell
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }

  // 5. 真实轨迹压在最优路径上方：回放时先铺淡色底稿，再逐段描亮
  const playerProgress = Math.min(1, Math.max(0, style.playerPathProgress ?? 1))
  if (maze.playerPath && maze.playerPath.length > 1) {
    const playerColor = style.playerPath ?? '#f472b6'
    const pointAt = (room: number) => {
      const c = roomXY(room, w)
      return {
        x: x0 + (2 * c.x + 1.5) * cell,
        y: y0 + (2 * c.y + 1.5) * cell,
      }
    }
    const drawTrail = (progress: number, alpha: number, showHead: boolean) => {
      const spans = (maze.playerPath!.length - 1) * progress
      const fullSpans = Math.floor(spans)
      const partial = spans - fullSpans
      const head = pointAt(maze.playerPath![fullSpans])
      let headPoint = head
      if (partial > 0 && fullSpans < maze.playerPath!.length - 1) {
        const next = pointAt(maze.playerPath![fullSpans + 1])
        headPoint = {
          x: head.x + (next.x - head.x) * partial,
          y: head.y + (next.y - head.y) * partial,
        }
      }

      ctx.save()
      ctx.strokeStyle = playerColor
      ctx.globalAlpha = alpha
      ctx.lineWidth = Math.max(1.6, pathW * 0.85)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.setLineDash([Math.max(2, cell * 0.55), Math.max(2, cell * 0.4)])
      ctx.beginPath()
      const first = pointAt(maze.playerPath![0])
      ctx.moveTo(first.x, first.y)
      for (let idx = 1; idx <= fullSpans; idx++) {
        const point = pointAt(maze.playerPath![idx])
        ctx.lineTo(point.x, point.y)
      }
      if (partial > 0) ctx.lineTo(headPoint.x, headPoint.y)
      ctx.stroke()

      if (showHead) {
        ctx.setLineDash([])
        const core = Math.max(2.4, cell * 0.46)
        ctx.fillStyle = playerColor
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        ctx.arc(headPoint.x, headPoint.y, Math.max(5, cell * 0.9), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(headPoint.x, headPoint.y, core, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(headPoint.x, headPoint.y, core * 0.42, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const animating = style.playerPathProgress !== undefined
    if (animating) drawTrail(1, 0.2, false)
    drawTrail(animating ? playerProgress : 1, 0.9, animating && playerProgress < 1)
  }

  // 6. 起终点
  const dotR = style.dotRadius ?? Math.max(2.4, cell * 0.6)
  const drawDot = (room: number, color: string, radius: number) => {
    const c = roomXY(room, w)
    const px = x0 + (2 * c.x + 1.5) * cell
    const py = y0 + (2 * c.y + 1.5) * cell
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  drawDot(start, style.start, dotR)
  drawDot(exit, style.exit, dotR * 1.15)
}
