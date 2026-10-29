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
import { buildShareUrl, copyToClipboard } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { LiveNumbers } from './LiveNumbers'
import { TouchController } from './TouchController'

function DistanceReadout() {
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
          textRef.current.textContent = distance >= 0 ? `距 ${distance}` : '距 —'
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
  }, [])

  return (
    <div className="w-[76px] space-y-1">
      <span ref={textRef} className="block text-[11px] leading-none text-ink-dim tabular-nums">距 --</span>
      <div className="h-[3px] overflow-hidden rounded-full bg-edge/35" title="逃脱进度">
        <div ref={barRef} className="h-full origin-left scale-x-0 rounded-full bg-cyber-accent transition-transform duration-200" />
      </div>
    </div>
  )
}

function ShiftCountdown() {
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
    <div className="glass-panel flex items-center gap-2 rounded-xl px-2.5 py-1.5" title="墙体自动重构倒计时">
      <svg className="h-5 w-5 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" className="text-edge/35" strokeWidth="3.5" />
        <circle
          cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="75.4"
          strokeDashoffset={isWarning || isMotion ? 0 : strokeDashoffset}
          className={`transition-all duration-200 ${tone} ${isWarning ? 'animate-pulse' : ''}`}
        />
      </svg>
      <span className={`text-[11px] font-semibold leading-none tabular-nums ${tone}`}>
        {isWarning ? '预警' : isMotion ? '重排中' : `${Math.ceil(seconds)}s 后重构`}
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
        if (labelRef.current) labelRef.current.textContent = Math.abs(relative) < 0.18 ? '信标在正前方' : '出口方位'
      }
      animId = requestAnimationFrame(update)
    }
    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="absolute left-1/2 top-4 w-[240px] max-w-[42vw] -translate-x-1/2 rounded-xl glass-panel px-4 py-2 text-center">
      <span ref={labelRef} className="text-[11px] text-ink-dim">出口方位</span>
      <div className="relative mt-1 flex items-center justify-between font-mono text-[11px] text-ink-faint">
        <span>W</span><span>N</span><span>E</span><span>S</span>
        <div ref={markerRef} className="absolute -bottom-1 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-[#f472b6] shadow-[0_0_8px_#f472b6]" />
      </div>
    </div>
  )
}

const KEY_CAP = 'rounded-md border border-edge/50 bg-sunken/70 px-1.5 py-0.5 font-mono text-[11px] text-ink'

export function HUD() {
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
    showToast(ok ? '已复制迷宫分享链接' : '链接复制失败，请手动复制', ok ? 'success' : 'warn')
  }

  const handleScan = () => {
    const result = controller.getEngine()?.scan()
    if (result === 'busy') showToast('变形或扫描进行中，稍后再试', 'warn')
    if (result === 'no-charges') showToast('本局扫描已用完')
  }

  const handleForceShift = () => {
    const result = controller.getEngine()?.forceShift()
    if (result === 'busy') showToast('变形进行中，稍等一下', 'warn')
    if (result === 'no-charges') showToast('主动重构次数已用完')
    if (result === 'not-allowed') showToast('静态迷宫无法主动重构')
  }

  const maxScans = activeLevel?.scanCharges ?? SIZE_CONFIGS[size].scanCharges
  const maxForce = activeLevel?.forceShiftCharges ?? SIZE_CONFIGS[size].forceShiftCharges
  const engine = controller.getEngine()
  const mazeLabel = engine ? `${engine.maze.w}×${engine.maze.h}` : SIZE_CONFIGS[size].w
  const taskTitle = tutorial === 'move'
    ? '第 1 课 · 抵达粉色信标'
    : tutorial === 'scan'
      ? '第 2 课 · 召唤算法光轨'
      : tutorial === 'shift'
        ? '第 3 课 · 读懂矩阵呼吸'
        : activeLevel
          ? `第 ${activeLevel.id} 关 · ${activeLevel.name}`
          : mode === 'daily' ? '今日挑战' : '抵达粉色信标'

  const taskCard = (
    <div className="pointer-events-auto w-[246px] max-w-[68vw] rounded-xl glass-panel px-3 py-2">
      <button onClick={() => { setTaskPinned(true); setTaskExpanded((value) => !value) }} className="flex w-full items-center gap-2 text-left">
        <Target className="h-3.5 w-3.5 shrink-0 text-cyber-accent" />
        <span className="text-xs font-semibold text-ink">{taskTitle}</span>
        <span className="ml-auto text-ink-faint">{taskExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</span>
      </button>
      {taskExpanded && (
        <div className="mt-2 space-y-1.5 text-[11px] text-ink-dim">
          {tutorial === 'move' && <p className="leading-relaxed">按 WASD 或方向键移动。走过的地砖会留下微光，抵达信标即可完成第一课。</p>}
          {tutorial === 'scan' && <p className="leading-relaxed">本关扫描不限次数。按 F，沿青色最优光轨前进；也可以按住空格俯瞰全图。</p>}
          {tutorial === 'shift' && <p className="leading-relaxed">琥珀墙将升起，翡翠墙将降下。按 G 可主动重构附近墙体，试试让迷宫为你让路。</p>}
          {!tutorial && (
            <>
              <div className="flex items-center justify-between gap-3"><span>{cameraMode === 'first' ? '前进 / 转向' : '移动'}</span><kbd className={KEY_CAP}>{cameraMode === 'first' ? 'W / A D' : 'WASD'}</kbd></div>
              <div className="flex items-center justify-between gap-3"><span>扫描最优路线</span><kbd className={KEY_CAP}>F</kbd></div>
              {shifting && <div className="flex items-center justify-between gap-3"><span>主动重构墙体</span><kbd className={KEY_CAP}>G</kbd></div>}
              <div className="flex items-center justify-between gap-3 text-ink-faint"><span>俯瞰 / 切换视角</span><span className="flex gap-1"><kbd className={KEY_CAP}>空格</kbd><kbd className={KEY_CAP}>V</kbd></span></div>
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
              <button onClick={handleCopyLink} title="点击复制种子链接" className="pointer-events-auto flex max-w-full min-w-0 items-center gap-2 rounded-xl glass-panel px-2.5 py-2 text-xs font-semibold text-ink hover:border-edge">
                <span className="hidden truncate font-mono sm:inline">#{activeSeed}</span>
                <span className="shrink-0 rounded-md bg-sunken/80 px-1.5 py-0.5 text-[11px] text-ink-dim tabular-nums">{mazeLabel}</span>
                <Copy className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              </button>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl glass-panel px-2 py-1.5 md:gap-3 md:px-3 md:py-2">
                <div className="text-right">
                  <div className="mb-0.5 text-[11px] leading-none text-ink-faint">{phase === 'ready' ? '就绪' : '用时'}</div>
                  <LiveNumbers className="text-lg font-semibold leading-none tracking-tight text-ink tabular-nums md:text-2xl" />
                </div>
                <div className="h-8 w-px bg-edge/40" />
                <div className="space-y-1.5 text-[11px] leading-none">
                  <span className="block text-ink-dim">步数 <span className="font-semibold text-ink tabular-nums">{moves}</span></span>
                  <DistanceReadout />
                </div>
                <button
                  onClick={() => controller.getEngine()?.pause()}
                  title="暂停游戏 (Esc / P)"
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
              <DockButton icon={<RotateCw className="h-4 w-4" />} label="旋转" keyHint="E" title="旋转视角 90° (E)" onClick={() => { controller.getEngine()?.clearInput(); rotateYaw(1) }} />
              <DockButton
                icon={<Eye className="h-4 w-4" />} label="俯瞰" keyHint="空格" title="按住俯瞰全图 (空格)" active={isSurveying}
                onPointerDown={(e) => { e.preventDefault(); setSurveying(true); controller.getEngine()?.setSurvey(true) }}
                onPointerUp={(e) => { e.preventDefault(); setSurveying(false); controller.getEngine()?.setSurvey(false) }}
              />
              <DockButton
                icon={<Radar className="h-4 w-4" />} label="扫描" keyHint="F"
                title={`扫描最优路线 (F) · ${Number.isFinite(scansRemaining) ? `剩 ${scansRemaining} 次` : '不限次数'}`}
                onClick={handleScan} disabled={scansRemaining <= 0} pips={{ total: maxScans, left: scansRemaining }}
              />
              {shifting && (
                <DockButton
                  icon={<Zap className="h-4 w-4" />} label="重构" keyHint="G" title={`主动重构附近墙体 (G) · 剩 ${forceCharges} 次`}
                  onClick={handleForceShift} disabled={forceCharges <= 0} pips={{ total: maxForce, left: forceCharges }}
                />
              )}
              <DockButton
                icon={<Compass className="h-4 w-4" />} label="视角" keyHint="V" title="切换第三 / 第一人称 (V)" active={cameraMode === 'first'}
                onClick={() => {
                  controller.getEngine()?.clearInput()
                  toggleCameraMode()
                  showToast(cameraMode === 'third' ? '第一人称 · 空格俯瞰，V 返回' : '已切换第三人称')
                }}
              />
              <DockButton icon={<Film className="h-4 w-4" />} label="电影" keyHint="H" title="电影模式 (H)" onClick={toggleCinematic} />
              <DockButton icon={<Gamepad2 className="h-4 w-4" />} label="触控" title="显示触控手柄" onClick={toggleTouchControls} />
            </div>
          </div>
        )}
      </div>
      <TouchController />
    </>
  )
}
