export type VisualTheme = 'cyber' | 'aurora' | 'light'

export interface ThemeConfig {
  id: VisualTheme
  name: string
  label: string
  bgCanvas: string
  fogColor: string
  gridSection: string
  gridCell: string
  tileDefault: string
  wallColor: string
  /** 基底大地面（房间与墙之下的底板），独立压暗，不再复用 wallColor */
  groundColor: string
  wallMetalness: number
  wallRoughness: number
  stripColor: string
  lightHemiSky: string
  lightHemiGround: string
  lightDirColor: string
  lightDirIntensity: number
  playerGlow: string
}

export const THEMES: Record<VisualTheme, ThemeConfig> = {
  cyber: {
    id: 'cyber',
    name: '赛博深空',
    label: '深空青蓝',
    bgCanvas: '#050814',
    fogColor: '#050814',
    gridSection: '#0284c7',
    gridCell: '#050d1c',
    tileDefault: '#090d18',
    wallColor: '#2a3654',
    groundColor: '#05070f',
    wallMetalness: 0.35,
    wallRoughness: 0.35,
    stripColor: '#22d3ee',
    lightHemiSky: '#38bdf8',
    lightHemiGround: '#030712',
    lightDirColor: '#e0f2fe',
    lightDirIntensity: 2.0,
    playerGlow: '#38bdf8',
  },
  aurora: {
    id: 'aurora',
    name: '极光紫电',
    label: '极光霓虹',
    bgCanvas: '#0a0a23',
    fogColor: '#0a0a23',
    gridSection: '#a855f7',
    gridCell: '#241656',
    tileDefault: '#120f2e',
    // 提升紫晶立柱与暗色地面的对比度，确保手机屏上迷宫轮廓与道路一目了然
    wallColor: '#473a8a',
    groundColor: '#07051a',
    wallMetalness: 0.35,
    wallRoughness: 0.28,
    stripColor: '#f472b6',
    lightHemiSky: '#d8b4fe',
    lightHemiGround: '#07041d',
    lightDirColor: '#fdf4ff',
    lightDirIntensity: 2.2,
    playerGlow: '#e879f9',
  },
  light: {
    id: 'light',
    name: '全息明境',
    label: '明亮浅色',
    bgCanvas: '#e2e8f0',
    fogColor: '#e2e8f0',
    gridSection: '#0ea5e9',
    gridCell: '#94a3b8',
    tileDefault: '#f8fafc',
    // 墙体与浅白地面拉开明暗反差，强化手机端立体纵深，道路边缘清晰锐利
    wallColor: '#8da5c4',
    groundColor: '#e2eaf4',
    wallMetalness: 0.3,
    wallRoughness: 0.25,
    // 墙顶条采用高饱和全息蔚蓝描边
    stripColor: '#0284c7',
    lightHemiSky: '#f8fafc',
    lightHemiGround: '#94a3b8',
    lightDirColor: '#ffffff',
    lightDirIntensity: 1.8,
    playerGlow: '#0284c7',
  },
}
