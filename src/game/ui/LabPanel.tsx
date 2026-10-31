import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
  HelpCircle,
  Pause,
  Play,
  Shuffle,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { controller } from '../controller'
import { MazeSize, SIZE_CONFIGS } from '../core/constants'
import { GenAlgo } from '../core/generate'
import { randomSeed } from '../core/rng'
import { SolveAlgo } from '../core/solve'
import { useLang, useT } from '../i18n/store'
import {
  createLabGenModel,
  createLabSolveModel,
  describeGenStep,
  describeSolveStep,
  LAB_TILE_COLORS,
  LabPhase,
} from '../lab/labModel'
import { hasLabOnboarding, setLabOnboardingCompleted } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { LabGuide } from './LabGuide'

const SIZES: { key: MazeSize; label: 'size.s' | 'size.m' | 'size.l'; desc: string }[] = [
  { key: 's', label: 'size.s', desc: '9×9' },
  { key: 'm', label: 'size.m', desc: '15×15' },
  { key: 'l', label: 'size.l', desc: '21×21' },
]

const SPEEDS = [0.5, 1, 2, 4]

/** 图例小色块：颜色与 3D 场景地砖严格一致 */
function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  )
}

export function LabPanel() {
  const t = useT()
  const lang = useLang()
  const lab = useGameStore((s) => s.lab)
  const setLabGenAlgo = useGameStore((s) => s.setLabGenAlgo)
  const setLabSolveAlgo = useGameStore((s) => s.setLabSolveAlgo)
  const setLabSize = useGameStore((s) => s.setLabSize)
  const setLabSeed = useGameStore((s) => s.setLabSeed)
  const setLabPhase = useGameStore((s) => s.setLabPhase)
  const setLabStepIndex = useGameStore((s) => s.setLabStepIndex)
  const setLabIsPlaying = useGameStore((s) => s.setLabIsPlaying)
  const setLabSpeed = useGameStore((s) => s.setLabSpeed)

  const [mobileOpen, setMobileOpen] = useState(true)
  // 第一次进实验室弹三步讲解；之后随时可以点右上角"?"重看
  const [showGuide, setShowGuide] = useState(() => !hasLabOnboarding())

  const { genAlgo, solveAlgo, size, seed, phase, stepIndex, isPlaying, speed } = lab
  const { w, h } = SIZE_CONFIGS[size]

  // 计算当前迷宫模型数据
  const genModel = useMemo(() => {
    return createLabGenModel(w, h, genAlgo, seed)
  }, [w, h, genAlgo, seed])

  const solveModel = useMemo(() => {
    return createLabSolveModel(w, h, solveAlgo, genModel.open, genModel.start, genModel.exit, lang)
  }, [w, h, solveAlgo, genModel, lang])

  const totalSteps = phase === 'generate' ? genModel.totalSteps : solveModel.totalSteps

  // 切换阶段
  const handlePhaseChange = (nextPhase: LabPhase) => {
    setLabIsPlaying(false)
    setLabPhase(nextPhase)
    setLabStepIndex(0)
  }

  // 步进控制
  const handleJumpStart = () => {
    setLabIsPlaying(false)
    setLabStepIndex(0)
  }

  const handleStepBack = () => {
    setLabIsPlaying(false)
    setLabStepIndex(Math.max(0, stepIndex - 1))
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      setLabIsPlaying(false)
    } else {
      if (stepIndex >= totalSteps) {
        setLabStepIndex(0)
      }
      setLabIsPlaying(true)
    }
  }

  const handleStepForward = () => {
    setLabIsPlaying(false)
    setLabStepIndex(Math.min(totalSteps, stepIndex + 1))
  }

  const handleJumpEnd = () => {
    setLabIsPlaying(false)
    setLabStepIndex(totalSteps)
  }

  const handleRandomSeed = () => {
    const s = randomSeed()
    setLabSeed(s)
  }

  const currentNarration =
    phase === 'generate'
      ? describeGenStep(genModel, stepIndex, lang)
      : describeSolveStep(solveModel, stepIndex, lang)
  const progressPct = totalSteps > 0 ? (stepIndex / totalSteps) * 100 : 0

  return (
    <>
      {/* 移动端展开/折叠浮动按钮 */}
      <div className="md:hidden fixed top-4 left-4 z-40 pointer-events-auto">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1.5 rounded-xl glass-panel px-3 py-1.5 text-xs font-semibold text-ink"
        >
          <Cpu className="w-4 h-4 text-cyber-accent" />
          <span>{mobileOpen ? t('lab.fold') : t('lab.title')}</span>
        </button>
      </div>

      {/* 实验室控制主面板（规范 5.0 弹层面板规范） */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: 1,
          x: 0,
          display: mobileOpen ? 'flex' : 'none',
        }}
        transition={{ duration: 0.25 }}
        className={`fixed left-4 top-16 md:top-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] rounded-2xl glass-panel flex-col z-30 pointer-events-auto text-ink overflow-hidden ${
          mobileOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* 顶部标题栏与返回 */}
        <div className="flex items-center justify-between border-b border-edge/40 p-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyber-accent" />
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-ink">
                {t('lab.title')}
              </h2>
              <p className="text-[11px] text-ink-dim">
                {t('lab.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuide(true)}
              title={t('lab.helpTitle')}
              aria-label={t('lab.helpTitle')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge/40 bg-sunken/60 text-ink-dim transition-colors hover:text-ink"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => controller.toMenu()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge/60 bg-sunken text-xs text-ink-dim hover:text-ink hover:border-edge transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('lab.back')}</span>
            </button>
          </div>
        </div>

        {/* 滚动内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* 阶段切换（分段控件规范） */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ink-faint">{t('lab.phaseLabel')}</label>
            <div className="flex rounded-xl border border-edge/60 bg-sunken p-1">
              <button
                type="button"
                onClick={() => handlePhaseChange('generate')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  phase === 'generate'
                    ? 'bg-cyber-accent text-accent-ink'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('lab.phaseGenerate')}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePhaseChange('solve')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  phase === 'solve'
                    ? 'bg-cyber-accent text-accent-ink'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{t('lab.phaseSolve')}</span>
              </button>
            </div>
          </div>

          {/* 算法选择器（分段控件规范） */}
          {phase === 'generate' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-faint">{t('lab.genAlgo')}</label>
              <div className="flex rounded-xl border border-edge/60 bg-sunken p-1">
                <button
                  type="button"
                  onClick={() => setLabGenAlgo('dfs')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    genAlgo === 'dfs'
                      ? 'bg-cyber-accent text-accent-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {t('lab.genDfs')}
                </button>
                <button
                  type="button"
                  onClick={() => setLabGenAlgo('prim')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    genAlgo === 'prim'
                      ? 'bg-cyber-accent text-accent-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {t('lab.genPrim')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-faint">{t('lab.solveAlgo')}</label>
              <div className="flex rounded-xl border border-edge/60 bg-sunken p-1">
                <button
                  type="button"
                  onClick={() => setLabSolveAlgo('bfs')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    solveAlgo === 'bfs'
                      ? 'bg-cyber-accent text-accent-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  BFS
                </button>
                <button
                  type="button"
                  onClick={() => setLabSolveAlgo('dfs')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    solveAlgo === 'dfs'
                      ? 'bg-cyber-accent text-accent-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  DFS
                </button>
                <button
                  type="button"
                  onClick={() => setLabSolveAlgo('astar')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    solveAlgo === 'astar'
                      ? 'bg-cyber-accent text-accent-ink'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  A*
                </button>
              </div>
            </div>
          )}

          {/* 画面图例：3D 场景地砖颜色的含义，与场景共用同一份色值 */}
          <div className="rounded-xl glass-inset p-3">
            <div className="mb-2 text-[11px] font-semibold text-ink-faint">
              {t('lab.legendTitle')}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-ink-dim">
              {phase === 'generate' ? (
                <>
                  <LegendSwatch color={LAB_TILE_COLORS.active} label={t('lab.legendActive')} />
                  <LegendSwatch color={LAB_TILE_COLORS.frontier} label={t('lab.legendCandidate')} />
                  <LegendSwatch color={LAB_TILE_COLORS.visited} label={t('lab.legendVisited')} />
                  <LegendSwatch color={LAB_TILE_COLORS.default} label={t('lab.legendUntouched')} />
                  <span className="text-ink-faint">{t('lab.legendWallDown')}</span>
                </>
              ) : (
                <>
                  <LegendSwatch color={LAB_TILE_COLORS.path} label={t('lab.legendPath')} />
                  <LegendSwatch color={LAB_TILE_COLORS.frontier} label={t('lab.legendPending')} />
                  <LegendSwatch color={LAB_TILE_COLORS.expanded} label={t('lab.legendExpanded')} />
                  <LegendSwatch color={LAB_TILE_COLORS.default} label={t('lab.legendUnexplored')} />
                  <span className="text-ink-faint">{t('lab.legendGolden')}</span>
                </>
              )}
            </div>
          </div>

          {/* 尺寸与种子 */}
          <div className="space-y-2 pt-1 border-t border-edge/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-ink-faint">{t('lab.size')}</label>
              <div className="flex rounded-lg border border-edge/60 bg-sunken p-0.5">
                {SIZES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLabSize(item.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      size === item.key
                        ? 'bg-cyber-accent text-accent-ink'
                        : 'text-ink-dim hover:text-ink'
                    }`}
                  >
                    {t(item.label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-faint">{t('lab.seed')}</label>
                <button
                  type="button"
                  onClick={handleRandomSeed}
                  className="flex items-center gap-1 text-[11px] text-cyber-accent hover:underline"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{t('lab.randomSeed')}</span>
                </button>
              </div>
              <input
                type="text"
                value={seed}
                onChange={(e) => setLabSeed(e.target.value.slice(0, 32))}
                className="h-10 w-full rounded-xl border border-edge/70 bg-sunken/80 px-3.5 text-xs text-ink placeholder:text-ink-faint focus:border-cyber-accent focus:outline-none transition-colors"
              />
              <p className="text-[11px] leading-snug text-ink-faint">
                {t('lab.seedHint')}
              </p>
            </div>
          </div>

          {/* 播放器与时间轴控制器（规范 6.5 节） */}
          <div className="rounded-xl border border-edge/60 bg-sunken/50 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-semibold text-ink-faint">{t('lab.timeline')}</span>
              <span className="shrink-0 whitespace-nowrap font-semibold text-ink tabular-nums">
                {stepIndex} / {totalSteps} ({totalSteps > 0 ? Math.round((stepIndex / totalSteps) * 100) : 0}%)
              </span>
            </div>

            {/* 进度拖动滑条：刻度尺化，当前位置一根 accent 竖线 */}
            <div className="relative flex h-5 items-center">
              <div className="pointer-events-none absolute inset-x-0 flex justify-between px-0.5">
                {[0, 25, 50, 75, 100].map((p) => (
                  <span key={p} className="h-2 w-px bg-edge/50" />
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={totalSteps}
                value={stepIndex}
                onChange={(e) => {
                  setLabIsPlaying(false)
                  setLabStepIndex(Number(e.target.value))
                }}
                className="relative z-10 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-sunken accent-cyber-accent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute z-20 h-3.5 w-[2px] -translate-x-1/2 rounded-full bg-cyber-accent"
                style={{ left: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>

            {/* 播放控制按钮阵列（规范 6.5：播放 h-11 w-11，其余 h-9 w-9，全单色） */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={handleJumpStart}
                title={t('lab.jumpStart')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleStepBack}
                title={t('lab.stepBack')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTogglePlay}
                title={isPlaying ? t('lab.pause') : t('lab.play')}
                className={`flex h-11 w-11 items-center justify-center rounded-xl font-semibold transition-all ${
                  isPlaying
                    ? 'bg-warn text-accent-ink'
                    : 'bg-cyber-accent text-accent-ink hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
              <button
                onClick={handleStepForward}
                title={t('lab.stepForward')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleJumpEnd}
                title={t('lab.jumpEnd')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* 播放速度：单独一行，避免和 5 个传输键挤在同一行被裁切 */}
            <div className="flex items-center justify-between border-t border-edge/30 pt-2">
              <span className="text-[11px] text-ink-faint">{t('lab.speed')}</span>
              <div className="flex rounded-lg border border-edge/40 bg-sunken/60 p-0.5">
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setLabSpeed(sp)}
                    className={`rounded px-2.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
                      speed === sp
                        ? 'bg-cyber-accent text-accent-ink'
                        : 'text-ink-faint hover:text-ink-dim'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 实时统计与算法剖析（规范数据卡规范） */}
          {phase === 'generate' ? (
            <div className="rounded-xl border border-edge/60 bg-sunken/40 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-ink-faint flex items-center justify-between">
                <span>{t('lab.genMetrics')}</span>
                <span>{t('lab.bfsMetric')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">{t('lab.deadEnds')}</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.deadEndCount}
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">{t('lab.treeDiameter')}</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {t('lab.cells', { n: genModel.stats.treeDiameter })}
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">{t('lab.startExit')}</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {t('lab.cells', { n: genModel.stats.startExitPathLength })}
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">{t('lab.roomsEdges')}</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.totalRooms} / {genModel.stats.totalRooms - 1}
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-dim leading-relaxed pt-1">
                {genAlgo === 'dfs' ? t('lab.dfsDesc') : t('lab.primDesc')}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-edge/60 bg-sunken/40 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-ink-faint flex items-center justify-between">
                <span>{t('lab.comparison')}</span>
                <span>{t('lab.startToExit')}</span>
              </div>

              {/* 算法对比表（规范 6.5：选中行 bg-cyber-accent/15，数值 tabular-nums，无彩色杂音） */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-edge/60 text-ink-faint text-[11px]">
                      <th className="py-1">{t('lab.thAlgo')}</th>
                      <th className="py-1 text-center">{t('lab.thExpanded')}</th>
                      <th className="py-1 text-center">{t('lab.thPath')}</th>
                      <th className="py-1 text-right">{t('lab.thRatio')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/40">
                    {solveModel.stats.comparison.map((c) => (
                      <tr
                        key={c.algo}
                        className={
                          c.algo === solveAlgo
                            ? 'bg-cyber-accent/15 font-semibold text-ink'
                            : 'text-ink-dim'
                        }
                        style={
                          c.algo === solveAlgo
                            ? { boxShadow: 'inset 2px 0 0 rgb(var(--accent))' }
                            : undefined
                        }
                      >
                        <td className="py-1.5">{c.name}</td>
                        <td className="py-1.5 text-center tabular-nums">{c.expanded}</td>
                        <td className="py-1.5 text-center tabular-nums">{c.pathLength}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {(c.ratio * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 rounded-lg border border-edge/60 bg-sunken/60 text-xs text-ink-dim leading-relaxed space-y-1">
                <div>
                  {t('lab.samePath')}
                </div>
                <div className="text-ink">
                  {solveAlgo === 'bfs'
                    ? t('lab.bfsNote')
                    : solveAlgo === 'dfs'
                    ? t('lab.dfsNote')
                    : t('lab.astarNote')}
                </div>
                <div className="text-[11px] text-ink-faint">
                  {t('lab.currentExpanded', { algo: solveModel.algo.toUpperCase() })}{' '}
                  <span className="font-semibold text-ink tabular-nums">
                    {t('lab.currentExpandedValue', {
                      n: solveModel.getExpandedCountAt(stepIndex),
                      total: solveModel.stats.expandedCount,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 逐步解说：跟着时间轴实时播报"这一步发生了什么" */}
        <div className="border-t border-edge/40 bg-sunken/30 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-[1px] shrink-0 rounded border border-cyber-accent/30 px-1.5 py-0.5 text-[11px] font-semibold text-cyber-accent">
              {t('lab.narration')}
            </span>
            <p className="text-[11px] leading-relaxed text-ink-dim">{currentNarration}</p>
          </div>
        </div>
      </motion.div>

      {/* 三步讲解：首次进入自动弹出，之后点面板上的"?"重看 */}
      {showGuide && (
        <LabGuide
          onDismiss={() => {
            setLabOnboardingCompleted()
            setShowGuide(false)
          }}
        />
      )}
    </>
  )
}
