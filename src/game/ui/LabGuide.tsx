import { motion } from 'framer-motion'
import { ArrowRight, Check, Cpu, Eye, Play } from 'lucide-react'
import { useState } from 'react'
import { TFunction, useT } from '../i18n/store'
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

function buildSteps(t: TFunction): GuideStep[] {
  return [
    {
      icon: Cpu,
      title: t('labGuide.step1.title'),
      subtitle: t('labGuide.step1.subtitle'),
      desc: t('labGuide.step1.desc'),
      points: [t('labGuide.step1.point1'), t('labGuide.step1.point2')],
    },
    {
      icon: Play,
      title: t('labGuide.step2.title'),
      subtitle: t('labGuide.step2.subtitle'),
      desc: t('labGuide.step2.desc'),
      points: [t('labGuide.step2.point1'), t('labGuide.step2.point2'), t('labGuide.step2.point3')],
    },
    {
      icon: Eye,
      title: t('labGuide.step3.title'),
      subtitle: t('labGuide.step3.subtitle'),
      desc: t('labGuide.step3.desc'),
      points: [t('labGuide.step3.point1'), t('labGuide.step3.point2')],
    },
  ]
}

export function LabGuide({ onDismiss }: LabGuideProps) {
  const t = useT()
  const [currentStep, setCurrentStep] = useState(0)
  const STEPS = buildSteps(t)

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
            title={t('labGuide.skipTitle')}
            aria-label={t('labGuide.skipTitle')}
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
              {t('labGuide.skip')}
            </button>
            <button
              onClick={handleNext}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              <span>{currentStep === STEPS.length - 1 ? t('labGuide.begin') : t('common.next')}</span>
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
