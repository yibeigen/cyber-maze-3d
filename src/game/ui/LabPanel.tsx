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

const SIZES: { key: MazeSize; label: string; desc: string }[] = [
  { key: 's', label: '小', desc: '9×9' },
  { key: 'm', label: '中', desc: '15×15' },
  { key: 'l', label: '大', desc: '21×21' },
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
    return createLabSolveModel(w, h, solveAlgo, genModel.open, genModel.start, genModel.exit)
  }, [w, h, solveAlgo, genModel])

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
      ? describeGenStep(genModel, stepIndex)
      : describeSolveStep(solveModel, stepIndex)
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
          <span>{mobileOpen ? '收起控制台' : '算法实验室'}</span>
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
                算法实验室
              </h2>
              <p className="text-[11px] text-ink-dim">
                看迷宫怎么生成、AI 怎么找路——可播放可单步
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuide(true)}
              title="使用讲解"
              aria-label="使用讲解"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge/40 bg-sunken/60 text-ink-dim transition-colors hover:text-ink"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => controller.toMenu()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge/60 bg-sunken text-xs text-ink-dim hover:text-ink hover:border-edge transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回</span>
            </button>
          </div>
        </div>

        {/* 滚动内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* 阶段切换（分段控件规范） */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ink-faint">实验阶段</label>
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
                <span>迷宫生成</span>
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
                <span>寻路求解</span>
              </button>
            </div>
          </div>

          {/* 算法选择器（分段控件规范） */}
          {phase === 'generate' ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-faint">生成算法</label>
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
                  DFS 深度优先
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
                  Prim 随机生成
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-faint">求解算法</label>
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
              画面图例（看 3D 场景的地砖颜色）
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-ink-dim">
              {phase === 'generate' ? (
                <>
                  <LegendSwatch color={LAB_TILE_COLORS.active} label="正在处理的格" />
                  <LegendSwatch color={LAB_TILE_COLORS.frontier} label="候选" />
                  <LegendSwatch color={LAB_TILE_COLORS.visited} label="已经到过" />
                  <LegendSwatch color={LAB_TILE_COLORS.default} label="还没去过" />
                  <span className="text-ink-faint">墙降下去 = 通道已打通</span>
                </>
              ) : (
                <>
                  <LegendSwatch color={LAB_TILE_COLORS.path} label="最短路线" />
                  <LegendSwatch color={LAB_TILE_COLORS.frontier} label="待处理" />
                  <LegendSwatch color={LAB_TILE_COLORS.expanded} label="已经展开" />
                  <LegendSwatch color={LAB_TILE_COLORS.default} label="还没探索" />
                  <span className="text-ink-faint">金色光轨 = 找到的路</span>
                </>
              )}
            </div>
          </div>

          {/* 尺寸与种子 */}
          <div className="space-y-2 pt-1 border-t border-edge/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-ink-faint">迷宫尺寸</label>
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
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-faint">种子</label>
                <button
                  type="button"
                  onClick={handleRandomSeed}
                  className="flex items-center gap-1 text-[11px] text-cyber-accent hover:underline"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>随机种子</span>
                </button>
              </div>
              <input
                type="text"
                value={seed}
                onChange={(e) => setLabSeed(e.target.value.slice(0, 32))}
                className="h-10 w-full rounded-xl border border-edge/70 bg-sunken/80 px-3.5 text-xs text-ink placeholder:text-ink-faint focus:border-cyber-accent focus:outline-none transition-colors"
              />
              <p className="text-[11px] leading-snug text-ink-faint">
                同一串种子 = 同一张迷宫 · 换种子就换一张图拆
              </p>
            </div>
          </div>

          {/* 播放器与时间轴控制器（规范 6.5 节） */}
          <div className="rounded-xl border border-edge/60 bg-sunken/50 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-semibold text-ink-faint">时间轴步进</span>
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
                title="回到开头"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleStepBack}
                title="后退一步"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTogglePlay}
                title={isPlaying ? '暂停' : '播放'}
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
                title="前进一步"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleJumpEnd}
                title="跳到末尾"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge/40 bg-surface/40 text-ink-dim transition-colors hover:text-ink"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* 播放速度：单独一行，避免和 5 个传输键挤在同一行被裁切 */}
            <div className="flex items-center justify-between border-t border-edge/30 pt-2">
              <span className="text-[11px] text-ink-faint">播放速度</span>
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
                <span>生成树图论指标</span>
                <span>双向 BFS 度量</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">死胡同数量 (度=1)</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.deadEndCount}
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">树直径 (最长路径)</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.treeDiameter} 格
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">起点到出口距离</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.startExitPathLength} 格
                  </div>
                </div>
                <div className="p-2 bg-surface/60 rounded-lg border border-edge/60">
                  <div className="text-ink-faint text-[11px]">房间数 / 边数</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {genModel.stats.totalRooms} / {genModel.stats.totalRooms - 1}
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-dim leading-relaxed pt-1">
                {genAlgo === 'dfs'
                  ? 'DFS 回溯特性：分支较少、路径深邃曲折且树直径较大，适合产生迷宫长走廊。'
                  : 'Prim 算法特性：生成细小分叉与大量死胡同，树直径较小，分支呈放射状簇拥。'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-edge/60 bg-sunken/40 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-ink-faint flex items-center justify-between">
                <span>三算法全局对比</span>
                <span>起点 → 出口</span>
              </div>

              {/* 算法对比表（规范 6.5：选中行 bg-cyber-accent/15，数值 tabular-nums，无彩色杂音） */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-edge/60 text-ink-faint text-[11px]">
                      <th className="py-1">算法</th>
                      <th className="py-1 text-center">展开节点</th>
                      <th className="py-1 text-center">路径长</th>
                      <th className="py-1 text-right">探索率</th>
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
                  在完美迷宫中三种算法找到同一条路径，区别在于搜索了多少格子。
                </div>
                <div className="text-ink">
                  {solveAlgo === 'bfs'
                    ? 'BFS：像水波一圈圈扩散，最先碰到终点，路必然最短。'
                    : solveAlgo === 'dfs'
                    ? 'DFS：一条道走到黑，撞墙才回头——常常绕远。'
                    : 'A*：朝着终点方向优先探索，少走冤枉路。'}
                </div>
                <div className="text-[11px] text-ink-faint">
                  当前 {solveModel.algo.toUpperCase()} 展开:{' '}
                  <span className="font-semibold text-ink tabular-nums">
                    {solveModel.getExpandedCountAt(stepIndex)} / {solveModel.stats.expandedCount}
                  </span>{' '}
                  格
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 逐步解说：跟着时间轴实时播报"这一步发生了什么" */}
        <div className="border-t border-edge/40 bg-sunken/30 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-[1px] shrink-0 rounded border border-cyber-accent/30 px-1.5 py-0.5 text-[11px] font-semibold text-cyber-accent">
              逐步解说
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
