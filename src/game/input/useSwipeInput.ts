import { useEffect, useRef } from 'react'
import { controller } from '../controller'
import { Dir, screenToWorldDir } from '../core/grid'
import { useGameStore } from '../state/useGameStore'

/** 按住多久之后才进入连续移动（毫秒） */
const HOLD_TO_RUN_MS = 280

export function useSwipeInput(): void {
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const currentScreenDirRef = useRef<Dir | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearHoldTimer = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      // 仅在游戏主页且非鼠标右键或触碰在交互控件上时处理
      const store = useGameStore.getState()
      if (store.currentPage !== 'game') return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.closest('button') ||
          target.closest('input') ||
          target.closest('[data-interactive="true"]'))
      ) {
        return
      }

      // 建造动画期间轻点即跳过，移动端不强制依赖滑动
      const engine = controller.getEngine()
      if (engine?.phase === 'revealing') {
        engine.skipReveal()
        return
      }

      startPosRef.current = { x: e.clientX, y: e.clientY }
      currentScreenDirRef.current = null
      clearHoldTimer()
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!startPosRef.current) return
      const store = useGameStore.getState()
      if (store.currentPage !== 'game') return

      const engine = controller.getEngine()
      if (!engine) return

      // 建造动画尚未结束时，滑动同时承担"跳过动画"的职责
      if (engine.phase === 'revealing') {
        engine.skipReveal()
      }
      // ready 阶段同样必须接受输入：引擎需要第一次有效输入才会由 ready 切到 playing，
      // 否则触屏玩家会被卡在 ready 阶段，永远走不出第一步。
      if (engine.phase !== 'ready' && engine.phase !== 'playing') return

      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      const dist = Math.hypot(dx, dy)

      // 拖动距离必须超过 24px 阈值（8.3）
      if (dist >= 24) {
        let screenDir: Dir
        if (Math.abs(dx) > Math.abs(dy)) {
          screenDir = dx > 0 ? 1 : 3 // 1=Right, 3=Left
        } else {
          screenDir = dy > 0 ? 2 : 0 // 2=Down, 0=Up
        }

        if (currentScreenDirRef.current !== screenDir) {
          currentScreenDirRef.current = screenDir
          const yawStep = store.yawStep
          const worldDir = screenToWorldDir(screenDir, yawStep)

          // 快速短滑只走一格，保证岔路口能停准；
          // 手指按住不动超过阈值才转入连续移动，长走廊不用反复划。
          clearHoldTimer()
          engine.tap(worldDir)
          holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            if (currentScreenDirRef.current === screenDir) {
              engine.setHeld(worldDir)
            }
          }, HOLD_TO_RUN_MS)
        }
      }
    }

    const handlePointerEnd = () => {
      clearHoldTimer()
      // 没有进行中的手势时不要清理 held，避免打断键盘长按
      if (!startPosRef.current) return
      startPosRef.current = null
      currentScreenDirRef.current = null

      const engine = controller.getEngine()
      if (engine) {
        engine.setHeld(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      clearHoldTimer()
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [])
}
