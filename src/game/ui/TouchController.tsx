import {
  Compass,
  Eye,
  Radar,
  RotateCw,
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { memo, useCallback, useRef, useState } from 'react'
import { controller } from '../controller'
import { Dir, screenToWorldDir } from '../core/grid'
import { useT } from '../i18n/store'
import { useGameStore } from '../state/useGameStore'

const HOLD_RUN_DELAY = 220

function DPadButton({ dir, label, icon: Icon, className, activeDir }: {
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
      className={`pointer-events-none absolute flex items-center justify-center border transition-all ${className} ${active ? 'border-cyber-accent bg-cyber-accent text-accent-ink' : 'border-edge/60 bg-surface/80 text-ink-dim backdrop-blur-md'}`}
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
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode)

  const [activeDir, setActiveDir] = useState<Dir | null>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const activeDirRef = useRef<Dir | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  const handlePressStart = useCallback((screenDir: Dir) => {
    const engine = controller.getEngine()
    if (!engine) return
    if (engine.phase === 'revealing') {
      engine.skipReveal()
      return
    }
    if (engine.phase !== 'ready' && engine.phase !== 'playing') return

    activeDirRef.current = screenDir
    setActiveDir(screenDir)
    clearHoldTimer()
    engine.clearInput()

    if (cameraMode === 'first' && (screenDir === 1 || screenDir === 3)) {
      rotateYaw(screenDir === 1 ? 1 : -1)
      return
    }

    try { navigator.vibrate?.(10) } catch { /* haptics are optional */ }
    const worldDir = screenToWorldDir(screenDir, yawStep)
    engine.tap(worldDir)
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      if (activeDirRef.current === screenDir) engine.setHeld(worldDir)
    }, HOLD_RUN_DELAY)
  }, [yawStep, cameraMode, rotateYaw, clearHoldTimer])

  const handlePressEnd = useCallback(() => {
    clearHoldTimer()
    activeDirRef.current = null
    setActiveDir(null)
    controller.getEngine()?.setHeld(null)
  }, [clearHoldTimer])

  const directionFromPointer = (e: React.PointerEvent): Dir | null => {
    const rect = padRef.current?.getBoundingClientRect()
    if (!rect) return null
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    if (Math.hypot(dx, dy) < 12) return null
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const dir = directionFromPointer(e)
    if (dir !== null && dir !== activeDirRef.current) handlePressStart(dir)
  }

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

  if (!showTouchControls) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex select-none items-end justify-between px-4 md:px-8">
      <div
        ref={padRef}
        data-interactive="true"
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          handlePointerMove(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') handlePointerMove(e)
        }}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        className="pointer-events-auto relative flex h-36 w-36 touch-none items-center justify-center md:h-40 md:w-40"
      >
        <div className="absolute inset-0 rounded-full border border-edge/40 bg-surface/40 backdrop-blur-sm" />
        <DPadButton dir={0} label={cameraMode === 'first' ? t('touch.forward') : t('touch.moveUp')} icon={ChevronUp} activeDir={activeDir} className="left-1/2 top-1 h-11 w-11 -translate-x-1/2 rounded-b-md rounded-t-xl md:h-12 md:w-12" />
        <DPadButton dir={1} label={cameraMode === 'first' ? t('touch.turnRight') : t('touch.moveRight')} icon={ChevronRight} activeDir={activeDir} className="right-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-l-md rounded-r-xl md:h-12 md:w-12" />
        <DPadButton dir={2} label={cameraMode === 'first' ? t('touch.back') : t('touch.moveDown')} icon={ChevronDown} activeDir={activeDir} className="bottom-1 left-1/2 h-11 w-11 -translate-x-1/2 rounded-b-xl rounded-t-md md:h-12 md:w-12" />
        <DPadButton dir={3} label={cameraMode === 'first' ? t('touch.turnLeft') : t('touch.moveLeft')} icon={ChevronLeft} activeDir={activeDir} className="left-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-l-xl rounded-r-md md:h-12 md:w-12" />
        <div className="pointer-events-none z-10 text-ink-faint"><Compass className="h-4 w-4 text-ink-dim" /></div>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { controller.getEngine()?.clearInput(); rotateYaw(1) }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge/60 bg-surface/70 text-ink-dim backdrop-blur-md active:scale-95 md:h-12 md:w-12" title={t('touch.rotateTitle')}>
            <RotateCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { controller.getEngine()?.clearInput(); toggleCameraMode() }} className={`flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-md active:scale-95 ${cameraMode === 'first' ? 'border-cyber-accent bg-cyber-accent/15 text-cyber-accent' : 'border-edge/60 bg-surface/70 text-ink-dim'}`} title={t('touch.cameraTitle')}>
            <Compass className="h-4 w-4" />
          </button>
          <button type="button" onClick={handleScan} disabled={scansRemaining <= 0} className={`relative flex h-11 w-11 items-center justify-center rounded-xl border active:scale-95 ${scansRemaining > 0 ? 'border-cyber-accent/70 bg-cyber-accent/15 text-cyber-accent' : 'border-edge/50 bg-surface/50 text-ink-faint opacity-40'}`} title={t('touch.scanTitle')}>
            <Radar className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-edge/50 bg-sunken px-1 text-[11px] font-semibold text-ink">
              {Number.isFinite(scansRemaining) ? scansRemaining : '∞'}
            </span>
          </button>
          {shifting && (
            <button type="button" onClick={handleForceShift} disabled={forceCharges <= 0} className={`relative flex h-11 w-11 items-center justify-center rounded-xl border active:scale-95 ${forceCharges > 0 ? 'border-warn/60 bg-warn/15 text-warn' : 'border-edge/50 bg-surface/50 text-ink-faint opacity-40'}`} title={t('touch.forceTitle')}>
              <Zap className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-edge/50 bg-sunken px-1 text-[11px] font-semibold text-ink">{forceCharges}</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); setSurveying(true); controller.getEngine()?.setSurvey(true) }}
          onPointerUp={() => { setSurveying(false); controller.getEngine()?.setSurvey(false) }}
          onPointerLeave={() => { setSurveying(false); controller.getEngine()?.setSurvey(false) }}
          onPointerCancel={() => { setSurveying(false); controller.getEngine()?.setSurvey(false) }}
          className={`flex h-11 min-w-[124px] touch-none items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold active:scale-95 ${isSurveying ? 'border-cyber-accent bg-cyber-accent text-accent-ink' : 'border-edge/60 bg-surface/85 text-ink backdrop-blur-md'}`}
        >
          <Eye className="h-4 w-4" /><span>{t('touch.survey')}</span>
        </button>
      </div>
    </div>
  )
})
