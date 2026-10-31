import { Globe } from 'lucide-react'
import { useLang, useLocaleStore, useT } from '../i18n/store'

export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLang()
  const setLang = useLocaleStore((s) => s.setLang)
  const t = useT()

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      title={t('lang.label')}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-edge/60 bg-sunken/60 p-0.5 backdrop-blur-sm ${className}`}
    >
      <Globe className="mx-1 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
      {(['zh', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={lang === item}
          onClick={() => setLang(item)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            lang === item
              ? 'bg-cyber-accent text-accent-ink'
              : 'text-ink-dim hover:bg-surface/60 hover:text-ink'
          }`}
        >
          {t(item === 'zh' ? 'lang.zh' : 'lang.en')}
        </button>
      ))}
    </div>
  )
}
