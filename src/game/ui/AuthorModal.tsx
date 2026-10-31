import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Heart, MessageSquare, Sparkles, X, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n/store'
import { useGameStore } from '../state/useGameStore'
import { panelMotion } from './motion'

interface AuthorModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ImagePreview {
  src: string
  alt: string
  title: string
  desc: string
}

export function AuthorModal({ isOpen, onClose }: AuthorModalProps) {
  const t = useT()
  const showToast = useGameStore((s) => s.showToast)
  const [copiedType, setCopiedType] = useState<'wechat' | 'qq' | null>(null)
  const [previewImg, setPreviewImg] = useState<ImagePreview | null>(null)

  if (!isOpen) return null

  const handleCopy = (text: string, type: 'wechat' | 'qq') => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedType(type)
        showToast(t(type === 'wechat' ? 'author.wechatCopied' : 'author.qqCopied', { value: text }))
        setTimeout(() => setCopiedType(null), 2000)
      },
      () => {
        showToast(t('author.copyFail', { value: text }))
      }
    )
  }

  return (
    <>
      <div className="pointer-events-auto fixed inset-0 z-50 flex select-none items-center justify-center p-3 sm:p-4">
        {/* 遮罩背景 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* 弹窗主体 */}
        <motion.div
          {...panelMotion}
          className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl glass-panel p-4 sm:p-6"
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between border-b border-edge/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyber-accent/15 text-cyber-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="text-base font-bold text-ink">{t('author.title')}</div>
                <div className="text-[11px] text-ink-dim">{t('author.subtitle')}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface hover:text-ink"
              aria-label={t('author.closeAria')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5 pt-3.5">
            {/* 1. 作者名片 */}
            <div className="flex items-center gap-3.5 rounded-xl border border-edge/40 bg-surface/50 p-3 sm:p-3.5">
              <img
                src="./logo.jpg"
                alt="Logo"
                className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-cyber-accent/30"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{t('author.name')}</span>
                  <span className="rounded-full bg-cyber-accent/15 px-2 py-0.5 text-[10px] font-semibold text-cyber-accent">
                    {t('author.badge')}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-ink-dim">
                  {t('author.bio')}
                </div>
              </div>
            </div>

            {/* 2. 商务合作 / 技术交流（微信与QQ一键复制） */}
            <div className="rounded-xl border border-edge/40 bg-sunken/40 p-3">
              <div className="flex items-center justify-between text-xs text-ink-dim">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <MessageSquare className="h-3.5 w-3.5 text-cyber-accent" />
                  {t('author.contact')}
                </span>
                <span className="text-[10px] text-ink-faint">{t('author.contactHint')}</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {/* 微信号 */}
                <button
                  type="button"
                  onClick={() => handleCopy('peace-83', 'wechat')}
                  className="group flex items-center justify-between rounded-lg border border-edge/40 bg-surface/60 px-2.5 py-1.5 transition-all hover:border-cyber-accent/60 hover:bg-surface active:scale-[0.98]"
                  title={t('author.wechatCopyTitle')}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] font-medium text-ink-dim">{t('author.wechatLabel')}</span>
                    <span className="font-mono text-xs font-semibold text-ink">peace-83</span>
                  </div>
                  {copiedType === 'wechat' ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-cyber-accent" />
                  )}
                </button>

                {/* QQ号 */}
                <button
                  type="button"
                  onClick={() => handleCopy('3057454077', 'qq')}
                  className="group flex items-center justify-between rounded-lg border border-edge/40 bg-surface/60 px-2.5 py-1.5 transition-all hover:border-cyber-accent/60 hover:bg-surface active:scale-[0.98]"
                  title={t('author.qqCopyTitle')}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] font-medium text-ink-dim">{t('author.qqLabel')}</span>
                    <span className="font-mono text-xs font-semibold text-ink">3057454077</span>
                  </div>
                  {copiedType === 'qq' ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-cyber-accent" />
                  )}
                </button>
              </div>
            </div>

            {/* 3. 外链：个人主页 & CSDN 博客 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="https://yibeigen.pages.dev/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-edge/40 bg-surface/30 px-3 py-2 text-ink transition-colors hover:border-cyber-accent/50 hover:bg-surface/70"
              >
                <span>{t('author.homepage')}</span>
                <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
              </a>
              <a
                href="https://blog.csdn.net/qq_46987323?spm=1000.2115.3001.5343"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-edge/40 bg-surface/30 px-3 py-2 text-ink transition-colors hover:border-cyber-accent/50 hover:bg-surface/70"
              >
                <span>{t('author.blog')}</span>
                <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
              </a>
            </div>

            {/* 4. 双二维码区（支持点击放大） */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* 微信公众号 */}
              <div
                onClick={() =>
                  setPreviewImg({
                    src: './wechat_qr.png',
                    alt: t('author.wechatQrAlt'),
                    title: t('author.wechatQrTitle'),
                    desc: t('author.wechatQrDesc'),
                  })
                }
                className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-edge/50 bg-sunken/40 p-2.5 sm:p-3 text-center transition-all hover:border-cyber-accent/50 hover:bg-sunken/60"
                title={t('author.wechatZoomTitle')}
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src="./wechat_qr.png"
                    alt={t('author.wechatQrAlt')}
                    className="h-24 w-24 rounded-lg border border-edge/40 bg-white object-contain p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      <ZoomIn className="h-3 w-3" />
                      {t('author.zoom')}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold text-ink">{t('author.wechatQrTitle')}</div>
                <div className="mt-0.5 text-[10px] text-ink-faint">
                  {t('author.wechatQrShort')}
                </div>
                <div className="mt-1 text-[9px] text-cyber-accent opacity-80 group-hover:opacity-100">
                  🔍 {t('author.zoom')}
                </div>
              </div>

              {/* 赞赏码 */}
              <div
                onClick={() =>
                  setPreviewImg({
                    src: './reward_qr.png',
                    alt: t('author.rewardAlt'),
                    title: t('author.rewardTitle'),
                    desc: t('author.rewardDesc'),
                  })
                }
                className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-edge/50 bg-sunken/40 p-2.5 sm:p-3 text-center transition-all hover:border-rose-400/50 hover:bg-sunken/60"
                title={t('author.rewardZoomTitle')}
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src="./reward_qr.png"
                    alt={t('author.rewardAlt')}
                    className="h-24 w-24 rounded-lg border border-edge/40 bg-white object-contain p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      <ZoomIn className="h-3 w-3" />
                      {t('author.zoom')}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-ink">
                  <Heart className="h-3 w-3 fill-current text-rose-500" />
                  <span>{t('author.reward')}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-ink-faint">
                  {t('author.rewardShort')}
                </div>
                <div className="mt-1 text-[9px] text-rose-400 opacity-80 group-hover:opacity-100">
                  🔍 {t('author.zoom')}
                </div>
              </div>
            </div>

            {/* 5. 作者精选开源作品（均可直接点击访问） */}
            <div className="space-y-2 rounded-xl border border-edge/40 bg-surface/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span>{t('author.projectsTitle')}</span>
                <span className="text-[10px] font-normal text-ink-faint">{t('author.projectsHint')}</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 项目 1：BlogDistiller · 博萃 */}
                <div className="group rounded-xl border border-edge/30 bg-surface/60 p-3 transition-all hover:border-cyber-accent/60 hover:bg-surface">
                  <div className="flex items-center justify-between">
                    <a
                      href="https://doc.305758.xyz"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-cyber-accent"
                    >
                      <span>{t('author.blogdistillerTitle')}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-ink-faint group-hover:text-cyber-accent" />
                    </a>
                    <span className="rounded-md bg-cyber-accent/15 px-2 py-0.5 text-[10px] font-medium text-cyber-accent">
                      {t('author.blogdistillerBadge')}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                    {t('author.blogdistillerDesc')}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-faint">
                    <a
                      href="https://doc.305758.xyz"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-cyber-accent hover:underline"
                    >
                      {t('author.docs')}
                    </a>
                    <span>·</span>
                    <a
                      href="https://github.com/yibeigen/wechat-article-exporter"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-cyber-accent hover:underline"
                    >
                      {t('author.github')}
                    </a>
                  </div>
                </div>

                {/* 项目 2：智能跟随提词器（在线直接可用，无需回复） */}
                <div className="group rounded-xl border border-edge/30 bg-surface/60 p-3 transition-all hover:border-emerald-500/60 hover:bg-surface">
                  <div className="flex items-center justify-between">
                    <a
                      href="https://pip.305758.xyz/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-emerald-400"
                    >
                      <span>{t('author.teleprompterTitle')}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-ink-faint group-hover:text-emerald-400" />
                    </a>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {t('author.teleprompterBadge')}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                    {t('author.teleprompterDesc')}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-faint">
                    <a
                      href="https://pip.305758.xyz/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline font-medium"
                    >
                      {t('author.useNow')}
                    </a>
                    <span>·</span>
                    <a
                      href="https://github.com/yibeigen/PipTeleprompter"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink hover:underline"
                    >
                      {t('author.github')}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-cyber-accent/10 px-3 py-2 text-center text-[11px] text-ink-dim">
                {t('author.tip')}
              </div>
            </div>
          </div>

          {/* 底部关闭 */}
          <div className="pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[42px] w-full items-center justify-center rounded-xl border border-edge/60 bg-surface text-xs font-semibold text-ink transition-colors hover:bg-surface/80"
            >
              {t('common.close')}
            </button>
          </div>
        </motion.div>
      </div>

      {/* 图片全屏放大预览模态框 (LightBox) */}
      <AnimatePresence>
        {previewImg && (
          <div
            className="pointer-events-auto fixed inset-0 z-[100] flex select-none items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setPreviewImg(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-w-sm flex-col items-center rounded-2xl glass-panel p-5 text-center shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-surface hover:text-ink"
                aria-label={t('author.closePreviewAria')}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-sm font-bold text-ink">{previewImg.title}</div>

              <div className="my-3 rounded-xl border border-edge/60 bg-white p-2.5 shadow-inner">
                <img
                  src={previewImg.src}
                  alt={previewImg.alt}
                  className="h-64 w-64 object-contain select-auto"
                />
              </div>

              <div className="text-xs text-ink-dim">{previewImg.desc}</div>
              <div className="mt-1 text-[11px] text-ink-faint">{t('author.previewHint')}</div>

              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="mt-4 flex min-h-[38px] w-full items-center justify-center rounded-xl bg-surface border border-edge/60 text-xs font-semibold text-ink hover:bg-surface/80"
              >
                {t('author.closePreview')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
