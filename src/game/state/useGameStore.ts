import { create } from 'zustand'
import { CampaignLevel, GameMode, MazeSize } from '../core/constants'
import { Phase } from '../engine/types'
import {
  CameraMode,
  CampaignProgress,
  getBestTime,
  getCampaignProgress,
  getStoredCameraMode,
  getStoredQuality,
  getStoredSoundEnabled,
  getStoredTheme,
  parseUrlParams,
  QualitySetting,
  saveBestTime,
  saveCampaignResult,
  saveStoredCameraMode,
  saveStoredQuality,
  saveStoredSoundEnabled,
  saveStoredTheme,
  VisualTheme,
} from './persistence'

import { GenAlgo } from '../core/generate'
import { SolveAlgo } from '../core/solve'
import { LabPhase } from '../lab/labModel'

export interface GameResult {
  elapsed: number
  moves: number
  scansUsed: number
  shiftsDone: number
  /** 当前迷宫拓扑下的理论最少步数，-1 表示不可达 */
  optimalMoves: number
  isNewRecord: boolean
  stars?: number
}

export interface ToastMessage {
  id: number
  text: string
  type?: 'info' | 'warn' | 'success'
}

export interface LabStoreState {
  genAlgo: GenAlgo
  solveAlgo: SolveAlgo
  size: MazeSize
  seed: string
  phase: LabPhase
  stepIndex: number
  isPlaying: boolean
  speed: number
}

export interface GameState {
  // 页面导航
  currentPage: 'title' | 'game' | 'lab'

  // 用户设置（开新局时作为默认参数）
  size: MazeSize
  shifting: boolean
  seedInput: string
  soundEnabled: boolean
  quality: QualitySetting
  reducedMotion: boolean
  theme: VisualTheme
  setTheme: (theme: VisualTheme) => void
  mode: GameMode
  activeLevel: CampaignLevel | null
  campaign: CampaignProgress

  // 实验室切片（算法、尺寸、种子、阶段、下标、播放、速度）
  lab: LabStoreState
  setLabGenAlgo: (algo: GenAlgo) => void
  setLabSolveAlgo: (algo: SolveAlgo) => void
  setLabSize: (size: MazeSize) => void
  setLabSeed: (seed: string) => void
  setLabPhase: (phase: LabPhase) => void
  setLabStepIndex: (stepIndex: number) => void
  setLabIsPlaying: (isPlaying: boolean) => void
  setLabSpeed: (speed: number) => void

  // 相机控制状态（游戏页）
  yawStep: number      // 0..3 对应 0°, 90°, 180°, 270°
  isSurveying: boolean // 是否处于俯瞰状态
  cameraMode: CameraMode
  toggleCameraMode: () => void
  /** 电影模式：隐藏全部 2D UI，只留 3D 场景（H 键切换，录屏/截图用） */
  cinematic: boolean
  setCinematic: (cinematic: boolean) => void
  toggleCinematic: () => void

  // 引擎权威状态的轻量只读投影（供 React UI 订阅）
  runId: number
  phase: Phase
  moves: number
  scansRemaining: number
  forceCharges: number
  shiftsDone: number
  activeSeed: string
  bestTimeMs: number | null
  lastResult: GameResult | null

  // 消息气泡 Toast
  toast: ToastMessage | null

  // 触控控制器（移动端默认开启，桌面端可随时切换）
  showTouchControls: boolean
  setShowTouchControls: (show: boolean) => void
  toggleTouchControls: () => void

  // UI 动作
  setPage: (page: 'title' | 'game' | 'lab') => void
  setSize: (size: MazeSize) => void
  setShifting: (shifting: boolean) => void
  setSeedInput: (seed: string) => void
  setSoundEnabled: (enabled: boolean) => void
  setQuality: (quality: QualitySetting) => void
  rotateYaw: (dir: 1 | -1) => void
  resetYaw: () => void
  setSurveying: (surveying: boolean) => void
  showToast: (text: string, type?: 'info' | 'warn' | 'success') => void
  clearToast: () => void

  // Controller 调用的内部投影更新
  _syncEngineRun: (data: {
    runId: number
    phase: Phase
    seed: string
    size: MazeSize
    shifting: boolean
    mode: GameMode
    campaignLevel: CampaignLevel | null
    scansRemaining: number
    forceCharges: number
  }) => void
  _syncEnginePhase: (phase: Phase) => void
  _syncEngineMoves: (moves: number) => void
  _syncEngineScans: (remaining: number) => void
  _syncEngineForce: (remaining: number) => void
  _syncEngineShifts: (shiftsDone: number) => void
  _syncEngineWon: (data: {
    elapsed: number
    moves: number
    scansUsed: number
    shiftsDone: number
    optimalMoves: number
  }) => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null
let toastIdCounter = 0

const initialUrl = parseUrlParams()
const initialSound = getStoredSoundEnabled()
const initialQuality = getStoredQuality()
const initialTheme = getStoredTheme()
const initialReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useGameStore = create<GameState>((set, get) => ({
  currentPage: 'title',

  size: initialUrl.size ?? 'm',
  shifting: initialUrl.shifting ?? true,
  seedInput: initialUrl.seed ?? '',
  soundEnabled: initialSound,
  quality: initialQuality,
  reducedMotion: initialReducedMotion,
  theme: initialTheme,
  mode: 'campaign',
  activeLevel: null,
  campaign: getCampaignProgress(),

  lab: {
    genAlgo: 'dfs',
    solveAlgo: 'astar',
    size: 'm',
    seed: 'lab-cyber',
    phase: 'generate',
    stepIndex: 0,
    isPlaying: false,
    speed: 1,
  },

  setLabGenAlgo: (genAlgo) =>
    set((s) => ({
      lab: { ...s.lab, genAlgo, phase: 'generate', stepIndex: 0, isPlaying: false },
    })),
  setLabSolveAlgo: (solveAlgo) =>
    set((s) => ({
      lab: { ...s.lab, solveAlgo, stepIndex: 0, isPlaying: false },
    })),
  setLabSize: (size) =>
    set((s) => ({
      lab: { ...s.lab, size, phase: 'generate', stepIndex: 0, isPlaying: false },
    })),
  setLabSeed: (seed) =>
    set((s) => ({
      lab: { ...s.lab, seed, phase: 'generate', stepIndex: 0, isPlaying: false },
    })),
  setLabPhase: (phase) =>
    set((s) => ({
      lab: { ...s.lab, phase, stepIndex: 0, isPlaying: false },
    })),
  setLabStepIndex: (stepIndex) =>
    set((s) => ({
      lab: { ...s.lab, stepIndex },
    })),
  setLabIsPlaying: (isPlaying) =>
    set((s) => ({
      lab: { ...s.lab, isPlaying },
    })),
  setLabSpeed: (speed) =>
    set((s) => ({
      lab: { ...s.lab, speed },
    })),

  yawStep: 0,
  isSurveying: false,
  cameraMode: getStoredCameraMode(),
  cinematic: false,

  runId: 0,
  phase: 'revealing',
  moves: 0,
  scansRemaining: 3,
  forceCharges: 3,
  shiftsDone: 0,
  activeSeed: '',
  bestTimeMs: null,
  lastResult: null,

  toast: null,
  showTouchControls:
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || window.innerWidth < 1024),

  setShowTouchControls: (show) => set({ showTouchControls: show }),
  toggleTouchControls: () => set((s) => ({ showTouchControls: !s.showTouchControls })),

  setPage: (page) => set({ currentPage: page }),
  setSize: (size) => set({ size }),
  setShifting: (shifting) => set({ shifting }),
  setSeedInput: (seedInput) => set({ seedInput }),

  setSoundEnabled: (soundEnabled) => {
    saveStoredSoundEnabled(soundEnabled)
    set({ soundEnabled })
  },

  setQuality: (quality) => {
    saveStoredQuality(quality)
    set({ quality })
  },

  setTheme: (theme) => {
    saveStoredTheme(theme)
    set({ theme })
  },

  rotateYaw: (dir) => {
    const cur = get().yawStep
    const next = ((cur + dir) % 4 + 4) % 4
    set({ yawStep: next })
  },

  resetYaw: () => set({ yawStep: 0 }),
  setSurveying: (isSurveying) => set({ isSurveying }),
  toggleCameraMode: () => {
    const cameraMode = get().cameraMode === 'third' ? 'first' : 'third'
    saveStoredCameraMode(cameraMode)
    set({ cameraMode })
  },
  setCinematic: (cinematic) => set({ cinematic }),
  toggleCinematic: () => set((s) => ({ cinematic: !s.cinematic })),

  showToast: (text, type = 'info') => {
    if (toastTimer) {
      clearTimeout(toastTimer)
    }
    const id = ++toastIdCounter
    set({ toast: { id, text, type } })
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null })
      }
    }, 2000)
  },

  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: null })
  },

  _syncEngineRun: ({ runId, phase, seed, size, shifting, mode, campaignLevel, scansRemaining, forceCharges }) => {
    const bestScope = campaignLevel ? `campaign-${campaignLevel.id}` : mode
    const best = getBestTime(size, shifting, seed, bestScope)
    set({
      runId,
      phase,
      activeSeed: seed,
      size,
      shifting,
      mode,
      activeLevel: campaignLevel,
      moves: 0,
      scansRemaining,
      forceCharges,
      shiftsDone: 0,
      bestTimeMs: best,
      lastResult: null,
      yawStep: 0,
      isSurveying: false,
      cinematic: false,
    })
  },

  _syncEnginePhase: (phase) => set({ phase }),
  _syncEngineMoves: (moves) => set({ moves }),
  _syncEngineScans: (scansRemaining) => set({ scansRemaining }),
  _syncEngineForce: (forceCharges) => set({ forceCharges }),
  _syncEngineShifts: (shiftsDone) => set({ shiftsDone }),

  _syncEngineWon: ({ elapsed, moves, scansUsed, shiftsDone, optimalMoves }) => {
    const { size, shifting, activeSeed, activeLevel, mode } = get()
    const elapsedMs = Math.round(elapsed * 1000)
    const bestScope = activeLevel ? `campaign-${activeLevel.id}` : mode
    const isNewRecord = saveBestTime(size, shifting, activeSeed, elapsedMs, bestScope)
    const best = isNewRecord ? elapsedMs : get().bestTimeMs
    const ratio = optimalMoves > 0 && moves > 0 ? optimalMoves / moves : 0
    const stars = activeLevel ? (ratio >= 0.95 ? 3 : ratio >= 0.8 ? 2 : 1) : undefined
    const campaign = activeLevel ? saveCampaignResult(activeLevel.id, stars!) : get().campaign

    set({
      phase: 'won',
      bestTimeMs: best,
      campaign,
      lastResult: {
        elapsed,
        moves,
        scansUsed,
        shiftsDone,
        optimalMoves,
        isNewRecord,
        stars,
      },
    })
  },
}))
