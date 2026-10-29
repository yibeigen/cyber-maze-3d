import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { controller } from '../controller'
import { useKeyboardInput } from '../input/useKeyboardInput'
import { useSwipeInput } from '../input/useSwipeInput'
import { GameCanvas } from '../scene/GameCanvas'
import { GameScene } from '../scene/GameScene'
import { TitleScene } from '../scene/TitleScene'
import { hasCompletedOnboarding } from '../state/persistence'
import { useGameStore } from '../state/useGameStore'
import { HUD } from './HUD'
import { Onboarding } from './Onboarding'
import { PauseMenu } from './PauseMenu'
import { ResultPanel } from './ResultPanel'
import { TitleScreen } from './TitleScreen'

// 阶段 5 优化项：实验室模式懒加载拆分，减小首屏包体积
const LabScene = lazy(() =>
  import('../scene/LabScene').then((m) => ({ default: m.LabScene }))
)
const LabPanel = lazy(() =>
  import('./LabPanel').then((m) => ({ default: m.LabPanel }))
)

export function LabyrinthApp() {
  // 挂载全局键盘与触控滑动手势侦听
  useKeyboardInput()
  useSwipeInput()

  const currentPage = useGameStore((s) => s.currentPage)
  const runId = useGameStore((s) => s.runId)
  const phase = useGameStore((s) => s.phase)
  const toast = useGameStore((s) => s.toast)
  const theme = useGameStore((s) => s.theme)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const cinematic = useGameStore((s) => s.cinematic)
  const toggleCinematic = useGameStore((s) => s.toggleCinematic)
  const mode = useGameStore((s) => s.mode)

  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding())
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    setShowResult(false)
    if (phase !== 'won') return
    const timer = setTimeout(() => setShowResult(true), reducedMotion ? 250 : 850)
    return () => clearTimeout(timer)
  }, [phase, runId, reducedMotion])

  const engine = controller.getEngine()

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <div
        data-theme={theme}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        className="relative w-screen h-screen overflow-hidden bg-cyber-dark select-none touch-none font-sans"
      >
      {/* 3D WebGL 画布层 */}
      <GameCanvas>
        {currentPage === 'title' && <TitleScene />}
        {currentPage === 'game' && engine && <GameScene key={runId} engine={engine} />}
        {currentPage === 'lab' && (
          <Suspense fallback={null}>
            <LabScene />
          </Suspense>
        )}
      </GameCanvas>

      {/* 2D 全息 UI 覆盖层 */}
      <AnimatePresence>
        {currentPage === 'title' && <TitleScreen key="title" />}

        {currentPage === 'lab' && (
          <Suspense fallback={null}>
            <LabPanel key="lab" />
          </Suspense>
        )}

        {currentPage === 'game' && (
          <div key="game-ui" className="absolute inset-0 pointer-events-none">
            {/* 电影模式：只留 3D 场景，HUD 整层不渲染 */}
            {!cinematic && <HUD />}
            {cinematic && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.85, 0.85, 0.2] }}
                  transition={{ duration: 5, times: [0, 0.12, 0.72, 1] }}
                  className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full glass-panel px-3 py-1 text-[11px] text-ink-dim"
                >
                  电影模式 · 按 H 退出
                </motion.div>
                <button
                  onClick={toggleCinematic}
                  title="退出电影模式 (H)"
                  aria-label="退出电影模式"
                  className="pointer-events-auto absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg glass-panel text-ink-dim opacity-25 transition-opacity hover:opacity-100"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </>
            )}
            {!cinematic && phase === 'revealing' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-1 rounded-2xl glass-panel px-5 py-3 text-center"
                >
                  <div className="text-sm font-bold text-ink">正在构建迷宫拓扑</div>
                  <div className="text-[11px] text-cyber-accent">轻触屏幕或按任意键跳过</div>
                </motion.div>
              </div>
            )}
            <AnimatePresence>
              {phase === 'paused' && <PauseMenu key="pause" />}
            </AnimatePresence>
            <AnimatePresence>
              {phase === 'won' && showResult && <ResultPanel key="result" />}
            </AnimatePresence>
            <AnimatePresence>
              {showOnboarding && mode === 'free' && phase !== 'won' && phase !== 'error' && !cinematic && (
                <Onboarding key="onboarding" onDismiss={() => setShowOnboarding(false)} />
              )}
            </AnimatePresence>
            {phase === 'error' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
                <div className="absolute inset-0 aurora-mask" />
                <div className="relative w-full max-w-sm space-y-4 rounded-2xl glass-panel p-6 text-center">
                  <div className="text-lg font-bold text-warn">引擎异常</div>
                  <p className="text-xs leading-relaxed text-ink-dim">
                    渲染循环里出现未捕获的错误，本局已停止。可以重开一局，或返回主菜单。
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => controller.restart()}
                      className="flex-1 flex min-h-[44px] items-center justify-center rounded-xl bg-cyber-accent px-4 text-sm font-semibold text-accent-ink hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      重新开始
                    </button>
                    <button
                      onClick={() => controller.toMenu()}
                      className="flex-1 flex min-h-[44px] items-center justify-center rounded-xl border border-edge bg-surface/60 px-4 text-sm font-semibold text-ink hover:bg-surface active:scale-[0.98] transition-colors"
                    >
                      返回主菜单
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* 全局消息气泡 Toast（规范 5.0 节）：三类语义边框，材质随主题 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-[80vw] px-4 py-2 rounded-xl glass-panel text-xs font-medium shadow-2xl pointer-events-none truncate ${
              toast.type === 'warn'
                ? 'border-warn/60 text-warn'
                : toast.type === 'success'
                ? 'border-ok/60 text-ok'
                : 'border-cyber-accent/60 text-cyber-accent'
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
