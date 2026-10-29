import { motion } from 'framer-motion'
import { ArrowRight, Check, Cpu, Eye, Play } from 'lucide-react'
import { useState } from 'react'
import { setLabOnboardingCompleted } from '../state/persistence'
import { panelMotion } from './motion'

interface LabGuideProps {
  onDismiss: () => void
}

interface GuideStep {
  icon: typeof Cpu
  title: string
  subtitle: string
  desc: string
  points: string[]
}

const STEPS: GuideStep[] = [
  {
    icon: Cpu,
    title: '这里是迷宫的幕后拆解间',
    subtitle: '讲解 1 / 3',
    desc: '你玩游戏时一闪而过的迷宫生成和自动寻路，在这里被放慢成一步一步：',
    points: [
      '左边的 3D 场景就是正在演示的算法本体，蓝色是墙、亮色是算法走过的痕迹',
      '面板底部那行"解说"会用人话告诉你当前画面在干嘛',
    ],
  },
  {
    icon: Play,
    title: '三步就能玩起来',
    subtitle: '讲解 2 / 3',
    desc: '先选阶段，再选算法，最后按播放：',
    points: [
      '阶段选"迷宫生成"看墙怎么被雕出来；选"寻路求解"看 AI 怎么找出口',
      '控制条：▶ 播放全程，⏪ ⏩ 一格一格看，拖进度条随意跳到任意一步',
      '换算法或按"跳到末尾"立刻看结果，不用等',
    ],
  },
  {
    icon: Eye,
    title: '重点看两种性格',
    subtitle: '讲解 3 / 3',
    desc: '同一张迷宫，算法不一样，长得和走法完全不同：',
    points: [
      '生成：DFS 挖出的走廊又长又深，Prim 岔路和死胡同特别多',
      '求解：BFS 像水波一圈圈扩散，A* 朝终点方向抄近道——对比表就是三种算法的成绩单',
    ],
  },
]

export function LabGuide({ onDismiss }: LabGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setLabOnboardingCompleted()
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
              <IconComponent className="w-5 h-5 text-cyber-accent" />
            </div>
            <div>
              <div className="text-[11px] text-ink-faint">{step.subtitle}</div>
              <h3 className="text-base font-semibold text-ink">{step.title}</h3>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
            title="跳过讲解"
            aria-label="跳过讲解"
          >
            <span className="block px-0.5 text-lg leading-none">×</span>
          </button>
        </div>

        {/* 正文 */}
        <div className="space-y-3.5">
          <p className="text-xs leading-relaxed text-ink-dim">{step.desc}</p>
          <div className="space-y-2">
            {step.points.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-edge/35 bg-sunken/50 p-2.5 text-xs leading-snug text-ink-dim"
              >
                <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-accent" />
                {pt}
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
              跳过讲解
            </button>
            <button
              onClick={handleNext}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              <span>{currentStep === STEPS.length - 1 ? '开始拆解' : '下一步'}</span>
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
