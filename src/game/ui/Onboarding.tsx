import { motion } from 'framer-motion'
import { ArrowRight, Check, Radar, Sparkles, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { setOnboardingCompleted } from '../state/persistence'
import { panelMotion } from './motion'

interface OnboardingProps {
  onDismiss: () => void
}

interface Point {
  tag: string
  text: string
  /** 预警色条：与场景内 4Hz 琥珀 / 8Hz 翡翠脉冲同频 */
  tone?: 'warn' | 'ok'
}

interface Step {
  icon: typeof Zap
  iconColor: string
  title: string
  subtitle: string
  desc: string
  points: Point[]
}

const STEPS: Step[] = [
  {
    icon: Zap,
    iconColor: 'text-warn',
    title: '动力学重排 · 双色预警',
    subtitle: '阶段 1 / 3',
    desc: '迷宫机械墙每约 15 秒重新排布一次。注意墙体顶部的脉冲预警：',
    points: [
      { tag: '琥珀脉冲', text: '即将升起封路，请提前绕开', tone: 'warn' },
      { tag: '翡翠闪烁', text: '即将降下开通新路，可顺势前进', tone: 'ok' },
    ],
  },
  {
    icon: Radar,
    iconColor: 'text-cyber-accent',
    title: '全息扫描 · 最优寻路',
    subtitle: '阶段 2 / 3',
    desc: '迷路或遭遇封堵时，点右下角扫描按钮（或按 F 键）召唤算法助手：',
    points: [
      { tag: '全息光轨', text: 'A* 启发式展开，实时标出当前最优逃生路线' },
      { tag: '俯瞰全景', text: '按住空格或俯瞰按钮，拉升至天眼视角看全图' },
    ],
  },
  {
    icon: Sparkles,
    iconColor: 'text-cyber-accent',
    title: '信标目标 · 数学保证',
    subtitle: '阶段 3 / 3',
    desc: '避开机械墙，以最少步数与最短时间抵达粉色发光信标：',
    points: [
      { tag: '图论不变量', text: '生成树边置换，每次重构都严格保证起点到终点连通' },
      { tag: '永有出路', text: '墙怎么动，A* 就怎么算——解永远在' },
    ],
  },
]

export function Onboarding({ onDismiss }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setOnboardingCompleted()
    onDismiss()
  }

  const step = STEPS[currentStep]
  const IconComponent = step.icon

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex select-none items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 aurora-mask" />

      <motion.div
        key={currentStep}
        {...panelMotion}
        className="relative w-full max-w-md space-y-5 rounded-2xl glass-panel p-6"
      >
        {/* 顶部 */}
        <div className="flex items-center justify-between border-b border-edge/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-edge/40 bg-sunken/60 p-2">
              <IconComponent className={`w-5 h-5 ${step.iconColor}`} />
            </div>
            <div>
              <div className="text-[11px] text-ink-faint">{step.subtitle}</div>
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
            title="跳过引导"
            aria-label="跳过引导"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 正文 */}
        <div className="space-y-3.5">
          <p className="text-xs leading-relaxed text-ink-dim">{step.desc}</p>
          <div className="space-y-2">
            {step.points.map((pt) => (
              <div
                key={pt.tag}
                className="flex items-start gap-2.5 rounded-xl border border-edge/35 bg-sunken/50 p-2.5 text-xs"
              >
                {pt.tone && (
                  <span
                    aria-hidden
                    className={`mt-1 h-2 w-10 shrink-0 rounded-full ${
                      pt.tone === 'warn' ? 'bg-warn pulse-warn' : 'bg-ok pulse-ok'
                    }`}
                  />
                )}
                <span className="whitespace-nowrap font-semibold text-ink">{pt.tag}</span>
                <span className="leading-snug text-ink-dim">{pt.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-cyber-accent'
                    : idx < currentStep
                    ? 'w-1.5 bg-cyber-accent/40'
                    : 'w-1.5 bg-edge'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleComplete}
              className="min-h-[36px] rounded-lg px-2 text-xs text-ink-dim transition-colors hover:text-ink"
            >
              跳过引导
            </button>
            <button
              onClick={handleNext}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              <span>{currentStep === STEPS.length - 1 ? '开始探险' : '下一步'}</span>
              {currentStep === STEPS.length - 1 ? (
                <Check className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
