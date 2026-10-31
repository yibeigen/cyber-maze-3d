import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Cpu,
  Dices,
  Lock,
  MonitorSmartphone,
  Play,
  SlidersHorizontal,
  Star,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { controller } from '../controller'
import { CAMPAIGN_LEVELS, MazeSize } from '../core/constants'
import { randomSeed } from '../core/rng'
import { VisualTheme } from '../core/themes'
import { chapterName, levelName, themeName, themeShortName, useLang, useT } from '../i18n/store'
import { parseUrlParams, QualitySetting } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { AuthorModal } from './AuthorModal'
import { LangToggle } from './LangToggle'
import { panelMotion, staggerItem, staggerParent } from './motion'

const SIZES: { key: MazeSize; label: 'size.s' | 'size.m' | 'size.l'; desc: string }[] = [
  { key: 's', label: 'size.s', desc: '9×9' },
  { key: 'm', label: 'size.m', desc: '15×15' },
  { key: 'l', label: 'size.l', desc: '21×21' },
]

const THEME_LIST: VisualTheme[] = ['cyber', 'aurora', 'light']
const GHOST =
  'flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs text-ink-dim transition-colors duration-150 hover:bg-surface/60 hover:text-ink'

export function TitleScreen() {
  const t = useT()
  const lang = useLang()
  const size = useGameStore((s) => s.size)
  const setSize = useGameStore((s) => s.setSize)
  const shifting = useGameStore((s) => s.shifting)
  const setShifting = useGameStore((s) => s.setShifting)
  const seedInput = useGameStore((s) => s.seedInput)
  const setSeedInput = useGameStore((s) => s.setSeedInput)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled)
  const quality = useGameStore((s) => s.quality)
  const setQuality = useGameStore((s) => s.setQuality)
  const theme = useGameStore((s) => s.theme)
  const setTheme = useGameStore((s) => s.setTheme)
  const showToast = useGameStore((s) => s.showToast)
  const showTouchControls = useGameStore((s) => s.showTouchControls)
  const toggleTouchControls = useGameStore((s) => s.toggleTouchControls)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const campaign = useGameStore((s) => s.campaign)

  const [selectedLevel, setSelectedLevel] = useState(() => parseUrlParams().level ?? campaign.unlocked)
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [authorModalOpen, setAuthorModalOpen] = useState(false)
  const level = CAMPAIGN_LEVELS[selectedLevel - 1]
  const totalStars = Object.values(campaign.stars).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (authorModalOpen) {
          setAuthorModalOpen(false)
          return
        }
        if (customModalOpen) {
          setCustomModalOpen(false)
          return
        }
      }
      if (e.key !== 'Enter' || e.repeat) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (customModalOpen) {
        handleFreeStart()
      } else {
        controller.startCampaign(selectedLevel)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedLevel, customModalOpen, authorModalOpen, seedInput, size, shifting])

  const handleFreeStart = (e?: FormEvent) => {
    e?.preventDefault()
    setCustomModalOpen(false)
    controller.startRun({ seed: seedInput, size, shifting, mode: 'free' })
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerParent}
      className="absolute inset-0 z-20 select-none overflow-y-auto font-sans text-ink"
    >
      <div className="pointer-events-none fixed inset-0 aurora-veil" />
      <div className="relative flex min-h-full flex-col p-5 md:p-6">
        <div className="pointer-events-auto absolute right-5 top-5 z-20 md:right-6 md:top-6">
          <LangToggle />
        </div>
        <div className="max-w-xl space-y-4 pt-4 md:pt-8">
          <motion.div variants={staggerItem} className="flex items-center gap-3">
            {/* 官方专属 3D 游戏徽标：纯净白底、严丝合缝，与浅色全息界面浑然一体 */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md shadow-sky-500/10 ring-1 ring-black/5">
              <img src="./logo.jpg" alt="CyberMaze 3D Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-edge/50 bg-surface/40 px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest text-ink-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-cyber-accent" />
                {t('title.badge')}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-faint">{t('title.tagline')}</div>
            </div>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className={`font-bold leading-[1.08] tracking-tight text-ink ${
              lang === 'en' ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl'
            }`}
          >
            {t('title.headline')}
            <span className="mt-1 block tracking-[0.04em]">CYBERMAZE 3D</span>
          </motion.h1>
          <motion.p variants={staggerItem} className="max-w-sm text-sm leading-relaxed text-ink-dim">
            {t('title.subtitle')}
          </motion.p>
        </div>

        <div className="mt-auto flex justify-end pt-8">
          <motion.div variants={staggerItem} className="w-full rounded-2xl glass-panel p-5 sm:w-[400px]">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-cyber-accent">
                    {chapterName(lang, level)} · {String(level.id).padStart(2, '0')}/12
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xl font-bold text-ink">{levelName(lang, level)}</span>
                    {/* 主题快捷切换胶囊 */}
                    <div
                      className="inline-flex items-center rounded-lg border border-edge/60 bg-sunken/60 p-0.5"
                      role="radiogroup"
                      aria-label={t('title.themeAria')}
                    >
                      {THEME_LIST.map((tItem) => {
                        const active = theme === tItem
                        const label = themeShortName(lang, tItem)
                        const dotColor = tItem === 'cyber' ? '#22d3ee' : tItem === 'aurora' ? '#c084fc' : '#38bdf8'
                        return (
                          <button
                            key={tItem}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              setTheme(tItem)
                              showToast(t('title.themeSwitchToast', { name: themeName(lang, tItem) }))
                            }}
                            title={t('title.themeSwitchTitle', { name: themeName(lang, tItem) })}
                            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-all ${
                              active
                                ? 'bg-surface text-ink shadow-xs ring-1 ring-edge/80 font-semibold'
                                : 'text-ink-dim hover:text-ink hover:bg-surface/40'
                            }`}
                          >
                            <span
                              className="h-2 w-2 rounded-full transition-transform"
                              style={{
                                backgroundColor: dotColor,
                                boxShadow: active ? `0 0 6px ${dotColor}` : 'none',
                              }}
                            />
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-ink-dim">
                    {level.shifting
                      ? t('title.levelMetaDynamic', { w: level.w, h: level.h, seconds: level.shiftInterval })
                      : t('title.levelMetaStatic', { w: level.w, h: level.h })}
                  </div>
                </div>
                <div className="shrink-0 rounded-xl glass-inset px-2.5 py-2 text-right">
                  <div className="flex items-center gap-1 text-warn">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-sm font-bold tabular-nums">{totalStars}</span>
                    <span className="text-[11px] text-ink-faint">{t('title.starsSuffix')}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-faint">{t('title.unlocked', { n: campaign.unlocked })}</div>
                </div>
              </div>

              <div className="flex items-center justify-between px-0.5 text-[10px] text-ink-faint">
                <span>{t('title.saveNote')}</span>
                <span>{t('title.resetNote')}</span>
              </div>

              <div className="grid grid-cols-6 gap-1.5" aria-label={t('title.levelSelectAria')}>
                {CAMPAIGN_LEVELS.map((item) => {
                  const locked = item.id > campaign.unlocked
                  const stars = campaign.stars[item.id] ?? 0
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedLevel(item.id)}
                      aria-label={
                        locked
                          ? t('title.lockedAria', { n: item.id })
                          : t('title.selectAria', { n: item.id, stars })
                      }
                      className={`relative flex h-9 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                        selectedLevel === item.id
                          ? 'border-cyber-accent bg-cyber-accent/20 text-cyber-accent'
                          : locked
                            ? 'border-edge/20 bg-sunken/30 text-ink-faint opacity-45'
                            : 'border-edge/40 bg-surface/40 text-ink-dim hover:border-edge hover:text-ink'
                      }`}
                    >
                      {locked ? <Lock className="h-3 w-3" /> : item.id}
                      {stars > 0 && <span className="absolute right-1 top-0.5 h-1 w-1 rounded-full bg-warn" />}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => controller.startCampaign(selectedLevel)}
                className={`group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98] ${reducedMotion ? '' : 'anim-glow'}`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {campaign.stars[selectedLevel]
                    ? t('title.playAgain')
                    : selectedLevel === 1
                      ? t('title.playFirst')
                      : t('title.playLevel', { n: selectedLevel })}
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => controller.startDaily()}
                  className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-edge/50 bg-surface/40 px-2 text-xs font-semibold text-ink transition-colors hover:border-edge hover:bg-surface/70"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-cyber-accent" />
                  {t('title.daily')}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(true)}
                  className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-edge/50 bg-surface/40 px-2 text-xs font-semibold text-ink transition-colors hover:border-edge hover:bg-surface/70"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-cyber-accent" />
                  {t('title.custom')}
                </button>
                <button
                  type="button"
                  onClick={() => controller.toLab()}
                  className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-edge/50 bg-surface/40 px-2 text-xs font-semibold text-ink transition-colors hover:border-edge hover:bg-surface/70"
                >
                  <Cpu className="h-3.5 w-3.5 text-ink-dim" />
                  {t('title.lab')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="mt-3 flex flex-wrap items-end justify-between gap-2 pb-1">
          <div className="flex flex-wrap items-center gap-0.5">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={GHOST}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-ink-faint" />}
              <span>{t(soundEnabled ? 'title.soundOn' : 'title.soundOff')}</span>
            </button>
            <button
              onClick={() => {
                const next: QualitySetting = quality === 'auto' ? 'high' : quality === 'high' ? 'low' : 'auto'
                setQuality(next)
              }}
              className={GHOST}
            >
              {t(quality === 'auto' ? 'title.qualityAuto' : quality === 'high' ? 'title.qualityHigh' : 'title.qualityLow')}
            </button>
            <button onClick={toggleTouchControls} className={GHOST}>
              <MonitorSmartphone className="h-4 w-4" />
              <span>{t(showTouchControls ? 'title.touchOn' : 'title.touchOff')}</span>
            </button>
            <button
              onClick={() => setAuthorModalOpen(true)}
              className={GHOST}
              title={t('title.authorTitle')}
            >
              <User className="h-4 w-4 text-cyber-accent" />
              <span>{t('title.author')}</span>
            </button>
          </div>
          <div className="pb-1.5 text-[11px] text-ink-faint">{t('title.version')}</div>
        </motion.div>
      </div>

      {/* 自由定制专属设置弹窗 */}
      <AnimatePresence>
        {customModalOpen && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex select-none items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              {...panelMotion}
              className="relative max-h-[calc(100vh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl glass-panel p-6 shadow-2xl scrollbar-thin"
            >
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between border-b border-edge/40 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-ink">{t('title.customTitle')}</h2>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{t('title.customDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
                  aria-label={t('title.customModalAria')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 迷宫规模选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-dim">{t('title.mazeSize')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSize(item.key)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        size === item.key
                          ? 'border-cyber-accent bg-cyber-accent/15 text-cyber-accent shadow-sm'
                          : 'border-edge/50 bg-sunken/40 text-ink-dim hover:border-edge hover:text-ink'
                      }`}
                    >
                      <span className="text-sm font-bold">{t(item.label)}</span>
                      <span className="mt-0.5 text-[11px] opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 动力学重构开关 */}
              <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-ink">{t('title.shiftingTitle')}</div>
                  <div className="text-[11px] text-ink-faint">{t('title.shiftingDesc')}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shifting}
                  onClick={() => setShifting(!shifting)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    shifting ? 'bg-cyber-accent' : 'bg-edge/60'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      shifting ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 迷宫种子 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-dim">{t('title.seed')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value.slice(0, 32))}
                    placeholder={t('title.seedPlaceholder')}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-edge/50 bg-sunken/60 px-3 font-mono text-xs text-ink outline-none placeholder:text-ink-faint focus:border-cyber-accent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const seed = randomSeed()
                      setSeedInput(seed)
                      showToast(t('title.seedRandomToast', { seed }))
                    }}
                    title={t('title.seedRandomTitle')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-edge/50 bg-surface/50 text-ink-dim hover:border-edge hover:text-ink"
                  >
                    <Dices className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 视觉主题预设 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-dim">{t('title.themeLabel')}</label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-edge/40 bg-sunken/40 p-1">
                  {THEME_LIST.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTheme(item)}
                      className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        theme === item
                          ? 'bg-cyber-accent text-accent-ink shadow-sm'
                          : 'text-ink-dim hover:text-ink'
                      }`}
                    >
                      {theme === item && <Check className="h-3 w-3" />}
                      {themeName(lang, item)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 主操作按钮 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFreeStart}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{t('title.startCustom')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 关于作者与开发生态弹窗 */}
      <AnimatePresence>
        {authorModalOpen && (
          <AuthorModal isOpen={authorModalOpen} onClose={() => setAuthorModalOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
