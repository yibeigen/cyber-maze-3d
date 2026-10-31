import {
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Eye,
  Film,
  Gamepad2,
  Pause,
  Radar,
  RotateCw,
  Target,
  Zap,
} from 'lucide-react'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { controller } from '../controller'
import { SIZE_CONFIGS } from '../core/constants'
import { roomToWorld } from '../core/grid'
import { levelName, useLang, useT } from '../i18n/store'
import { buildShareUrl, copyToClipboard } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { LiveNumbers } from './LiveNumbers'
import { TouchController } from './TouchController'

function DistanceReadout() {
  const t = useT()
  const textRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef<number | null>(null)

  useEffect(() => {
    let animId: number
    let last = 0
    const loop = (now: number) => {
      if (now - last >= 200) {
        last = now
        const engine = controller.getEngine()
        if (engine && textRef.current && barRef.current) {
          const distance = engine.remainingDistance
          textRef.current.textContent = distance >= 0 ? t('hud.distance', { n: distance }) : t('hud.distanceUnknown')
          const initial = Math.max(1, engine.initialOptimalMoves)
          const progress = distance >= 0 ? Math.min(1, Math.max(0, 1 - distance / initial)) : 0
          barRef.current.style.transform = `scaleX(${progress})`
          const increased = previousRef.current !== null && distance > previousRef.current
          barRef.current.style.backgroundColor = increased ? '#f59e0b' : ''
          previousRef.current = distance
        }
      }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [t])

  return (
    <div className="w-[76px] space-y-1">
      <span ref={textRef} className="block text-[11px] leading-none text-ink-dim tabular-nums">
        {t('hud.distanceUnknown')}
      </span>
      <div className="h-[3px] overflow-hidden rounded-full bg-edge/35" title={t('hud.progressTitle')}>
        <div ref={barRef} className="h-full origin-left scale-x-0 rounded-full bg-cyber-accent transition-transform duration-200" />
      </div>
    </div>
  )
}

function ShiftCountdown() {
  const t = useT()
  const [info, setInfo] = useState<{ seconds: number; isWarning: boolean; isMotion: boolean } | null>(null)

  useEffect(() => {
    let animId: number
    let last = 0
    const loop = (now: number) => {
      if (now - last >= 100) {
        last = now
        const engine = controller.getEngine()
        if (engine) setInfo(engine.nextShiftCountdown)
      }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  if (!info) return null
  const interval = controller.getEngine()?.shiftInterval ?? 15
  const { seconds, isWarning, isMotion } = info
  const strokeDashoffset = 75.4 * (1 - Math.min(1, Math.max(0, seconds / interval)))
  const tone = isWarning ? 'text-warn' : isMotion ? 'text-ok' : 'text-cyber-accent'

  return (
    <div className="glass-panel flex items-center gap-2 rounded-xl px-2.5 py-1.5" title={t('hud.shiftTitle')}>
      <svg className="h-5 w-5 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" className="text-edge/35" strokeWidth="3.5" />
        <circle
          cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="75.4"
          strokeDashoffset={isWarning || isMotion ? 0 : strokeDashoffset}
          className={`transition-all duration-200 ${tone} ${isWarning ? 'animate-pulse' : ''}`}
        />
      </svg>
      <span className={`text-[11px] font-semibold leading-none tabular-nums ${tone}`}>
        {isWarning
          ? t('hud.shiftWarning')
          : isMotion
            ? t('hud.shifting')
            : t('hud.shiftIn', { n: Math.ceil(seconds) })}
      </span>
    </div>
  )
}

function ChargePips({ total, left }: { total: number; left: number }) {
  if (!Number.isFinite(total)) return <span className="text-[11px] font-bold text-cyber-accent">∞</span>
  return (
    <span className="flex items-center justify-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-[3px] w-[3px] rounded-full ${i < left ? 'bg-cyber-accent' : 'bg-edge/80'}`} />
      ))}
    </span>
  )
}

function DockButton({
  icon, label, keyHint, title, onClick, onPointerDown, onPointerUp, active, disabled, pips,
}: {
  icon: ReactNode
  label: string
  keyHint?: string
  title: string
  onClick?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  active?: boolean
  disabled?: boolean
  pips?: { total: number; left: number }
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      disabled={disabled}
      className={`relative flex h-12 min-w-[54px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 transition-colors duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-35 md:min-w-[62px] md:px-2 ${
        active ? 'border-cyber-accent/70 bg-cyber-accent/15 text-cyber-accent' : 'border-edge/40 bg-surface/40 text-ink-dim hover:border-edge/80 hover:text-ink'
      }`}
    >
      {keyHint && <kbd className="absolute right-1 top-0.5 font-mono text-[11px] leading-none text-ink-faint">{keyHint}</kbd>}
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </span>
      <span className="flex h-[5px] items-center">{pips && <ChargePips total={pips.total} left={pips.left} />}</span>
    </button>
  )
}

function FirstPersonCompass() {
  const t = useT()
  const markerRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let animId: number
    const update = () => {
      const engine = controller.getEngine()
      if (engine && markerRef.current) {
        const player = engine.getPlayerVisual()
        const exit = roomToWorld(engine.maze.exit, engine.maze.w, engine.maze.h)
        const target = Math.atan2(exit.x - player.x, -(exit.z - player.z))
        const current = useGameStore.getState().yawStep * Math.PI / 2
        const relative = Math.atan2(Math.sin(target - current), Math.cos(target - current))
        markerRef.current.style.left = `${50 + relative / Math.PI * 48}%`
        if (labelRef.current) {
          labelRef.current.textContent = Math.abs(relative) < 0.18 ? t('hud.beaconAhead') : t('hud.exitBearing')
        }
      }
      animId = requestAnimationFrame(update)
    }
    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [t])

  return (
    <div className="absolute left-1/2 top-4 w-[240px] max-w-[42vw] -translate-x-1/2 rounded-xl glass-panel px-4 py-2 text-center">
      <span ref={labelRef} className="text-[11px] text-ink-dim">{t('hud.exitBearing')}</span>
      <div className="relative mt-1 flex items-center justify-between font-mono text-[11px] text-ink-faint">
        <span>W</span><span>N</span><span>E</span><span>S</span>
        <div ref={markerRef} className="absolute -bottom-1 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-[#f472b6] shadow-[0_0_8px_#f472b6]" />
      </div>
    </div>
  )
}

const KEY_CAP = 'rounded-md border border-edge/50 bg-sunken/70 px-1.5 py-0.5 font-mono text-[11px] text-ink'

export function HUD() {
  const t = useT()
  const lang = useLang()
  const activeSeed = useGameStore((s) => s.activeSeed)
  const size = useGameStore((s) => s.size)
  const shifting = useGameStore((s) => s.shifting)
  const moves = useGameStore((s) => s.moves)
  const scansRemaining = useGameStore((s) => s.scansRemaining)
  const forceCharges = useGameStore((s) => s.forceCharges)
  const phase = useGameStore((s) => s.phase)
  const runId = useGameStore((s) => s.runId)
  const showToast = useGameStore((s) => s.showToast)
  const isSurveying = useGameStore((s) => s.isSurveying)
  const setSurveying = useGameStore((s) => s.setSurveying)
  const rotateYaw = useGameStore((s) => s.rotateYaw)
  const showTouchControls = useGameStore((s) => s.showTouchControls)
  const toggleTouchControls = useGameStore((s) => s.toggleTouchControls)
  const toggleCinematic = useGameStore((s) => s.toggleCinematic)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode)
  const activeLevel = useGameStore((s) => s.activeLevel)
  const mode = useGameStore((s) => s.mode)

  const tutorial = activeLevel?.tutorial
  const [taskExpanded, setTaskExpanded] = useState(true)
  const [taskPinned, setTaskPinned] = useState(false)

  useEffect(() => {
    setTaskExpanded(true)
    setTaskPinned(!!tutorial)
  }, [runId, tutorial])

  useEffect(() => {
    if (taskPinned) return
    const timer = setTimeout(() => setTaskExpanded(false), 6000)
    return () => clearTimeout(timer)
  }, [phase, taskPinned, runId])

  useEffect(() => {
    if (!taskPinned && moves >= 8) setTaskExpanded(false)
  }, [moves, taskPinned])

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(buildShareUrl(size, shifting, activeSeed, activeLevel?.id))
    showToast(ok ? t('hud.copyToast') : t('hud.copyFail'), ok ? 'success' : 'warn')
  }

  const handleScan = () => {
    const result = controller.getEngine()?.scan()
    if (result === 'busy') showToast(t('hud.scanBusy'), 'warn')
    if (result === 'no-charges') showToast(t('hud.scanEmpty'))
  }

  const handleForceShift = () => {
    const result = controller.getEngine()?.forceShift()
    if (result === 'busy') showToast(t('hud.forceBusy'), 'warn')
    if (result === 'no-charges') showToast(t('hud.forceEmpty'))
    if (result === 'not-allowed') showToast(t('hud.forceNotAllowed'))
  }

  const maxScans = activeLevel?.scanCharges ?? SIZE_CONFIGS[size].scanCharges
  const maxForce = activeLevel?.forceShiftCharges ?? SIZE_CONFIGS[size].forceShiftCharges
  const engine = controller.getEngine()
  const mazeLabel = engine ? `${engine.maze.w}×${engine.maze.h}` : SIZE_CONFIGS[size].w
  const taskTitle = tutorial === 'move'
    ? t('hud.taskMoveTitle')
    : tutorial === 'scan'
      ? t('hud.taskScanTitle')
      : tutorial === 'shift'
        ? t('hud.taskShiftTitle')
        : activeLevel
          ? t('hud.taskLevelTitle', { n: activeLevel.id, name: levelName(lang, activeLevel) })
          : mode === 'daily' ? t('hud.taskDaily') : t('hud.taskArrive')

  const taskCard = (
    <div className="pointer-events-auto w-[246px] max-w-[68vw] rounded-xl glass-panel px-3 py-2">
      <button onClick={() => { setTaskPinned(true); setTaskExpanded((value) => !value) }} className="flex w-full items-center gap-2 text-left">
        <Target className="h-3.5 w-3.5 shrink-0 text-cyber-accent" />
        <span className="text-xs font-semibold text-ink">{taskTitle}</span>
        <span className="ml-auto text-ink-faint">{taskExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</span>
      </button>
      {taskExpanded && (
        <div className="mt-2 space-y-1.5 text-[11px] text-ink-dim">
          {tutorial === 'move' && <p className="leading-relaxed">{t('hud.tutorialMove')}</p>}
          {tutorial === 'scan' && <p className="leading-relaxed">{t('hud.tutorialScan')}</p>}
          {tutorial === 'shift' && <p className="leading-relaxed">{t('hud.tutorialShift')}</p>}
          {!tutorial && (
            <>
              <div className="flex items-center justify-between gap-3"><span>{t(cameraMode === 'first' ? 'hud.controlsForwardTurn' : 'hud.controlsMove')}</span><kbd className={KEY_CAP}>{cameraMode === 'first' ? 'W / A D' : 'WASD'}</kbd></div>
              <div className="flex items-center justify-between gap-3"><span>{t('hud.controlsScan')}</span><kbd className={KEY_CAP}>F</kbd></div>
              {shifting && <div className="flex items-center justify-between gap-3"><span>{t('hud.controlsForce')}</span><kbd className={KEY_CAP}>G</kbd></div>}
              <div className="flex items-center justify-between gap-3 text-ink-faint"><span>{t('hud.controlsSurvey')}</span><span className="flex gap-1"><kbd className={KEY_CAP}>{t('key.space')}</kbd><kbd className={KEY_CAP}>V</kbd></span></div>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 flex select-none flex-col justify-between p-4 md:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <button onClick={handleCopyLink} title={t('hud.copyTitle')} className="pointer-events-auto flex max-w-full min-w-0 items-center gap-2 rounded-xl glass-panel px-2.5 py-2 text-xs font-semibold text-ink hover:border-edge">
                <span className="hidden truncate font-mono sm:inline">#{activeSeed}</span>
                <span className="shrink-0 rounded-md bg-sunken/80 px-1.5 py-0.5 text-[11px] text-ink-dim tabular-nums">{mazeLabel}</span>
                <Copy className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              </button>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl glass-panel px-2 py-1.5 md:gap-3 md:px-3 md:py-2">
                <div className="text-right">
                  <div className="mb-0.5 text-[11px] leading-none text-ink-faint">{t(phase === 'ready' ? 'hud.ready' : 'hud.time')}</div>
                  <LiveNumbers className="text-lg font-semibold leading-none tracking-tight text-ink tabular-nums md:text-2xl" />
                </div>
                <div className="h-8 w-px bg-edge/40" />
                <div className="space-y-1.5 text-[11px] leading-none">
                  <span className="block text-ink-dim">{t('hud.moves')} <span className="font-semibold text-ink tabular-nums">{moves}</span></span>
                  <DistanceReadout />
                </div>
                <button
                  onClick={() => controller.getEngine()?.pause()}
                  title={t('hud.pauseTitle')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge/40 text-ink-dim hover:border-edge hover:text-ink md:h-9 md:w-9"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
              {shifting && <div className="pointer-events-auto"><ShiftCountdown /></div>}
            </div>
          </div>
          {showTouchControls && <div className="max-w-full">{taskCard}</div>}
        </div>

        {cameraMode === 'first' && !isSurveying && phase === 'playing' && <FirstPersonCompass />}

        {!showTouchControls && (
          <div className="flex flex-wrap items-end justify-between gap-2">
            {taskCard}
            <div className="pointer-events-auto flex w-full flex-wrap items-center justify-end gap-1 rounded-2xl glass-panel p-1.5 md:w-auto md:flex-nowrap md:gap-1.5">
              <DockButton icon={<RotateCw className="h-4 w-4" />} label={t('dock.rotate')} keyHint="E" title={t('dock.rotateTitle')} onClick={() => { controller.getEngine()?.clearInput(); rotateYaw(1) }} />
              <DockButton
                icon={<Eye className="h-4 w-4" />} label={t('dock.survey')} keyHint={t('key.space')} title={t('dock.surveyTitle')} active={isSurveying}
                onPointerDown={(e) => { e.preventDefault(); setSurveying(true); controller.getEngine()?.setSurvey(true) }}
                onPointerUp={(e) => { e.preventDefault(); setSurveying(false); controller.getEngine()?.setSurvey(false) }}
              />
              <DockButton
                icon={<Radar className="h-4 w-4" />} label={t('dock.scan')} keyHint="F"
                title={
                  Number.isFinite(scansRemaining)
                    ? t('hud.scanTitleRemaining', { n: scansRemaining })
                    : t('hud.scanTitleUnlimited')
                }
                onClick={handleScan} disabled={scansRemaining <= 0} pips={{ total: maxScans, left: scansRemaining }}
              />
              {shifting && (
                <DockButton
                  icon={<Zap className="h-4 w-4" />} label={t('dock.force')} keyHint="G" title={t('hud.forceTitle', { n: forceCharges })}
                  onClick={handleForceShift} disabled={forceCharges <= 0} pips={{ total: maxForce, left: forceCharges }}
                />
              )}
              <DockButton
                icon={<Compass className="h-4 w-4" />} label={t('dock.camera')} keyHint="V" title={t('dock.cameraTitle')} active={cameraMode === 'first'}
                onClick={() => {
                  controller.getEngine()?.clearInput()
                  toggleCameraMode()
                  showToast(t(cameraMode === 'third' ? 'dock.cameraFirstToast' : 'dock.cameraThirdToast'))
                }}
              />
              <DockButton icon={<Film className="h-4 w-4" />} label={t('dock.cinematic')} keyHint="H" title={t('dock.cinematicTitle')} onClick={toggleCinematic} />
              <DockButton icon={<Gamepad2 className="h-4 w-4" />} label={t('dock.touch')} title={t('dock.touchTitle')} onClick={toggleTouchControls} />
            </div>
          </div>
        )}
      </div>
      <TouchController />
    </>
  )
}
