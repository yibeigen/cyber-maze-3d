import { useEffect, useRef, useState } from 'react'
import { Maze } from '../core/grid'
import { THEMES } from '../core/themes'
import { useGameStore } from '../state/useGameStore'
import { computeMazeBox, drawMaze, mazePalette } from './mazeDraw'

interface MazeMiniMapProps {
  maze: Maze
  /** A* 最优路径（房间 id 序列）；null 时只画墙体 */
  path: number[] | null
  playerPath?: number[] | null
  /** 每次递增都会从头回放真实轨迹 */
  replayToken?: number
  className?: string
}

/**
 * 结算页的迷宫缩略图（全案 5.4）。
 * canvas 尺寸跟随容器（ResizeObserver），dpr 上限 2，配色随主题实时读取 CSS 变量。
 */
export function MazeMiniMap({ maze, path, playerPath, replayToken = 0, className }: MazeMiniMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeKey = useGameStore((s) => s.theme)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const theme = THEMES[themeKey] || THEMES.cyber
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || box.w < 10 || box.h < 10) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(box.w * dpr)
    canvas.height = Math.round(box.h * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const palette = mazePalette(theme)
    const mazeBox = computeMazeBox(maze.w, maze.h, box.w, box.h, 6)
    const paint = (playerPathProgress: number) => {
      ctx.clearRect(0, 0, box.w, box.h)
      drawMaze(
        ctx,
        { w: maze.w, h: maze.h, open: maze.open, start: maze.start, exit: maze.exit, path, playerPath },
        { ...palette, playerPath: '#f472b6', playerPathProgress },
        mazeBox,
      )
    }

    if (reducedMotion || !playerPath || playerPath.length < 2) {
      paint(1)
      return
    }

    paint(0)
    const startedAt = performance.now()
    const steps = Math.max(1, playerPath.length - 1)
    const duration = Math.min(4200, 1500 + steps * 40)
    let frame = 0
    const animate = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration)
      paint(t * t * (3 - 2 * t))
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [maze, path, playerPath, box.w, box.h, theme, reducedMotion, replayToken])

  return (
    <div ref={wrapRef} className={className}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="本局迷宫、最优路径与真实轨迹回放"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
