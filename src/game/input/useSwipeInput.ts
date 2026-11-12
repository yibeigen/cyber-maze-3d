import { useEffect, useRef } from 'react'
import { controller } from '../controller'
import { Dir, screenToWorldDir } from '../core/grid'
import { useGameStore } from '../state/useGameStore'

/** 按住或拖动多久之后转入连续移动（毫秒） */
const HOLD_TO_RUN_MS = 160
/** 判定滑动手势的最小位移阈值 */
const SWIPE_THRESHOLD_PX = 20

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

      // 如果开启了触控手柄且触控点落在左侧摇杆感应区域，由摇杆优先捕获
      if (store.showTouchControls && e.clientX < window.innerWidth * 0.6) {
        return
      }

      // 建造动画期间轻点即跳过
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
      if (engine.phase !== 'ready' && engine.phase !== 'playing') return

      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      const dist = Math.hypot(dx, dy)

      // 拖动距离超过阈值判定方向
      if (dist >= SWIPE_THRESHOLD_PX) {
        let screenDir: Dir
        if (Math.abs(dx) > Math.abs(dy)) {
          screenDir = dx > 0 ? 1 : 3 // 1=Right, 3=Left
        } else {
          screenDir = dy > 0 ? 2 : 0 // 2=Down, 0=Up
        }

        // 核心修复：更新滑动基准锚点，使下一次转弯能以当前手指位置即时响应，解决滑动转弯卡死 Bug
        startPosRef.current = { x: e.clientX, y: e.clientY }

        if (currentScreenDirRef.current !== screenDir) {
          currentScreenDirRef.current = screenDir
          const yawStep = store.yawStep
          const worldDir = screenToWorldDir(screenDir, yawStep)

          try {
            navigator.vibrate?.(10)
          } catch {
            // Haptics optional
          }

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
