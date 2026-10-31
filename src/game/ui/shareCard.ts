import { MazeSize } from '../core/constants'
import { Maze } from '../core/grid'
import { THEMES, VisualTheme } from '../core/themes'
import { Lang, tMsg } from '../i18n/messages'
import { computeMazeBox, cssVarColor, drawMaze, mixHex } from './mazeDraw'

export interface ShareCardData {
  timeStr: string
  moves: number
  optimalMoves: number
  extraMoves: number
  shiftsDone: number
  scansUsed: number
  grade: 'S' | 'A' | 'B' | 'C' | null
  seed: string
  size: MazeSize
  shifting: boolean
  isNewRecord?: boolean
  /** 本局迷宫快照；为 null 时英雄区只画说明，不伪造图形 */
  maze: Maze | null
  /** A* 最优路径（房间 id 序列） */
  path: number[] | null
  playerPath?: number[] | null
  levelText?: string
  stars?: number
  theme: VisualTheme
  lang: Lang
}

const SIZE_TEXT: Record<MazeSize, string> = {
  s: '9×9',
  m: '15×15',
  l: '21×21',
}

const FONT_SANS =
  "'Outfit Variable', 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Microsoft YaHei', sans-serif"

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 英文文案普遍比中文长，超宽时逐级缩字号，避免顶出 1080 画布 */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  size: number,
) {
  let current = size
  ctx.font = `${weight} ${current}px ${FONT_SANS}`
  while (current > 16 && ctx.measureText(text).width > maxWidth) {
    current -= 1
    ctx.font = `${weight} ${current}px ${FONT_SANS}`
  }
}

/**
 * 1080×1350 战报长图（全案 5.5）
 * 英雄区是迷宫 + A* 最优路径，与结算页共用 mazeDraw 同一套绘制逻辑。
 * 配色随当前主题：亮主题出浅色海报，暗主题出深空海报，不写死一套青色。
 * 字号下限 24px，核心数据 60px，缩到 360px 宽仍可读。
 */
export async function generateShareCard(data: ShareCardData): Promise<string> {
  // 确保 Web 自定义字体（如 Outfit Variable）在 Canvas 绘制前已加载就绪
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready
    } catch {}
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

  const lang = data.lang
  const theme = THEMES[data.theme] || THEMES.cyber
  const isLight = theme.id === 'light'
  const accent = cssVarColor(
    '--accent',
    isLight ? '#0284c7' : theme.id === 'aurora' ? '#c084fc' : '#38bdf8',
  )

  const bg = theme.bgCanvas
  const ink = isLight ? '#0f172a' : '#f8fafc'
  const inkDim = isLight ? '#475569' : '#cbd5e1'
  const inkFaint = isLight ? '#64748b' : '#94a3b8'
  const hairline = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(148, 163, 184, 0.22)'
  const heroBg = isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.03)'

  // 1. 背景：底色 + 右上角主题光晕
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350)
  bgGrad.addColorStop(0, mixHex(bg, accent, isLight ? 0.04 : 0.12))
  bgGrad.addColorStop(0.55, bg)
  bgGrad.addColorStop(1, mixHex(bg, '#000000', isLight ? 0.03 : 0.35))
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, 1080, 1350)

  const glow = ctx.createRadialGradient(920, 60, 20, 920, 60, 720)
  glow.addColorStop(0, accent)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.save()
  ctx.globalAlpha = isLight ? 0.08 : 0.14
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1080, 900)
  ctx.restore()

  // 2. 顶部品牌行
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  ctx.beginPath()
  ctx.fillStyle = accent
  ctx.arc(74, 108, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = `600 26px ${FONT_SANS}`
  ctx.fillStyle = inkFaint
  ctx.fillText(tMsg(lang, 'shareCard.brand'), 94, 109)

  // 新纪录徽章（右上）
  if (data.isNewRecord) {
    ctx.textAlign = 'right'
    ctx.font = `600 26px ${FONT_SANS}`
    ctx.fillStyle = '#f59e0b'
    ctx.fillText(tMsg(lang, 'shareCard.newRecord'), 1006, 108)
    ctx.textAlign = 'left'
  }

  // 3. 主标题与定位
  const titleText = tMsg(lang, 'shareCard.title')
  fitFont(ctx, titleText, 936, 700, 60)
  ctx.fillStyle = ink
  ctx.fillText(titleText, 72, 196)

  const subtitleText = data.levelText
    ? `${data.levelText} · ${'★'.repeat(data.stars ?? 0)}${'☆'.repeat(3 - (data.stars ?? 0))}`
    : tMsg(lang, 'shareCard.subtitleDefault')
  fitFont(ctx, subtitleText, 936, 500, 30)
  ctx.fillStyle = inkDim
  ctx.fillText(subtitleText, 72, 254)

  // 4. 英雄区：迷宫 + A* 最优路径
  const heroX = 72
  const heroY = 300
  const heroW = 936
  const heroH = 580

  roundRect(ctx, heroX, heroY, heroW, heroH, 28)
  ctx.fillStyle = heroBg
  ctx.fill()
  ctx.strokeStyle = hairline
  ctx.lineWidth = 2
  ctx.stroke()

  if (data.maze) {
    const inner = 28
    const box = computeMazeBox(data.maze.w, data.maze.h, heroW - inner * 2, heroH - inner * 2, 0)
    const cell = Math.min(box.w / (2 * data.maze.w + 1), box.h / (2 * data.maze.h + 1))
    drawMaze(
      ctx,
      {
        w: data.maze.w,
        h: data.maze.h,
        open: data.maze.open,
        start: data.maze.start,
        exit: data.maze.exit,
        path: data.path,
        playerPath: data.playerPath,
      },
      {
        wall: isLight ? '#94a3b8' : mixHex(theme.wallColor, '#ffffff', 0.52),
        path: accent,
        start: accent,
        exit: isLight ? '#db2777' : '#f472b6',
        border: hairline,
        wallWidth: Math.max(1.6, cell * 0.22),
        pathWidth: Math.max(3, cell * 0.46),
        dotRadius: Math.max(4.5, cell * 0.6),
        showCells: true,
        cellColor: isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        playerPath: isLight ? '#db2777' : '#f472b6',
      },
      { x: heroX + inner + box.x, y: heroY + inner + box.y, w: box.w, h: box.h },
    )
  } else {
    ctx.textAlign = 'center'
    ctx.font = `500 26px ${FONT_SANS}`
    ctx.fillStyle = inkFaint
    ctx.fillText(tMsg(lang, 'shareCard.noSnapshot'), 540, heroY + heroH / 2)
    ctx.textAlign = 'left'
  }

  // 5. 数据带：用时 / 步数 / 评级
  const bandY = 930
  const columns = [
    { label: tMsg(lang, 'shareCard.time'), value: data.timeStr, color: ink },
    { label: tMsg(lang, 'shareCard.moves'), value: tMsg(lang, 'shareCard.movesValue', { n: data.moves }), color: ink },
    {
      label: tMsg(lang, 'shareCard.efficiency'),
      value: data.grade ?? '—',
      color:
        data.grade === 'S'
          ? '#f59e0b'
          : data.grade === 'A'
          ? '#10b981'
          : data.grade === 'B'
          ? '#0ea5e9'
          : inkDim,
    },
  ]

  const colW = 936 / 3
  columns.forEach((col, i) => {
    const cx = 72 + colW * i + colW / 2
    ctx.textAlign = 'center'

    fitFont(ctx, col.label, colW - 24, 500, 24)
    ctx.fillStyle = inkFaint
    ctx.fillText(col.label, cx, bandY)

    fitFont(ctx, col.value, colW - 24, 700, 60)
    ctx.fillStyle = col.color
    ctx.fillText(col.value, cx, bandY + 62)

    if (i > 0) {
      ctx.strokeStyle = hairline
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(72 + colW * i, bandY - 26)
      ctx.lineTo(72 + colW * i, bandY + 82)
      ctx.stroke()
    }
  })

  // 6. 图论承诺
  ctx.textAlign = 'center'
  const promiseText = tMsg(lang, 'shareCard.promise')
  fitFont(ctx, promiseText, 936, 600, 28)
  ctx.fillStyle = inkDim
  ctx.fillText(promiseText, 540, 1064)

  // 7. 参数行（种子最长 32 字符，超出截断，避免顶出画布）
  const seedText =
    data.seed.length > 18 ? `${data.seed.slice(0, 18)}…` : data.seed
  const sizeText = data.maze ? `${data.maze.w}×${data.maze.h}` : SIZE_TEXT[data.size]
  const paramsText = tMsg(lang, 'shareCard.params', {
    seed: seedText,
    size: sizeText,
    mode: tMsg(lang, data.shifting ? 'shareCard.shiftingOn' : 'shareCard.staticMode'),
    shifts: data.shiftsDone,
    scans: data.scansUsed,
  })
  fitFont(ctx, paramsText, 936, 500, 24)
  ctx.fillStyle = inkFaint
  ctx.fillText(paramsText, 540, 1112)

  // 8. 分隔线 + 提示
  ctx.strokeStyle = hairline
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(72, 1152)
  ctx.lineTo(1008, 1152)
  ctx.stroke()

  const replayText = tMsg(lang, 'shareCard.replayHint')
  fitFont(ctx, replayText, 936, 500, 24)
  ctx.fillStyle = inkFaint
  ctx.fillText(replayText, 540, 1220)

  // 9. 页脚
  const footerText = tMsg(lang, 'shareCard.footer')
  fitFont(ctx, footerText, 936, 500, 24)
  ctx.fillStyle = inkFaint
  ctx.fillText(footerText, 540, 1290)

  return canvas.toDataURL('image/png')
}
