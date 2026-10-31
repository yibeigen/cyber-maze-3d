export type MazeSize = 's' | 'm' | 'l'

export interface SizeConfig {
  w: number
  h: number
  scanCharges: number
  /** 每局可主动触发拓扑变形的次数 */
  forceShiftCharges: number
  shiftSwaps: number
  shiftRadius: number
}

export const SIZE_CONFIGS: Record<MazeSize, SizeConfig> = {
  s: {
    w: 9,
    h: 9,
    scanCharges: 2,
    forceShiftCharges: 2,
    shiftSwaps: 3,
    shiftRadius: 3,
  },
  m: {
    w: 15,
    h: 15,
    scanCharges: 3,
    forceShiftCharges: 3,
    shiftSwaps: 5,
    shiftRadius: 4,
  },
  l: {
    w: 21,
    h: 21,
    scanCharges: 4,
    forceShiftCharges: 4,
    shiftSwaps: 7,
    shiftRadius: 5,
  },
}

export const MAZE_SIZES = SIZE_CONFIGS

export type GameMode = 'campaign' | 'free' | 'daily'

export interface CampaignLevel extends SizeConfig {
  id: number
  chapter: string
  chapterEn: string
  name: string
  nameEn: string
  seed: string
  shifting: boolean
  shiftInterval: number
  tutorial?: 'move' | 'scan' | 'shift'
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  { id: 1, chapter: '全息觉醒', chapterEn: 'Hologram Awakening', name: '第一步', nameEn: 'First Step', w: 5, h: 5, seed: 'campaign-01-first-step', shifting: false, shiftInterval: 15, scanCharges: 0, forceShiftCharges: 0, shiftSwaps: 0, shiftRadius: 0, tutorial: 'move' },
  { id: 2, chapter: '全息觉醒', chapterEn: 'Hologram Awakening', name: '算法之眼', nameEn: 'Eye of the Algorithm', w: 7, h: 7, seed: 'campaign-02-scan', shifting: false, shiftInterval: 15, scanCharges: Infinity, forceShiftCharges: 0, shiftSwaps: 0, shiftRadius: 0, tutorial: 'scan' },
  { id: 3, chapter: '全息觉醒', chapterEn: 'Hologram Awakening', name: '矩阵呼吸', nameEn: 'Matrix Breath', w: 9, h: 9, seed: 'campaign-03-shift', shifting: true, shiftInterval: 15, scanCharges: 2, forceShiftCharges: 2, shiftSwaps: 3, shiftRadius: 3, tutorial: 'shift' },
  { id: 4, chapter: '矩阵脉动', chapterEn: 'Matrix Pulse', name: '脉冲回廊', nameEn: 'Pulse Corridor', w: 11, h: 11, seed: 'campaign-04-pulse', shifting: true, shiftInterval: 15, scanCharges: 3, forceShiftCharges: 2, shiftSwaps: 4, shiftRadius: 3 },
  { id: 5, chapter: '矩阵脉动', chapterEn: 'Matrix Pulse', name: '折射迷城', nameEn: 'Refracted City', w: 11, h: 11, seed: 'campaign-05-refraction', shifting: true, shiftInterval: 15, scanCharges: 2, forceShiftCharges: 2, shiftSwaps: 4, shiftRadius: 3 },
  { id: 6, chapter: '矩阵脉动', chapterEn: 'Matrix Pulse', name: '加速心跳', nameEn: 'Accelerated Heartbeat', w: 13, h: 13, seed: 'campaign-06-tempo', shifting: true, shiftInterval: 12, scanCharges: 3, forceShiftCharges: 3, shiftSwaps: 4, shiftRadius: 4 },
  { id: 7, chapter: '矩阵脉动', chapterEn: 'Matrix Pulse', name: '量子岔路', nameEn: 'Quantum Fork', w: 13, h: 13, seed: 'campaign-07-quantum', shifting: true, shiftInterval: 12, scanCharges: 2, forceShiftCharges: 3, shiftSwaps: 5, shiftRadius: 4 },
  { id: 8, chapter: '矩阵脉动', chapterEn: 'Matrix Pulse', name: '矩阵核心', nameEn: 'Matrix Core', w: 15, h: 15, seed: 'campaign-08-core', shifting: true, shiftInterval: 12, scanCharges: 2, forceShiftCharges: 3, shiftSwaps: 5, shiftRadius: 4 },
  { id: 9, chapter: '深空奇点', chapterEn: 'Deep-Space Singularity', name: '奇点边缘', nameEn: 'Singularity Edge', w: 17, h: 17, seed: 'campaign-09-singularity', shifting: true, shiftInterval: 12, scanCharges: 3, forceShiftCharges: 3, shiftSwaps: 6, shiftRadius: 5 },
  { id: 10, chapter: '深空奇点', chapterEn: 'Deep-Space Singularity', name: '拓扑风暴', nameEn: 'Topology Storm', w: 17, h: 17, seed: 'campaign-10-storm', shifting: true, shiftInterval: 12, scanCharges: 2, forceShiftCharges: 3, shiftSwaps: 6, shiftRadius: 5 },
  { id: 11, chapter: '深空奇点', chapterEn: 'Deep-Space Singularity', name: '极速重构', nameEn: 'Rapid Reroute', w: 19, h: 19, seed: 'campaign-11-velocity', shifting: true, shiftInterval: 10, scanCharges: 3, forceShiftCharges: 4, shiftSwaps: 7, shiftRadius: 5 },
  { id: 12, chapter: '深空奇点', chapterEn: 'Deep-Space Singularity', name: '全息王座', nameEn: 'Holographic Throne', w: 21, h: 21, seed: 'campaign-12-throne', shifting: true, shiftInterval: 10, scanCharges: 3, forceShiftCharges: 4, shiftSwaps: 7, shiftRadius: 5 },
]

export function getCampaignLevel(id: number): CampaignLevel {
  return CAMPAIGN_LEVELS[Math.min(CAMPAIGN_LEVELS.length, Math.max(1, id)) - 1]
}

// 墙体几何参数
export const WALL_H = 1.2
export const WALL_LOW = 0.05
export const BLOCK_SIZE = 1.0
export const PLAYER_RADIUS = 0.3

// 移动与碰撞时间参数（单位：秒）
export const MOVE_DURATION = 0.14
export const BUMP_DURATION = 0.12
export const BUMP_COOLDOWN = 0.18

// 变形时间参数（单位：秒）
export const SHIFT_INTERVAL = 15.0
export const SHIFT_WARN = 1.2
export const SHIFT_RIPPLE_DELAY = 0.06
export const SHIFT_MOTION = 0.5

// 建造开场动画参数（单位：秒）
export const REVEAL_BASE_DELAY = 0.3
export const REVEAL_STEP_MAX = 0.012
export const REVEAL_TOTAL_TARGET = 1.6
export const REVEAL_DUR = 0.25
export const REVEAL_ENTER_READY_DELAY = 0.2

// 扫描参数（单位：秒）
// 中图要走一百多步，8 秒的路径根本看不完，延长到 15 秒
export const SCAN_KEEP_DUR = 15.0
export const SCAN_FADE_DUR = 0.6
export const SCAN_POP_STEP_MAX = 0.02
export const SCAN_POP_TOTAL_TARGET = 1.0
