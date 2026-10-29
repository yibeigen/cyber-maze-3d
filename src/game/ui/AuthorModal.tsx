import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Heart, MessageSquare, Sparkles, X, ZoomIn } from 'lucide-react'
import { useState } from 'react'
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
  const showToast = useGameStore((s) => s.showToast)
  const [copiedType, setCopiedType] = useState<'wechat' | 'qq' | null>(null)
  const [previewImg, setPreviewImg] = useState<ImagePreview | null>(null)

  if (!isOpen) return null

  const handleCopy = (text: string, type: 'wechat' | 'qq', label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedType(type)
        showToast(`已复制${label}: ${text}`)
        setTimeout(() => setCopiedType(null), 2000)
      },
      () => {
        showToast(`复制失败，请手动长按复制: ${text}`)
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
                <div className="text-base font-bold text-ink">关于作者与开发生态</div>
                <div className="text-[11px] text-ink-dim">Crafted with passion · 独立开发者生态</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface hover:text-ink"
              aria-label="关闭"
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
                  <span className="text-sm font-bold text-ink">博主：艺杯羹</span>
                  <span className="rounded-full bg-cyber-accent/15 px-2 py-0.5 text-[10px] font-semibold text-cyber-accent">
                    独立开发者
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-ink-dim">
                  效率工具与知识蒸馏系统创作者 · 专注全栈开发与 3D 交互
                </div>
              </div>
            </div>

            {/* 2. 商务合作 / 技术交流（微信与QQ一键复制） */}
            <div className="rounded-xl border border-edge/40 bg-sunken/40 p-3">
              <div className="flex items-center justify-between text-xs text-ink-dim">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <MessageSquare className="h-3.5 w-3.5 text-cyber-accent" />
                  联系与交流
                </span>
                <span className="text-[10px] text-ink-faint">有问题或建议欢迎随时联系</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {/* 微信号 */}
                <button
                  type="button"
                  onClick={() => handleCopy('peace-83', 'wechat', '微信号')}
                  className="group flex items-center justify-between rounded-lg border border-edge/40 bg-surface/60 px-2.5 py-1.5 transition-all hover:border-cyber-accent/60 hover:bg-surface active:scale-[0.98]"
                  title="点击复制微信号"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] font-medium text-ink-dim">微信:</span>
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
                  onClick={() => handleCopy('3057454077', 'qq', 'QQ号')}
                  className="group flex items-center justify-between rounded-lg border border-edge/40 bg-surface/60 px-2.5 py-1.5 transition-all hover:border-cyber-accent/60 hover:bg-surface active:scale-[0.98]"
                  title="点击复制QQ号"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] font-medium text-ink-dim">QQ:</span>
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
                <span>个人主页 (yibeigen.pages.dev)</span>
                <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
              </a>
              <a
                href="https://blog.csdn.net/qq_46987323?spm=1000.2115.3001.5343"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-edge/40 bg-surface/30 px-3 py-2 text-ink transition-colors hover:border-cyber-accent/50 hover:bg-surface/70"
              >
                <span>CSDN 技术博客</span>
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
                    alt: '微信公众号【艺杯羹】',
                    title: '微信公众号【艺杯羹】',
                    desc: '微信扫一扫关注 · 回复「迷宫」加入交流群 · 获取更多开源工具',
                  })
                }
                className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-edge/50 bg-sunken/40 p-2.5 sm:p-3 text-center transition-all hover:border-cyber-accent/50 hover:bg-sunken/60"
                title="单击放大查看二维码"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src="./wechat_qr.png"
                    alt="微信公众号【艺杯羹】"
                    className="h-24 w-24 rounded-lg border border-edge/40 bg-white object-contain p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      <ZoomIn className="h-3 w-3" />
                      放大
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold text-ink">微信公众号【艺杯羹】</div>
                <div className="mt-0.5 text-[10px] text-ink-faint">
                  扫码关注 · 回复「<b className="text-cyber-accent">迷宫</b>」进群
                </div>
                <div className="mt-1 text-[9px] text-cyber-accent opacity-80 group-hover:opacity-100">
                  🔍 单击可放大查看
                </div>
              </div>

              {/* 赞赏码 */}
              <div
                onClick={() =>
                  setPreviewImg({
                    src: './reward_qr.png',
                    alt: '赞赏支持作者',
                    title: '赞赏支持作者 (Reward)',
                    desc: '开源不易，如果本作对您有启发或带来了快乐，欢迎赞赏请作者喝杯咖啡 ☕',
                  })
                }
                className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-edge/50 bg-sunken/40 p-2.5 sm:p-3 text-center transition-all hover:border-rose-400/50 hover:bg-sunken/60"
                title="单击放大查看赞赏码"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src="./reward_qr.png"
                    alt="赞赏支持作者"
                    className="h-24 w-24 rounded-lg border border-edge/40 bg-white object-contain p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      <ZoomIn className="h-3 w-3" />
                      放大
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-ink">
                  <Heart className="h-3 w-3 fill-current text-rose-500" />
                  <span>赞赏支持作者</span>
                </div>
                <div className="mt-0.5 text-[10px] text-ink-faint">
                  开源不易 · 喜欢本作请喝咖啡 ☕
                </div>
                <div className="mt-1 text-[9px] text-rose-400 opacity-80 group-hover:opacity-100">
                  🔍 单击可放大查看
                </div>
              </div>
            </div>

            {/* 5. 作者精选开源作品（均可直接点击访问） */}
            <div className="space-y-2 rounded-xl border border-edge/40 bg-surface/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span>作者精选开源作品</span>
                <span className="text-[10px] font-normal text-ink-faint">点击卡片直达项目</span>
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
                      <span>🚀 BlogDistiller · 博萃</span>
                      <ExternalLink className="h-3.5 w-3.5 text-ink-faint group-hover:text-cyber-accent" />
                    </a>
                    <span className="rounded-md bg-cyber-accent/15 px-2 py-0.5 text-[10px] font-medium text-cyber-accent">
                      回复「文章」领口令
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                    全网博文批量下载与知识蒸馏神器，支持微信公众号、知乎、微博、CSDN 等 9 大主流平台全量去噪与多格式导出。
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-faint">
                    <a
                      href="https://doc.305758.xyz"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-cyber-accent hover:underline"
                    >
                      🌐 官方文档主页
                    </a>
                    <span>·</span>
                    <a
                      href="https://github.com/yibeigen/wechat-article-exporter"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-cyber-accent hover:underline"
                    >
                      💻 GitHub 开源仓库
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
                      <span>🎬 智能跟随提词器</span>
                      <ExternalLink className="h-3.5 w-3.5 text-ink-faint group-hover:text-emerald-400" />
                    </a>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      在线免安装 · 直接可用
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                    纯前端高性能智能提词器，融合 AI 语音跟读滚动与画中画 (PiP) 桌面置顶悬浮，录课、口播、直播神器。
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-faint">
                    <a
                      href="https://pip.305758.xyz/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline font-medium"
                    >
                      🚀 点击立刻在线使用
                    </a>
                    <span>·</span>
                    <a
                      href="https://github.com/yibeigen/PipTeleprompter"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink hover:underline"
                    >
                      💻 GitHub 开源仓库
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-cyber-accent/10 px-3 py-2 text-center text-[11px] text-ink-dim">
                💡 关注微信公众号【<b className="text-ink">艺杯羹</b>】回复「<b>迷宫</b>」进交流群，回复「<b>文章</b>」获取博萃客户端口令！
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
              关闭
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
                aria-label="关闭预览"
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
              <div className="mt-1 text-[11px] text-ink-faint">手机端可长按图片保存或识别二维码</div>

              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="mt-4 flex min-h-[38px] w-full items-center justify-center rounded-xl bg-surface border border-edge/60 text-xs font-semibold text-ink hover:bg-surface/80"
              >
                关闭预览
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
