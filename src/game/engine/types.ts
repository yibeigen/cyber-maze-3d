import { CampaignLevel, GameMode, MazeSize } from '../core/constants'
import { Dir, Maze } from '../core/grid'

export type Phase = 'revealing' | 'ready' | 'playing' | 'paused' | 'won' | 'error'

export type EdgeVisualState = 'idle' | 'warn-close' | 'warn-open'

export type EdgeState = 0 /* closed */ | 1 /* open */ | 2 /* closing */ | 3 /* opening */

/** 玩家主动指令（扫描 / 主动变形）的统一结果 */
export type CommandResult = 'ok' | 'no-charges' | 'busy' | 'not-allowed'

export type ScanResult = CommandResult

export interface RunConfig {
  seed: string
  size: MazeSize
  shifting: boolean
  mode?: GameMode
  campaign?: CampaignLevel
  reducedMotion?: boolean
  runId?: number
}

export interface PlayerVisual {
  x: number
  z: number
  bump: number
}

export type GameEvent =
  | { type: 'phase'; phase: Phase; prev: Phase; runId: number }
  | { type: 'moveStart'; from: number; to: number; dir: Dir; runId: number }
  | { type: 'moveEnd'; room: number; moves: number; runId: number }
  | { type: 'bump'; room: number; dir: Dir; runId: number }
  | { type: 'shiftWarn'; origin: number; close: number[]; open: number[]; runId: number }
  | { type: 'shiftMotion'; close: number[]; open: number[]; runId: number }
  | { type: 'shiftEnd'; shiftsDone: number; runId: number }
  | { type: 'shiftSkipped'; runId: number }
  | { type: 'forceShiftUsed'; chargesRemaining: number; runId: number }
  | { type: 'scanStart'; chargesRemaining: number; expanded: number; path: number[]; runId: number }
  | { type: 'scanEnd'; runId: number }
  | { type: 'won'; elapsed: number; moves: number; scansUsed: number; shiftsDone: number; optimalMoves: number; runId: number }
