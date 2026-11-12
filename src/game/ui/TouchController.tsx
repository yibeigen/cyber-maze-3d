import {
  Compass,
  Eye,
  Gamepad2,
  Radar,
  RotateCw,
  SlidersHorizontal,
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { controller } from '../controller'
import { Dir, neighbor, screenToWorldDir } from '../core/grid'
import { useT } from '../i18n/store'
import { useGameStore } from '../state/useGameStore'

const JOYSTICK_MAX_RADIUS = 46
const JOYSTICK_DEADZONE = 12

/**
 * 智能拐弯辅助与方向解析：
 * 当摇杆推向斜角且首选方向为墙体时，若次选方向畅通，顺滑引导至畅通方向
 */
function resolveSmartDirection(
  angleDeg: number, // 0..360 (0 = 右, 90 = 下, 180 = 左, 270 = 上)
  yawStep: number,
  cameraMode: string,
  engine: ReturnType<typeof controller.getEngine>,
): Dir {
  if (cameraMode === 'first') {
    if (angleDeg >= 45 && angleDeg < 135) return 2 // 后退
    if (angleDeg >= 135 && angleDeg < 225) return 3 // 左转
    if (angleDeg >= 225 && angleDeg < 315) return 0 // 前进
    return 1 // 右转
  }

  let primary: Dir
  let secondary: Dir | null = null

  if (angleDeg >= 315 || angleDeg < 45) {
    primary = 1
    secondary = angleDeg < 45 ? (angleDeg > 18 ? 2 : null) : (angleDeg < 342 ? 0 : null)
  } else if (angleDeg >= 45 && angleDeg < 135) {
    primary = 2
    secondary = angleDeg < 90 ? (angleDeg < 72 ? 1 : null) : (angleDeg > 108 ? 3 : null)
  } else if (angleDeg >= 135 && angleDeg < 225) {
    primary = 3
    secondary = angleDeg < 180 ? (angleDeg < 162 ? 2 : null) : (angleDeg > 198 ? 0 : null)
  } else {
    primary = 0
    secondary = angleDeg < 270 ? (angleDeg < 252 ? 3 : null) : (angleDeg > 288 ? 1 : null)
  }

  if (!engine) return primary

  // 拐弯辅助：当首选方向是死胡同或墙体，而斜向推力带有次选且次选开放时，优先顺应通路
  const primaryWorld = screenToWorldDir(primary, yawStep)
  const pNb = neighbor(engine.currentRoom, primaryWorld, engine.maze.w, engine.maze.h)
  const primaryPassable = pNb && engine.isEdgePassable(pNb.edge)

  if (!primaryPassable && secondary !== null) {
    const secondaryWorld = screenToWorldDir(secondary, yawStep)
    const sNb = neighbor(engine.currentRoom, secondaryWorld, engine.maze.w, engine.maze.h)
    if (sNb && engine.isEdgePassable(sNb.edge)) {
      return secondary
    }
  }

  return primary
}

function DPadButton({
  dir,
  label,
  icon: Icon,
  className,
  activeDir,
}: {
  dir: Dir
  label: string
  icon: typeof ChevronUp
  className: string
  activeDir: Dir | null
}) {
  const active = activeDir === dir
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={`pointer-events-none absolute flex items-center justify-center border transition-all ${className} ${
        active
          ? 'border-cyber-accent bg-cyber-accent text-accent-ink shadow-lg shadow-cyber-accent/40'
          : 'border-edge/60 bg-surface/85 text-ink-dim backdrop-blur-md'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
    </button>
  )
}

export const TouchController = memo(function TouchController() {
  const t = useT()
  const yawStep = useGameStore((s) => s.yawStep)
  const isSurveying = useGameStore((s) => s.isSurveying)
  const setSurveying = useGameStore((s) => s.setSurveying)
  const rotateYaw = useGameStore((s) => s.rotateYaw)
  const scansRemaining = useGameStore((s) => s.scansRemaining)
  const forceCharges = useGameStore((s) => s.forceCharges)
  const shifting = useGameStore((s) => s.shifting)
  const showToast = useGameStore((s) => s.showToast)
  const showTouchControls = useGameStore((s) => s.showTouchControls)
  const touchControlMode = useGameStore((s) => s.touchControlMode)
  const toggleTouchControlMode = useGameStore((s) => s.toggleTouchControlMode)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode)

  const [activeDir, setActiveDir] = useState<Dir | null>(null)

  // 浮动摇杆状态
  const [joystick, setJoystick] = useState<{
    active: boolean
    originX: number
    originY: number
    knobX: number
    knobY: number
  }>({
    active: false,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
  })

  const joystickPointerIdRef = useRef<number | null>(null)
  const activeDirRef = useRef<Dir | null>(null)
  const firstPersonTurnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fixedPadRef = useRef<HTMLDivElement>(null)

  const clearFirstPersonTimer = useCallback(() => {
    if (firstPersonTurnTimerRef.current) {
      clearInterval(firstPersonTurnTimerRef.current)
      firstPersonTurnTimerRef.current = null
    }
  }, [])

  const handleStopMovement = useCallback(() => {
    clearFirstPersonTimer()
    activeDirRef.current = null
    setActiveDir(null)
    controller.getEngine()?.setHeld(null)
  }, [clearFirstPersonTimer])

  // 执行方向输入
  const applyDirectionInput = useCallback(
    (screenDir: Dir) => {
      const engine = controller.getEngine()
      if (!engine) return
      if (engine.phase === 'revealing') {
        engine.skipReveal()
        return
      }
      if (engine.phase !== 'ready' && engine.phase !== 'playing') return

      const dirChanged = activeDirRef.current !== screenDir
      activeDirRef.current = screenDir
      setActiveDir(screenDir)

      if (cameraMode === 'first') {
        if (screenDir === 1 || screenDir === 3) {
          engine.setHeld(null)
          if (dirChanged) {
            clearFirstPersonTimer()
            rotateYaw(screenDir === 1 ? 1 : -1)
            try {
              navigator.vibrate?.(10)
            } catch {}
            // 长推摇杆持续转向
            firstPersonTurnTimerRef.current = setInterval(() => {
              rotateYaw(screenDir === 1 ? 1 : -1)
            }, 260)
          }
          return
        }
        clearFirstPersonTimer()
      }

      const worldDir = screenToWorldDir(screenDir, yawStep)
      if (dirChanged) {
        try {
          navigator.vibrate?.(10)
        } catch {}
        engine.tap(worldDir)
      }
      engine.setHeld(worldDir)
    },
    [cameraMode, rotateYaw, yawStep, clearFirstPersonTimer],
  )

  // --- 浮动摇杆事件处理 ---
  const handleJoystickZonePointerDown = (e: React.PointerEvent) => {
    // 仅捕获未被捕获的主触点
    if (joystickPointerIdRef.current !== null) return

    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.closest('button') || target.closest('input') || target.closest('[data-interactive="true"]'))
    ) {
      return
    }

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    joystickPointerIdRef.current = e.pointerId

    setJoystick({
      active: true,
      originX: e.clientX,
      originY: e.clientY,
      knobX: 0,
      knobY: 0,
    })
  }

  const handleJoystickZonePointerMove = (e: React.PointerEvent) => {
    if (joystickPointerIdRef.current !== e.pointerId) return

    const dx = e.clientX - joystick.originX
    const dy = e.clientY - joystick.originY
    const dist = Math.hypot(dx, dy)

    if (dist < JOYSTICK_DEADZONE) {
      setJoystick((s) => ({ ...s, knobX: dx, knobY: dy }))
      handleStopMovement()
      return
    }

    const angleRad = Math.atan2(dy, dx)
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360
    const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS)
    const knobX = Math.cos(angleRad) * clampedDist
    const knobY = Math.sin(angleRad) * clampedDist

    setJoystick((s) => ({ ...s, knobX, knobY }))

    const engine = controller.getEngine()
    const screenDir = resolveSmartDirection(angleDeg, yawStep, cameraMode, engine)
    applyDirectionInput(screenDir)
  }

  const handleJoystickZonePointerUp = (e: React.PointerEvent) => {
    if (joystickPointerIdRef.current !== e.pointerId) return
    joystickPointerIdRef.current = null
    setJoystick({
      active: false,
      originX: 0,
      originY: 0,
      knobX: 0,
      knobY: 0,
    })
    handleStopMovement()
  }

  // --- 固定十字键事件处理 ---
  const fixedDirectionFromPointer = (e: React.PointerEvent): Dir | null => {
    const rect = fixedPadRef.current?.getBoundingClientRect()
    if (!rect) return null
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    if (Math.hypot(dx, dy) < 14) return null
    const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    const engine = controller.getEngine()
    return resolveSmartDirection(angleDeg, yawStep, cameraMode, engine)
  }

  const handleFixedPointerMove = (e: React.PointerEvent) => {
    const dir = fixedDirectionFromPointer(e)
    if (dir !== null && dir !== activeDirRef.current) {
      applyDirectionInput(dir)
    } else if (dir === null && activeDirRef.current !== null) {
      handleStopMovement()
    }
  }

  // 技能按钮
  const handleScan = () => {
    const result = controller.getEngine()?.scan()
    if (result === 'busy') showToast(t('toast.scanBusy'), 'warn')
    if (result === 'no-charges') showToast(t('toast.scanEmpty'))
  }

  const handleForceShift = () => {
    const result = controller.getEngine()?.forceShift()
    if (result === 'busy') showToast(t('toast.forceBusy'), 'warn')
    if (result === 'no-charges') showToast(t('toast.forceEmpty'))
    if (result === 'not-allowed') showToast(t('toast.forceNotAllowed'))
  }

  useEffect(() => {
    return () => {
      clearFirstPersonTimer()
    }
  }, [clearFirstPersonTimer])

  if (!showTouchControls) return null

  return (
    <>
      {/* ================= 左侧操控区域 ================= */}
      {touchControlMode === 'joystick' ? (
        // --- 动态浮动摇杆全屏左半感应区 ---
        <div
          data-interactive="true"
          onPointerDown={handleJoystickZonePointerDown}
          onPointerMove={handleJoystickZonePointerMove}
          onPointerUp={handleJoystickZonePointerUp}
          onPointerCancel={handleJoystickZonePointerUp}
          className="pointer-events-auto absolute bottom-0 left-0 top-16 z-30 w-[55vw] max-w-[460px] select-none touch-none"
        >
          {/* 摇杆未激活时的微光提示 */}
          {!joystick.active && (
            <div className="pointer-events-none absolute bottom-8 left-6 flex items-center gap-1.5 rounded-full border border-edge/40 bg-surface/40 px-3 py-1 text-[11px] text-ink-dim backdrop-blur-sm opacity-60">
              <Gamepad2 className="h-3.5 w-3.5 text-cyber-accent" />
              <span>{t('touch.joystickHint')}</span>
            </div>
          )}

          {/* 动态浮动摇杆本体 */}
          {joystick.active && (
            <div
              className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
              style={{ left: joystick.originX, top: joystick.originY }}
            >
              {/* 摇杆外盘基底 */}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-cyber-accent/50 bg-surface/50 shadow-[0_0_24px_rgba(45,212,191,0.2)] backdrop-blur-md">
                {/* 四方向刻度指示 */}
                <div
                  className={`absolute top-1.5 h-2 w-1 rounded-full ${
                    activeDir === 0 ? 'bg-cyber-accent shadow-[0_0_8px_#2dd4bf]' : 'bg-edge/80'
                  }`}
                />
                <div
                  className={`absolute right-1.5 h-1 w-2 rounded-full ${
                    activeDir === 1 ? 'bg-cyber-accent shadow-[0_0_8px_#2dd4bf]' : 'bg-edge/80'
                  }`}
                />
                <div
                  className={`absolute bottom-1.5 h-2 w-1 rounded-full ${
                    activeDir === 2 ? 'bg-cyber-accent shadow-[0_0_8px_#2dd4bf]' : 'bg-edge/80'
                  }`}
                />
                <div
                  className={`absolute left-1.5 h-1 w-2 rounded-full ${
                    activeDir === 3 ? 'bg-cyber-accent shadow-[0_0_8px_#2dd4bf]' : 'bg-edge/80'
                  }`}
                />

                {/* 摇杆中心滑块 */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-cyber-accent text-accent-ink shadow-lg shadow-cyber-accent/50"
                  style={{
                    transform: `translate(${joystick.knobX}px, ${joystick.knobY}px)`,
                    transition: joystick.knobX === 0 && joystick.knobY === 0 ? 'transform 0.1s ease-out' : 'none',
                  }}
                >
                  <div className="h-3.5 w-3.5 rounded-full bg-accent-ink/30" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // --- 经典固定十字键 ---
        <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 select-none md:left-8">
          <div
            ref={fixedPadRef}
            data-interactive="true"
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              handleFixedPointerMove(e)
            }}
            onPointerMove={(e) => {
              if (e.buttons || e.pointerType === 'touch') handleFixedPointerMove(e)
            }}
            onPointerUp={handleStopMovement}
            onPointerCancel={handleStopMovement}
            className="pointer-events-auto relative flex h-36 w-36 touch-none items-center justify-center md:h-40 md:w-40"
          >
            <div className="absolute inset-0 rounded-full border border-edge/40 bg-surface/50 backdrop-blur-sm" />
            <DPadButton
              dir={0}
              label={cameraMode === 'first' ? t('touch.forward') : t('touch.moveUp')}
              icon={ChevronUp}
              activeDir={activeDir}
              className="left-1/2 top-1 h-11 w-11 -translate-x-1/2 rounded-b-md rounded-t-xl md:h-12 md:w-12"
            />
            <DPadButton
              dir={1}
              label={cameraMode === 'first' ? t('touch.turnRight') : t('touch.moveRight')}
              icon={ChevronRight}
              activeDir={activeDir}
              className="right-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-l-md rounded-r-xl md:h-12 md:w-12"
            />
            <DPadButton
              dir={2}
              label={cameraMode === 'first' ? t('touch.back') : t('touch.moveDown')}
              icon={ChevronDown}
              activeDir={activeDir}
              className="bottom-1 left-1/2 h-11 w-11 -translate-x-1/2 rounded-b-xl rounded-t-md md:h-12 md:w-12"
            />
            <DPadButton
              dir={3}
              label={cameraMode === 'first' ? t('touch.turnLeft') : t('touch.moveLeft')}
              icon={ChevronLeft}
              activeDir={activeDir}
              className="left-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-l-xl rounded-r-md md:h-12 md:w-12"
            />
            <div className="pointer-events-none z-10 text-ink-faint">
              <Compass className="h-4 w-4 text-ink-dim" />
            </div>
          </div>
        </div>
      )}

      {/* ================= 右侧人体工学功能按键群 ================= */}
      <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex select-none flex-col items-end gap-2 md:right-8">
        {/* 顶部辅助工具行 */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* 摇杆/十字键切换按钮 */}
          <button
            type="button"
            onClick={toggleTouchControlMode}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md active:scale-95 transition-all ${
              touchControlMode === 'joystick'
                ? 'border-cyber-accent/80 bg-cyber-accent/15 text-cyber-accent'
                : 'border-edge/60 bg-surface/75 text-ink-dim'
            }`}
            title={t('touch.modeToggleTitle')}
            aria-label={t('touch.modeToggleTitle')}
          >
            {touchControlMode === 'joystick' ? (
              <Gamepad2 className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
          </button>

          {/* 视角顺时针旋转 90° */}
          <button
            type="button"
            onClick={() => {
              controller.getEngine()?.clearInput()
              rotateYaw(1)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge/60 bg-surface/75 text-ink-dim backdrop-blur-md active:scale-95"
            title={t('touch.rotateTitle')}
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* 视角模式切换（第一/第三人称） */}
          <button
            type="button"
            onClick={() => {
              controller.getEngine()?.clearInput()
              toggleCameraMode()
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md active:scale-95 ${
              cameraMode === 'first'
                ? 'border-cyber-accent bg-cyber-accent/15 text-cyber-accent'
                : 'border-edge/60 bg-surface/75 text-ink-dim'
            }`}
            title={t('touch.cameraTitle')}
          >
            <Compass className="h-4 w-4" />
          </button>
        </div>

        {/* 核心游戏动作区 */}
        <div className="pointer-events-auto flex items-end gap-2.5">
          {/* 俯瞰天眼按钮（按住俯瞰，松开返回） */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              setSurveying(true)
              controller.getEngine()?.setSurvey(true)
            }}
            onPointerUp={() => {
              setSurveying(false)
              controller.getEngine()?.setSurvey(false)
            }}
            onPointerLeave={() => {
              setSurveying(false)
              controller.getEngine()?.setSurvey(false)
            }}
            onPointerCancel={() => {
              setSurveying(false)
              controller.getEngine()?.setSurvey(false)
            }}
            className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold backdrop-blur-md active:scale-95 transition-all ${
              isSurveying
                ? 'border-cyber-accent bg-cyber-accent text-accent-ink shadow-md shadow-cyber-accent/30'
                : 'border-edge/60 bg-surface/85 text-ink'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>{t('touch.survey')}</span>
          </button>

          {/* 主动重构按键（迷宫变形模式可用） */}
          {shifting && (
            <button
              type="button"
              onClick={handleForceShift}
              disabled={forceCharges <= 0}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl border active:scale-95 backdrop-blur-md ${
                forceCharges > 0
                  ? 'border-warn/70 bg-warn/15 text-warn shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'border-edge/50 bg-surface/50 text-ink-faint opacity-40'
              }`}
              title={t('touch.forceTitle')}
            >
              <Zap className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-edge/50 bg-sunken px-1 text-[11px] font-semibold text-ink">
                {forceCharges}
              </span>
            </button>
          )}

          {/* 大号高光核心动作：A* 算法最优逃生路径扫描 */}
          <button
            type="button"
            onClick={handleScan}
            disabled={scansRemaining <= 0}
            className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 active:scale-95 backdrop-blur-md transition-all ${
              scansRemaining > 0
                ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:brightness-110'
                : 'border-edge/50 bg-surface/50 text-ink-faint opacity-40'
            }`}
            title={t('touch.scanTitle')}
          >
            <Radar className="h-6 w-6" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[18px] items-center justify-center rounded-full border border-cyber-accent/60 bg-sunken px-1 text-[11px] font-bold text-cyber-accent shadow-sm">
              {Number.isFinite(scansRemaining) ? scansRemaining : '∞'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
})
