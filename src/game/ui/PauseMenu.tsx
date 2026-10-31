import { motion, AnimatePresence } from 'framer-motion'
import { Play, RefreshCw, RotateCcw, User, X } from 'lucide-react'
import { useState } from 'react'
import { controller } from '../controller'
import { mazeFingerprint } from '../core/rng'
import { VisualTheme } from '../core/themes'
import { themeName, useLang, useT } from '../i18n/store'
import { QualitySetting } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { AuthorModal } from './AuthorModal'
import { LangToggle } from './LangToggle'
import { panelMotion } from './motion'

const KEY_CAP =
  'rounded-md border border-edge/50 bg-sunken/70 px-2 py-0.5 font-mono text-[11px] text-ink tabular-nums'

export function PauseMenu() {
  const t = useT()
  const lang = useLang()
  const [authorModalOpen, setAuthorModalOpen] = useState(false)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled)
  const quality = useGameStore((s) => s.quality)
  const setQuality = useGameStore((s) => s.setQuality)
  const theme = useGameStore((s) => s.theme)
  const setTheme = useGameStore((s) => s.setTheme)
  const activeSeed = useGameStore((s) => s.activeSeed)
  const showTouchControls = useGameStore((s) => s.showTouchControls)
  const toggleTouchControls = useGameStore((s) => s.toggleTouchControls)
  const cameraMode = useGameStore((s) => s.cameraMode)

  const engine = controller.getEngine()
  const fingerprint = engine ? mazeFingerprint(engine.maze.open) : '------'

  const handleResume = () => {
    engine?.resume()
  }

  const handleRestart = () => {
    controller.restart()
  }

  const handleNewMaze = () => {
    controller.newMaze()
  }

  const handleReturnMenu = () => {
    controller.toMenu()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex select-none items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 aurora-mask" />

      <motion.div
        {...panelMotion}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-md space-y-5 overflow-y-auto rounded-2xl glass-panel p-6 scrollbar-thin"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-edge/40 pb-3">
          <div>
            <h2 className="text-xl font-bold text-ink">{t('pause.title')}</h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">{t('pause.subtitle')}</p>
          </div>
          <button
            onClick={handleResume}
            className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
            aria-label={t('pause.resumeAria')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 种子与指纹 */}
        <div className="flex items-center justify-between px-1 font-mono text-[11px] text-ink-faint tabular-nums">
          <span>{t('pause.seed', { seed: activeSeed })}</span>
          <span>{t('pause.fingerprint', { fp: fingerprint })}</span>
        </div>

        {/* 主操作 */}
        <div className="space-y-2">
          <button
            onClick={handleResume}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t('pause.resume')}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRestart}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-edge/60 bg-surface/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-edge hover:bg-surface/70 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('pause.restart')}</span>
            </button>

            <button
              onClick={handleNewMaze}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-edge/60 bg-surface/40 px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-edge hover:bg-surface/70 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('pause.newMaze')}</span>
            </button>
          </div>

          <button
            onClick={handleReturnMenu}
            className="min-h-[36px] w-full rounded-lg px-3 pt-1 text-center text-xs text-ink-dim transition-colors duration-150 hover:bg-surface/60 hover:text-ink"
          >
            {t('common.returnMenu')}
          </button>
        </div>

        {/* 设置区 */}
        <div className="space-y-3 border-t border-edge/40 pt-4">
          <div className="text-[11px] font-semibold text-ink-faint">{t('pause.settings')}</div>

          <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-2.5">
            <span className="text-xs text-ink-dim">{t('pause.touch')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={showTouchControls}
              onClick={toggleTouchControls}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${showTouchControls ? 'bg-cyber-accent' : 'bg-edge'
                }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${showTouchControls ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-2.5">
            <span className="text-xs text-ink-dim">{t('pause.sound')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${soundEnabled ? 'bg-cyber-accent' : 'bg-edge'
                }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-2">
            <span className="text-xs text-ink-dim">{t('pause.quality')}</span>
            <div className="flex rounded-lg border border-edge/40 bg-sunken/60 p-0.5">
              {(['auto', 'high', 'low'] as QualitySetting[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${quality === q ? 'bg-cyber-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
                    }`}
                >
                  {t(q === 'auto' ? 'common.auto' : q === 'high' ? 'common.high' : 'common.low')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-2">
            <span className="text-xs text-ink-dim">{t('pause.theme')}</span>
            <div className="flex rounded-lg border border-edge/40 bg-sunken/60 p-0.5">
              {(['cyber', 'aurora', 'light'] as VisualTheme[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTheme(item)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${theme === item ? 'bg-cyber-accent text-accent-ink' : 'text-ink-dim hover:text-ink'
                    }`}
                >
                  {themeName(lang, item)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-inset px-4 py-2">
            <span className="text-xs text-ink-dim">{t('pause.language')}</span>
            <LangToggle />
          </div>
        </div>

        {/* 操作速查 */}
        <div className="space-y-2 border-t border-edge/40 pt-3">
          <div className="text-[11px] font-semibold text-ink-faint">{t('pause.controls')}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            {[
              ...(cameraMode === 'first'
                ? [
                  [t('pause.forwardBack'), 'W / S'],
                  [t('pause.turn'), 'A / D'],
                  [t('pause.strafe'), 'Q / E'],
                ]
                : [
                  [t('pause.move'), 'WASD'],
                  [t('pause.rotateView'), 'Q / E'],
                ]),
              [t('pause.toggleView'), 'V'],
              [t('pause.survey'), t('key.space')],
              [t('pause.scan'), 'F'],
              [t('pause.forceShift'), 'G'],
              [t('pause.restartKey'), 'R'],
              [t('pause.cinematic'), 'H'],
              [t('pause.newMazeKey'), 'N'],
            ].map(([label, key]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-ink-dim">{label}</span>
                <kbd className={KEY_CAP}>{key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* 页脚作者署名 */}
        <div className="border-t border-edge/30 pt-3 text-center">
          <button
            type="button"
            onClick={() => setAuthorModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-ink-dim transition-colors hover:text-cyber-accent"
          >
            <span>CyberMaze 3D · {t('title.headline')}</span>
            <span className="text-edge">|</span>
            <span className="underline underline-offset-2">{t('pause.author')}</span>
          </button>
        </div>
      </motion.div>

      {/* 关于作者弹窗 */}
      <AnimatePresence>
        {authorModalOpen && (
          <AuthorModal isOpen={authorModalOpen} onClose={() => setAuthorModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
