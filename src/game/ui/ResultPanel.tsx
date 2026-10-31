import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  Download,
  Palette,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { controller } from '../controller'
import { solve } from '../core/solve'
import { MazeSize } from '../core/constants'
import { THEMES, VisualTheme } from '../core/themes'
import { levelName, themeName, useLang, useT } from '../i18n/store'
import { buildShareUrl, copyToClipboard } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { MazeMiniMap } from './MazeMiniMap'
import { panelMotion } from './motion'
import { generateShareCard } from './shareCard'

const SIZE_LABELS: Record<MazeSize, string> = {
  s: '9×9',
  m: '15×15',
  l: '21×21',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
}

const GRADE_COLORS: Record<string, string> = {
  S: '#f59e0b',
  A: '#10b981',
  B: '#0ea5e9',
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-[11px] text-ink-faint">{label}</span>
      <span className="text-lg font-semibold leading-none text-ink tabular-nums">
        {value}
      </span>
    </div>
  )
}

export function ResultPanel() {
  const t = useT()
  const lang = useLang()
  const lastResult = useGameStore((s) => s.lastResult)
  const bestTimeMs = useGameStore((s) => s.bestTimeMs)
  const activeSeed = useGameStore((s) => s.activeSeed)
  const size = useGameStore((s) => s.size)
  const shifting = useGameStore((s) => s.shifting)
  const themeKey = useGameStore((s) => s.theme)
  const setTheme = useGameStore((s) => s.setTheme)
  const showToast = useGameStore((s) => s.showToast)
  const activeLevel = useGameStore((s) => s.activeLevel)
  const reducedMotion = useGameStore((s) => s.reducedMotion)

  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [replayToken, setReplayToken] = useState(0)

  const engine = controller.getEngine()
  const maze = engine?.maze ?? null
  const playerPath = engine?.visitedHistory ?? null

  // 动态关的真实轨迹是当前最终地图上的历史投影
  const optimalPath = useMemo(() => {
    if (!maze) return null
    const res = solve('astar', maze, maze.start, maze.exit, (e) => maze.open[e] === 1)
    return res.path
  }, [maze])

  if (!lastResult) return null

  const optimal = lastResult.optimalMoves
  const hasOptimal = optimal > 0
  const extra = hasOptimal ? Math.max(0, lastResult.moves - optimal) : 0
  const ratio = hasOptimal && lastResult.moves > 0 ? optimal / lastResult.moves : 0
  const grade = !hasOptimal ? null : ratio >= 0.95 ? 'S' : ratio >= 0.8 ? 'A' : ratio >= 0.62 ? 'B' : 'C'
  const gradeColor = grade ? GRADE_COLORS[grade] ?? 'rgb(var(--ink-dim))' : ''
  // 亮主题下 24px 同色光晕会糊成一团灰雾，只保留颜色不加发光
  const gradeGlow = THEMES[themeKey]?.id === 'light' || grade === 'C' ? 'none' : '0 0 24px currentColor'
  const levelTitle = activeLevel
    ? t('hud.taskLevelTitle', { n: activeLevel.id, name: levelName(lang, activeLevel) })
    : ''

  const handleCycleTheme = () => {
    const list: VisualTheme[] = ['cyber', 'aurora', 'light']
    const next = list[(list.indexOf(themeKey) + 1) % list.length]
    setTheme(next)
    showToast(t('result.themeToast', { name: themeName(lang, next) }), 'info')
  }

  const handleShareLink = async () => {
    const url = buildShareUrl(size, shifting, activeSeed, activeLevel?.id)
    const text = t('share.resultLine', {
      size: maze ? `${maze.w}×${maze.h}` : SIZE_LABELS[size],
      time: formatTime(lastResult.elapsed),
      grade: grade ? t('share.grade', { grade }) : '',
      flavor: t(shifting ? 'share.flavorShifting' : 'share.flavorStatic'),
      url,
    })
    const ok = await copyToClipboard(text)
    if (ok) {
      showToast(t('result.shareCopied'), 'success')
    } else {
      showToast(t('hud.copyFail'), 'warn')
    }
  }

  const handleGenerateCard = async () => {
    try {
      setGeneratingCard(true)
      const url = await generateShareCard({
        timeStr: formatTime(lastResult.elapsed),
        moves: lastResult.moves,
        optimalMoves: optimal,
        extraMoves: extra,
        shiftsDone: lastResult.shiftsDone,
        scansUsed: lastResult.scansUsed,
        grade,
        seed: activeSeed,
        size,
        shifting,
        isNewRecord: lastResult.isNewRecord,
        maze,
        path: optimalPath,
        playerPath,
        levelText: activeLevel ? levelTitle : undefined,
        stars: lastResult.stars,
        theme: themeKey,
        lang,
      })
      setShareCardUrl(url)
    } catch (err) {
      console.error('[shareCard] 生成失败', err)
      showToast(t('result.cardFailed'), 'warn')
    } finally {
      setGeneratingCard(false)
    }
  }

  const handleDownloadCard = () => {
    if (!shareCardUrl) return
    const a = document.createElement('a')
    a.href = shareCardUrl
    a.download = `CyberLabyrinth-${activeSeed}-${grade || 'Score'}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast(t('result.cardSaved'), 'success')
  }

  return (
    <>
      <div className="pointer-events-auto absolute inset-0 z-50 flex select-none items-center justify-center overflow-y-auto p-4">
        <div className="pointer-events-none absolute inset-0 aurora-mask" />

        <motion.div
          {...panelMotion}
          className="relative max-h-[calc(100vh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl glass-panel p-5 scrollbar-thin"
        >
          {/* 头部：新纪录 + 标题 */}
          <div className="relative space-y-1 text-center">
            {/* 主题切换：暗色/亮色当场切换，不用退回标题页 */}
            <button
              onClick={handleCycleTheme}
              title={t('result.themeSwitchTitle', { name: themeName(lang, themeKey) })}
              aria-label={t('result.themeSwitchAria')}
              className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors duration-150 hover:bg-surface/60 hover:text-ink"
            >
              <Palette className="w-4 h-4" />
            </button>
            {lastResult.isNewRecord && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-warn">
                <Award className="w-4 h-4" />
                <span>{t('result.newRecord')}</span>
              </div>
            )}
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              {activeLevel ? levelTitle : t('result.titleWin')}
            </h2>
            {activeLevel && (
              <div className="flex items-center justify-center gap-1 pt-1" aria-label={t('result.starsAria', { n: lastResult.stars ?? 0 })}>
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= (lastResult.stars ?? 0) ? 'fill-current text-warn' : 'text-edge'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 英雄区：迷宫缩略图 + 评级与图例 */}
          <div className="flex items-stretch gap-3">
            <div className="h-[184px] w-[184px] shrink-0 overflow-hidden rounded-xl glass-inset p-1">
              {maze ? (
                <MazeMiniMap maze={maze} path={optimalPath} playerPath={playerPath} replayToken={replayToken} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-ink-faint">
                  {t('result.noMaze')}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {grade && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl glass-inset py-1">
                  <div
                    className="text-[56px] font-bold leading-none"
                    style={{ color: gradeColor, textShadow: gradeGlow }}
                  >
                    {grade}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-faint">{t('result.efficiency')}</div>
                </div>
              )}

              <div className="space-y-1 rounded-xl glass-inset px-2.5 py-2 text-[11px] leading-tight text-ink-dim">
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 shrink-0 bg-cyber-accent" />
                  {hasOptimal ? t('result.optimal', { n: optimal }) : t('result.optimalUnknown')}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 shrink-0 border-t border-dashed border-[#f472b6]" />
                  <span className="min-w-0 truncate">
                    {t('result.realPath', { state: extra === 0 ? t('result.noDetour') : t('result.extra', { n: extra }) })}
                  </span>
                  {!reducedMotion && playerPath && playerPath.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setReplayToken((n) => n + 1)}
                      title={t('result.replayTitle')}
                      aria-label={t('result.replayTitle')}
                      className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] text-ink-faint transition-colors hover:bg-surface/70 hover:text-ink active:scale-95"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t('result.replay')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 图论承诺 */}
          <div className="text-center text-[11px] leading-relaxed text-ink-faint">
            ── {t(shifting ? 'result.promiseShifting' : 'result.promiseStatic')} ──
          </div>

          {/* 数据带 */}
          <div className="grid grid-cols-4 divide-x divide-edge/30 rounded-xl glass-inset py-2.5">
            <StatItem label={t('result.statTime')} value={formatTime(lastResult.elapsed)} />
            <StatItem label={t('result.statMoves')} value={`${lastResult.moves}`} />
            <StatItem label={t('result.statShifts')} value={`${lastResult.shiftsDone}`} />
            <StatItem label={t('result.statScans')} value={`${lastResult.scansUsed}`} />
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-ink-dim">
            <span>{t(hasOptimal ? 'result.invariant' : 'result.noOptimal')}</span>
            <span className="tabular-nums">
              {t('result.bestSeed', { time: bestTimeMs ? formatTime(bestTimeMs / 1000) : '--:--.-' })}
            </span>
          </div>

          {/* 按钮：Primary / Secondary / Ghost */}
          <div className="space-y-2 pt-0.5">
            {activeLevel && activeLevel.id < 12 && (
              <button
                onClick={() => controller.nextLevel()}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
              >
                <span>{t('result.nextLevel', { n: activeLevel.id + 1 })}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {activeLevel?.id === 12 && (
              <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-center text-sm font-semibold text-warn">
                {t('result.allDone')}
              </div>
            )}
            <button
              onClick={handleGenerateCard}
              disabled={generatingCard}
              className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${activeLevel ? 'border border-edge/60 bg-surface/40 text-ink hover:bg-surface/70' : 'bg-cyber-accent text-accent-ink hover:brightness-110'}`}
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{t(generatingCard ? 'result.generating' : 'result.saveCard')}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => controller.restart()}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-edge/60 bg-surface/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-edge hover:bg-surface/70 active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('result.again')}</span>
              </button>

              <button
                onClick={() => controller.newMaze()}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-edge/60 bg-surface/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-edge hover:bg-surface/70 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('result.newMaze')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1 pt-0.5">
              <button
                onClick={handleShareLink}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs text-ink-dim transition-colors duration-150 hover:bg-surface/60 hover:text-ink"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('result.copyChallenge')}</span>
              </button>
              <button
                onClick={() => controller.toMenu()}
                className="min-h-[36px] rounded-lg px-2 text-xs text-ink-dim transition-colors duration-150 hover:bg-surface/60 hover:text-ink"
              >
                {t('common.returnMenu')}
              </button>
            </div>

            {/* 底部作者版权微标 */}
            <div className="pt-2 text-center text-[10px] text-ink-faint">
              {t('result.footer')}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 战报长图海报弹窗 */}
      <AnimatePresence>
        {shareCardUrl && (
          <div className="pointer-events-auto fixed inset-0 z-[100] flex select-none items-center justify-center p-4">
            <div className="pointer-events-none absolute inset-0 aurora-mask" />
            <motion.div
              {...panelMotion}
              className="relative flex max-h-[92vh] w-full max-w-sm flex-col items-center space-y-3 rounded-2xl glass-panel p-5"
            >
              <button
                onClick={() => setShareCardUrl(null)}
                className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-0.5 text-center">
                <div className="text-sm font-semibold text-ink">{t('result.cardReady')}</div>
                <div className="text-[11px] text-ink-dim">{t('result.cardHint')}</div>
              </div>

              <div className="flex max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl border border-edge/40 bg-black/30">
                <img
                  src={shareCardUrl}
                  alt={t('result.cardAlt')}
                  className="pointer-events-auto h-auto max-h-[60vh] w-full select-auto object-contain"
                />
              </div>

              <div className="flex w-full gap-2 pt-1">
                <button
                  onClick={handleDownloadCard}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-cyber-accent px-4 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('result.download')}</span>
                </button>
                <button
                  onClick={() => setShareCardUrl(null)}
                  className="min-h-[44px] rounded-xl border border-edge/60 bg-surface/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface/70"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
