import { motion } from 'framer-motion'
import { ArrowRight, Check, Radar, Sparkles, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { TFunction, useT } from '../i18n/store'
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

function buildSteps(t: TFunction): Step[] {
  return [
    {
      icon: Zap,
      iconColor: 'text-warn',
      title: t('onboarding.step1.title'),
      subtitle: t('onboarding.step1.subtitle'),
      desc: t('onboarding.step1.desc'),
      points: [
        { tag: t('onboarding.step1.point1.tag'), text: t('onboarding.step1.point1.text'), tone: 'warn' },
        { tag: t('onboarding.step1.point2.tag'), text: t('onboarding.step1.point2.text'), tone: 'ok' },
      ],
    },
    {
      icon: Radar,
      iconColor: 'text-cyber-accent',
      title: t('onboarding.step2.title'),
      subtitle: t('onboarding.step2.subtitle'),
      desc: t('onboarding.step2.desc'),
      points: [
        { tag: t('onboarding.step2.point1.tag'), text: t('onboarding.step2.point1.text') },
        { tag: t('onboarding.step2.point2.tag'), text: t('onboarding.step2.point2.text') },
      ],
    },
    {
      icon: Sparkles,
      iconColor: 'text-cyber-accent',
      title: t('onboarding.step3.title'),
      subtitle: t('onboarding.step3.subtitle'),
      desc: t('onboarding.step3.desc'),
      points: [
        { tag: t('onboarding.step3.point1.tag'), text: t('onboarding.step3.point1.text') },
        { tag: t('onboarding.step3.point2.tag'), text: t('onboarding.step3.point2.text') },
      ],
    },
  ]
}

export function Onboarding({ onDismiss }: OnboardingProps) {
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
            title={t('onboarding.skipTitle')}
            aria-label={t('onboarding.skipTitle')}
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
              {t('onboarding.skip')}
            </button>
            <button
              onClick={handleNext}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-cyber-accent px-5 text-sm font-semibold text-accent-ink transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              <span>{currentStep === STEPS.length - 1 ? t('onboarding.begin') : t('common.next')}</span>
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
