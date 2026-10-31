import { useMemo } from 'react'
import { create } from 'zustand'
import { CampaignLevel } from '../core/constants'
import { VisualTheme } from '../core/themes'
import { getStorageItem, setStorageItem } from '../state/persistence'
import {
  formatMessage,
  Lang,
  MessageKey,
  messages,
  MessageParams,
  TFunction,
  tMsg,
} from './messages'

const KEY_LANG = 'ckl:settings:lang'

export function getStoredLang(): Lang {
  return getStorageItem(KEY_LANG) === 'en' ? 'en' : 'zh'
}

function setMeta(selector: string, content: string) {
  document.head?.querySelector(selector)?.setAttribute('content', content)
}

export function applyDocumentLanguage(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  document.title = tMsg(lang, 'meta.title')
  setMeta('meta[name="description"]', tMsg(lang, 'meta.description'))
  setMeta('meta[property="og:locale"]', lang === 'en' ? 'en_US' : 'zh_CN')
  setMeta('meta[property="og:title"]', tMsg(lang, 'meta.ogTitle'))
  setMeta('meta[property="og:description"]', tMsg(lang, 'meta.ogDescription'))
  setMeta('meta[name="twitter:title"]', tMsg(lang, 'meta.ogTitle'))
  setMeta('meta[name="twitter:description"]', tMsg(lang, 'meta.ogDescription'))
}

interface LocaleState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  lang: getStoredLang(),
  setLang: (lang) => {
    setStorageItem(KEY_LANG, lang)
    applyDocumentLanguage(lang)
    set({ lang })
  },
}))

applyDocumentLanguage(useLocaleStore.getState().lang)

export function useLang(): Lang {
  return useLocaleStore((s) => s.lang)
}

export function useT(): TFunction {
  const lang = useLang()
  return useMemo(
    () => (key, params) => formatMessage(messages[lang][key] ?? messages.zh[key], params),
    [lang],
  )
}

export const translate: TFunction = (key, params) =>
  formatMessage(messages[useLocaleStore.getState().lang][key], params)

const THEME_NAME_KEY: Record<VisualTheme, MessageKey> = {
  cyber: 'theme.cyber.name',
  aurora: 'theme.aurora.name',
  light: 'theme.light.name',
}

const THEME_SHORT_KEY: Record<VisualTheme, MessageKey> = {
  cyber: 'theme.cyber.short',
  aurora: 'theme.aurora.short',
  light: 'theme.light.short',
}

export function themeName(lang: Lang, theme: VisualTheme): string {
  return tMsg(lang, THEME_NAME_KEY[theme])
}

export function themeShortName(lang: Lang, theme: VisualTheme): string {
  return tMsg(lang, THEME_SHORT_KEY[theme])
}

export function levelName(lang: Lang, level: CampaignLevel): string {
  return lang === 'en' ? level.nameEn : level.name
}

export function chapterName(lang: Lang, level: CampaignLevel): string {
  return lang === 'en' ? level.chapterEn : level.chapter
}

export type { Lang, MessageKey, MessageParams, TFunction }

// Re-export for callers that need a pure formatter outside React.
export { formatMessage, tMsg }
