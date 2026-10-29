import { useEffect, useRef } from 'react'
import { controller } from '../controller'

interface LiveNumbersProps {
  className?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
}

/**
 * 计时器数字显示组件：
 * 不通过 React 状态或 Zustand 驱动，而是通过 requestAnimationFrame 直接向 DOM 写入 textContent，
 * 限频至 ~10-15 Hz，完全避免每秒 60 次触发组件树重新渲染。
 */
export function LiveNumbers({ className }: LiveNumbersProps) {
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let animId: number
    let lastRenderTime = 0

    const update = (now: number) => {
      // 限制更新频率为 ~10 Hz (每 100ms 一次)
      if (now - lastRenderTime >= 95) {
        lastRenderTime = now
        const engine = controller.getEngine()
        if (engine && spanRef.current) {
          spanRef.current.textContent = formatTime(engine.elapsed)
        }
      }
      animId = requestAnimationFrame(update)
    }

    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <span ref={spanRef} className={className}>
      00:00.0
    </span>
  )
}
