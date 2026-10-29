import {
  BUMP_COOLDOWN,
  BUMP_DURATION,
  MOVE_DURATION,
  REVEAL_BASE_DELAY,
  REVEAL_DUR,
  REVEAL_ENTER_READY_DELAY,
  REVEAL_STEP_MAX,
  REVEAL_TOTAL_TARGET,
  SCAN_KEEP_DUR,
  SCAN_POP_STEP_MAX,
  SCAN_POP_TOTAL_TARGET,
  SHIFT_INTERVAL,
  SHIFT_MOTION,
  SHIFT_RIPPLE_DELAY,
  SHIFT_WARN,
  SIZE_CONFIGS,
  WALL_H,
  WALL_LOW,
} from '../core/constants'
import { generate, pickStartExit } from '../core/generate'
import {
  DIR_DELTA,
  Dir,
  edgeCount,
  edgeRooms,
  isSpanningTree,
  Maze,
  neighbor,
  roomToWorld,
  roomXY,
} from '../core/grid'
import { rngFor } from '../core/rng'
import { planShift, ShiftPlan } from '../core/shift'
import { solve } from '../core/solve'
import { clamp, easeInCubic, easeOutBack } from './easing'
import {
  CommandResult,
  EdgeState,
  EdgeVisualState,
  GameEvent,
  Phase,
  PlayerVisual,
  RunConfig,
  ScanResult,
} from './types'

interface EdgeAnim {
  edge: number
  fromHeight: number
  toHeight: number
  startTime: number
  dur: number
  type: 'rising' | 'falling'
}

interface MoveState {
  from: number
  to: number
  edge: number
  startTime: number
  dur: number
  dir: Dir
}

interface BumpState {
  dir: Dir
  startTime: number
  dur: number
}

export class GameEngine {
  readonly runId: number
  readonly cfg: RunConfig
  readonly maze: Maze

  private _time: number = 0
  private _elapsed: number = 0
  private _phase: Phase = 'revealing'
  private _moves: number = 0
  private _shiftsDone: number = 0
  private _scansUsed: number = 0
  private _scanCharges: number
  private _forceCharges: number

  private playerRoom: number
  private move: MoveState | null = null
  private bumpAnim: BumpState | null = null
  private heldDir: Dir | null = null
  private bufferDir: Dir | null = null
  private survey: boolean = false

  private lastBumpTime: number = -999
  private lastBumpDir: Dir | null = null

  // 边状态：0 closed, 1 open, 2 closing, 3 opening
  private edgeStates: Uint8Array
  private activeEdgeAnims: Map<number, EdgeAnim> = new Map()

  // 建造动画结束时刻
  private revealEndTime: number = 0

  // 变形调度
  private nextShiftElapsed: number
  readonly shiftInterval: number
  private shiftCount: number = 0
  private isShifting: boolean = false
  private shiftPhase: 'none' | 'warn' | 'motion' = 'none'
  private currentShiftPlan: ShiftPlan | null = null
  private shiftMotionStartTime: number = 0
  private shiftEndPlannedTime: number = 0

  // 扫描
  private activeScanPath: number[] | null = null
  private scanEndTime: number = 0
  private scanFlood: {
    startTime: number
    popDuration: number
    roomPopTimes: Map<number, number>
    pathVisibleStartTime: number
  } | null = null

  // 事件监听器
  private listeners: Set<(ev: GameEvent) => void> = new Set()

  // 当前迷宫状态下的理论最少步数，变形后失效重算
  private _optimalCache: number | null = null
  // 剩余逃脱距离读数缓存，玩家移动或墙体形变时更新
  private _remainingDistanceCache: number | null = null
  private _lastDistanceRoom: number | null = null
  private _initialOptimalMoves: number
  private _visitedHistory: number[]
  private lastVisitedIndex: Int32Array

  constructor(cfg: RunConfig) {
    this.cfg = cfg
    this.runId = cfg.runId ?? 1
    this.shiftInterval = cfg.campaign?.shiftInterval ?? SHIFT_INTERVAL
    this.nextShiftElapsed = this.shiftInterval

    const sizeConfig = cfg.campaign ?? SIZE_CONFIGS[cfg.size]
    this._scanCharges = sizeConfig.scanCharges
    this._forceCharges = sizeConfig.forceShiftCharges

    // 1. 生成迷宫
    const genRng = rngFor(cfg.seed, 'gen', cfg.campaign?.id ?? cfg.size)
    const { open, trace: genTrace } = generate('dfs', sizeConfig.w, sizeConfig.h, genRng)
    const { start, exit } = pickStartExit(sizeConfig.w, sizeConfig.h, open)

    this.maze = {
      w: sizeConfig.w,
      h: sizeConfig.h,
      open,
      start,
      exit,
    }

    this.playerRoom = start
    this._visitedHistory = [start]
    this.lastVisitedIndex = new Int32Array(sizeConfig.w * sizeConfig.h)
    this.lastVisitedIndex.fill(-1)
    this.lastVisitedIndex[start] = 0
    const initialSolution = solve('astar', this.maze, start, exit, (e) => this.maze.open[e] === 1)
    this._initialOptimalMoves = initialSolution.path ? initialSolution.path.length - 1 : -1

    const totalEdges = edgeCount(sizeConfig.w, sizeConfig.h)
    this.edgeStates = new Uint8Array(totalEdges)

    // 2. 初始化开场建造动画（5.7）
    const carveEvents = genTrace.filter((ev) => ev.t === 'carve') as Array<{
      t: 'carve'
      edge: number
      from: number
      to: number
    }>
    const carveCount = carveEvents.length

    let step = Math.min(REVEAL_STEP_MAX, REVEAL_TOTAL_TARGET / (carveCount || 1))
    if (cfg.reducedMotion) {
      step = step * 0.5
    }

    for (let i = 0; i < carveCount; i++) {
      const e = carveEvents[i].edge
      this.edgeStates[e] = 3 // opening
      const startTime = REVEAL_BASE_DELAY + i * step
      this.activeEdgeAnims.set(e, {
        edge: e,
        fromHeight: WALL_H,
        toHeight: WALL_LOW,
        startTime,
        dur: REVEAL_DUR,
        type: 'falling',
      })
    }

    this.revealEndTime =
      REVEAL_BASE_DELAY +
      (carveCount > 0 ? carveCount - 1 : 0) * step +
      REVEAL_DUR +
      REVEAL_ENTER_READY_DELAY
  }

  // --- 只读属性 ---

  get time(): number {
    return this._time
  }

  get elapsed(): number {
    return this._elapsed
  }

  get phase(): Phase {
    return this._phase
  }

  get moves(): number {
    return this._moves
  }

  get shiftsDone(): number {
    return this._shiftsDone
  }

  get scansUsed(): number {
    return this._scansUsed
  }

  get scanChargesRemaining(): number {
    return this._scanCharges
  }

  get forceChargesRemaining(): number {
    return this._forceCharges
  }

  /**
   * 起点到终点在当前迷宫拓扑下的理论最少步数（边数）。
   * 用于结算时给玩家一个"你比完美路线多走了多少"的参照。
   */
  get optimalMoves(): number {
    if (this._optimalCache === null) {
      const res = solve('astar', this.maze, this.maze.start, this.maze.exit, (e) => this.maze.open[e] === 1)
      this._optimalCache = res.path ? res.path.length - 1 : -1
    }
    return this._optimalCache
  }

  /**
   * 从玩家当前位置到终点还剩多少步。
   * HUD 用它给玩家一个进度感——否则走一百多步的迷宫完全不知道还有多远。
   */
  get remainingDistance(): number {
    const from = this.move ? this.move.to : this.playerRoom
    if (this._remainingDistanceCache !== null && this._lastDistanceRoom === from) {
      return this._remainingDistanceCache
    }
    const res = solve('astar', this.maze, from, this.maze.exit, (e) => this.isEdgePassable(e))
    this._remainingDistanceCache = res.path ? res.path.length - 1 : -1
    this._lastDistanceRoom = from
    return this._remainingDistanceCache
  }

  get currentRoom(): number {
    return this.playerRoom
  }

  get initialOptimalMoves(): number {
    return this._initialOptimalMoves
  }

  get visitedHistory(): number[] {
    return this._visitedHistory
  }

  getRoomVisitAge(room: number): number {
    const index = this.lastVisitedIndex[room]
    return index < 0 ? Infinity : this._visitedHistory.length - 1 - index
  }

  get inShiftWindow(): boolean {
    return this.isShifting
  }

  get currentScanPath(): number[] | null {
    if (!this.scanFlood || this._time < this.scanFlood.pathVisibleStartTime) {
      return null
    }
    return this.activeScanPath
  }

  get hasActiveScanFlood(): boolean {
    return this.scanFlood !== null && this._time <= this.scanEndTime
  }

  getRoomScanProgress(r: number): number | null {
    if (!this.scanFlood) return null
    const popTime = this.scanFlood.roomPopTimes.get(r)
    if (popTime === undefined || this._time < popTime) return null
    const elapsed = this._time - popTime
    return clamp(elapsed / 0.6, 0, 1)
  }

  get nextShiftCountdown(): { seconds: number; isWarning: boolean; isMotion: boolean } | null {
    // ready 阶段也给出倒计时：开局让玩家知道多久后会第一次重排，
    // 计时本身要等迈出第一步（进入 playing）才开始走。
    if (!this.cfg.shifting) return null
    if (this._phase !== 'playing' && this._phase !== 'ready') return null
    if (this.isShifting) {
      return {
        seconds: 0,
        isWarning: this.shiftPhase === 'warn',
        isMotion: this.shiftPhase === 'motion',
      }
    }
    const rem = Math.max(0, this.nextShiftElapsed - this._elapsed)
    return {
      seconds: rem,
      isWarning: false,
      isMotion: false,
    }
  }

  private pausedFromPhase: Phase = 'playing'

  // --- 事件订阅 ---

  on(listener: (ev: GameEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(ev: GameEvent): void {
    for (const listener of this.listeners) {
      listener(ev)
    }
  }

  // --- 控制命令 ---

  setHeld(dir: Dir | null): void {
    this.heldDir = dir
  }

  tap(dir: Dir): void {
    this.bufferDir = dir
  }

  clearInput(): void {
    this.heldDir = null
    this.bufferDir = null
  }

  setSurvey(on: boolean): void {
    this.survey = on
    if (on) {
      this.bufferDir = null
    }
  }

  pause(): void {
    if (this._phase === 'playing' || this._phase === 'ready') {
      const prev = this._phase
      this.pausedFromPhase = this._phase
      this._phase = 'paused'
      this.emit({ type: 'phase', phase: 'paused', prev, runId: this.runId })
    }
  }

  resume(): void {
    if (this._phase === 'paused') {
      const prev = this._phase
      const targetPhase = this.pausedFromPhase || 'playing'
      this._phase = targetPhase
      this.emit({ type: 'phase', phase: targetPhase, prev, runId: this.runId })
    }
  }

  skipReveal(): void {
    if (this._phase === 'revealing') {
      // 立即结束全部开场动画
      this.activeEdgeAnims.clear()
      for (let e = 0; e < this.maze.open.length; e++) {
        if (this.maze.open[e] === 1) {
          this.edgeStates[e] = 1 // open
        } else {
          this.edgeStates[e] = 0 // closed
        }
      }
      this._remainingDistanceCache = null
      this._lastDistanceRoom = null
      const prev = this._phase
      this._phase = 'ready'
      this.emit({ type: 'phase', phase: 'ready', prev, runId: this.runId })
    }
  }

  scan(): ScanResult {
    if (this._phase !== 'ready' && this._phase !== 'playing') {
      return 'not-allowed'
    }
    if (this.isShifting) {
      return 'busy'
    }
    if (this.activeScanPath !== null) {
      return 'busy'
    }
    if (this._scanCharges <= 0) {
      return 'no-charges'
    }

    const fromRoom = this.move ? this.move.to : this.playerRoom
    const solveRes = solve(
      'astar',
      this.maze,
      fromRoom,
      this.maze.exit,
      (e) => this.isEdgePassable(e),
    )

    if (solveRes.path === null) {
      return 'busy'
    }

    this._scanCharges--
    this._scansUsed++
    this.activeScanPath = solveRes.path

    const popStep = Math.min(SCAN_POP_STEP_MAX, SCAN_POP_TOTAL_TARGET / (solveRes.expanded || 1))
    const popDuration = solveRes.expanded * popStep
    this.scanEndTime = this._time + popDuration + SCAN_KEEP_DUR

    const roomPopTimes = new Map<number, number>()
    const popEvents = solveRes.trace.filter((ev) => ev.t === 'pop')
    popEvents.forEach((ev, idx) => {
      roomPopTimes.set(ev.room, this._time + idx * popStep)
    })

    this.scanFlood = {
      startTime: this._time,
      popDuration,
      roomPopTimes,
      pathVisibleStartTime: this._time + popDuration,
    }

    this.emit({
      type: 'scanStart',
      chargesRemaining: this._scanCharges,
      expanded: solveRes.expanded,
      path: solveRes.path,
      runId: this.runId,
    })

    return 'ok'
  }

  /**
   * 主动触发一次动力学拓扑变形。
   * 消耗一次主动变形次数，并重置自动变形的倒计时，
   * 避免刚主动变完紧接着又被定时变形打断。
   */
  forceShift(): CommandResult {
    if (this._phase !== 'ready' && this._phase !== 'playing') {
      return 'not-allowed'
    }
    if (this.isShifting) {
      return 'busy'
    }
    if (!this.cfg.shifting) {
      return 'not-allowed'
    }
    if (this._forceCharges <= 0) {
      return 'no-charges'
    }

    // 规划失败（当前区域找不到合法边交换）时不扣次数
    if (!this.triggerShift()) {
      return 'busy'
    }

    this._forceCharges--
    this.nextShiftElapsed = this._elapsed + this.shiftInterval
    this.emit({
      type: 'forceShiftUsed',
      chargesRemaining: this._forceCharges,
      runId: this.runId,
    })

    return 'ok'
  }

  isEdgePassable(e: number): boolean {
    return this.edgeStates[e] === 1
  }

  getEdgeVisual(e: number): EdgeVisualState {
    if (this.isShifting && this.shiftPhase === 'warn' && this.currentShiftPlan) {
      if (this.currentShiftPlan.close.includes(e)) {
        return 'warn-close'
      }
      if (this.currentShiftPlan.open.includes(e)) {
        return 'warn-open'
      }
    }
    return 'idle'
  }

  getEdgeHeight(e: number): number {
    const anim = this.activeEdgeAnims.get(e)
    if (anim) {
      const p = clamp((this._time - anim.startTime) / anim.dur, 0, 1)
      const easeVal = anim.type === 'rising' ? easeOutBack(p) : easeInCubic(p)
      return anim.fromHeight + (anim.toHeight - anim.fromHeight) * easeVal
    }

    if (this.isShifting && this.shiftPhase === 'warn' && this.currentShiftPlan) {
      if (this.currentShiftPlan.close.includes(e)) {
        // warn-close: 墙体轻微上抬起伏 0.08
        const pulse = Math.max(0, Math.sin(this._time * 4 * 2 * Math.PI))
        return WALL_LOW + pulse * 0.08
      }
    }

    if (this.edgeStates[e] === 1) {
      return WALL_LOW
    }

    return WALL_H
  }

  getPlayerVisual(): PlayerVisual {
    const { w, h } = this.maze
    const baseCoords = roomToWorld(this.playerRoom, w, h)
    let curX = baseCoords.x
    let curZ = baseCoords.z
    let bumpOffset = 0

    if (this.move) {
      const p = clamp((this._time - this.move.startTime) / this.move.dur, 0, 1)
      const fromCoords = roomToWorld(this.move.from, w, h)
      const toCoords = roomToWorld(this.move.to, w, h)
      curX = fromCoords.x + (toCoords.x - fromCoords.x) * p
      curZ = fromCoords.z + (toCoords.z - fromCoords.z) * p
    } else if (this.bumpAnim) {
      const p = clamp((this._time - this.bumpAnim.startTime) / this.bumpAnim.dur, 0, 1)
      if (p < 1) {
        // 第一人称下也保持相机与墙面之间的安全距离
        bumpOffset = Math.sin(p * Math.PI) * 0.16
        const delta = DIR_DELTA[this.bumpAnim.dir]
        curX += delta.dx * bumpOffset
        curZ += delta.dy * bumpOffset
      } else {
        this.bumpAnim = null
      }
    }

    return {
      x: curX,
      z: curZ,
      bump: bumpOffset,
    }
  }

  // --- 主循环 Tick ---

  tick(rawDt: number): void {
    try {
      const dt = clamp(rawDt, 0, 0.1)

      if (this._phase === 'paused' || this._phase === 'won' || this._phase === 'error') {
        return
      }

      // ① 推进时钟
      if (this._phase === 'revealing') {
        this._time += dt
        // 推进建造动画
        this.updateEdgeAnimations()
        if (this._time >= this.revealEndTime) {
          this.activeEdgeAnims.clear()
          for (let e = 0; e < this.maze.open.length; e++) {
            this.edgeStates[e] = this.maze.open[e] === 1 ? 1 : 0
          }
          this._remainingDistanceCache = null
          this._lastDistanceRoom = null
          const prev = this._phase
          this._phase = 'ready'
          this.emit({ type: 'phase', phase: 'ready', prev, runId: this.runId })
        }
        return
      }

      if (this._phase === 'ready') {
        this._time += dt
        // ready 阶段 elapsed 不增加
      } else if (this._phase === 'playing') {
        this._time += dt
        this._elapsed += dt
      }

      // ② 结算到期的移动
      if (this.move && this._time >= this.move.startTime + this.move.dur) {
        this.playerRoom = this.move.to
        this._moves++
        const finishedRoom = this.playerRoom
        this.move = null
        this._visitedHistory.push(finishedRoom)
        this.lastVisitedIndex[finishedRoom] = this._visitedHistory.length - 1
        this.emit({
          type: 'moveEnd',
          room: finishedRoom,
          moves: this._moves,
          runId: this.runId,
        })

        if (this.playerRoom === this.maze.exit) {
          const prev = this._phase
          this._phase = 'won'
          this.emit({
            type: 'won',
            elapsed: this._elapsed,
            moves: this._moves,
            scansUsed: this._scansUsed,
            shiftsDone: this._shiftsDone,
            optimalMoves: this.optimalMoves,
            runId: this.runId,
          })
          this.emit({ type: 'phase', phase: 'won', prev, runId: this.runId })
          return
        }
      }

      // ③ 结算到期的边动画与扫描
      this.updateEdgeAnimations()

      if (this.isShifting) {
        if (this.shiftPhase === 'warn' && this._time >= this.shiftMotionStartTime) {
          this.shiftPhase = 'motion'
          this.startShiftMotions()
          this.emit({
            type: 'shiftMotion',
            close: this.currentShiftPlan!.close,
            open: this.currentShiftPlan!.open,
            runId: this.runId,
          })
        } else if (this.shiftPhase === 'motion' && this._time >= this.shiftEndPlannedTime) {
          this.finishShift()
        }
      }

      if (this.activeScanPath && this._time >= this.scanEndTime) {
        this.activeScanPath = null
        this.scanFlood = null
        this.emit({ type: 'scanEnd', runId: this.runId })
      }

      // ④ 检查变形调度
      if (this._phase === 'playing' && this.cfg.shifting && !this.isShifting) {
        if (this._elapsed >= this.nextShiftElapsed) {
          this.triggerShift()
        }
      }

      // ⑤ 尝试开始新的移动
      if ((this._phase === 'ready' || this._phase === 'playing') && !this.move && !this.survey) {
        const nextDir = this.bufferDir !== null ? this.bufferDir : this.heldDir
        this.bufferDir = null

        if (nextDir !== null) {
          const nb = neighbor(this.playerRoom, nextDir, this.maze.w, this.maze.h)
          if (nb && this.isEdgePassable(nb.edge)) {
            // 通道可通行
            if (this._phase === 'ready') {
              const prev = this._phase
              this._phase = 'playing'
              this.emit({ type: 'phase', phase: 'playing', prev, runId: this.runId })
            }
            this.move = {
              from: this.playerRoom,
              to: nb.room,
              edge: nb.edge,
              startTime: this._time,
              dur: MOVE_DURATION,
              dir: nextDir,
            }
            this.emit({
              type: 'moveStart',
              from: this.playerRoom,
              to: nb.room,
              dir: nextDir,
              runId: this.runId,
            })
          } else {
            // 撞墙或边界
            if (this._phase === 'ready') {
              const prev = this._phase
              this._phase = 'playing'
              this.emit({ type: 'phase', phase: 'playing', prev, runId: this.runId })
            }
            const canBump =
              this.lastBumpDir !== nextDir || this._time - this.lastBumpTime >= BUMP_COOLDOWN
            if (canBump) {
              this.lastBumpTime = this._time
              this.lastBumpDir = nextDir
              this.bumpAnim = {
                dir: nextDir,
                startTime: this._time,
                dur: BUMP_DURATION,
              }
              this.emit({
                type: 'bump',
                room: this.playerRoom,
                dir: nextDir,
                runId: this.runId,
              })
            }
          }
        }
      }
    } catch (err) {
      const prev = this._phase
      this._phase = 'error'
      this.emit({ type: 'phase', phase: 'error', prev, runId: this.runId })
      console.error('GameEngine tick error:', err)
    }
  }

  private updateEdgeAnimations(): void {
    for (const [e, anim] of this.activeEdgeAnims) {
      if (this._time >= anim.startTime + anim.dur) {
        if (anim.type === 'falling') {
          this.edgeStates[e] = 1 // open (passable)
        } else {
          this.edgeStates[e] = 0 // closed (wall)
        }
        this.activeEdgeAnims.delete(e)
      }
    }
  }

  private triggerShift(): boolean {
    this.shiftCount++
    const shiftRng = rngFor(this.cfg.seed, 'shift', this.shiftCount)
    const lockedRooms = this.move ? [this.move.from, this.move.to] : [this.playerRoom]

    const sizeConfig = this.cfg.campaign ?? SIZE_CONFIGS[this.cfg.size]
    const plan = planShift(this.maze, shiftRng, {
      player: this.move ? this.move.to : this.playerRoom,
      locked: lockedRooms,
      exit: this.maze.exit,
      radius: sizeConfig.shiftRadius,
      swaps: sizeConfig.shiftSwaps,
    })

    if (!plan) {
      this.nextShiftElapsed = this._elapsed + this.shiftInterval
      this.emit({ type: 'shiftSkipped', runId: this.runId })
      return false
    }

    this.currentShiftPlan = plan
    this.isShifting = true
    this.shiftPhase = 'warn'
    this.shiftMotionStartTime = this._time + SHIFT_WARN

    // 清除正在显示的扫描路径
    if (this.activeScanPath !== null) {
      this.activeScanPath = null
      this.scanFlood = null
      this.emit({ type: 'scanEnd', runId: this.runId })
    }

    // close 边立即不可通行；open 边立即变为 opening（仍不可通行）
    for (const e of plan.close) {
      this.edgeStates[e] = 2 // closing
    }
    for (const e of plan.open) {
      this.edgeStates[e] = 3 // opening
    }

    // 预计算全部波纹结束时刻
    let maxEnd = this.shiftMotionStartTime
    const originCoords = roomXY(plan.origin, this.maze.w)
    for (const e of [...plan.close, ...plan.open]) {
      const [a, b] = edgeRooms(e, this.maze.w, this.maze.h)
      const aCoords = roomXY(a, this.maze.w)
      const bCoords = roomXY(b, this.maze.w)
      const distA = Math.max(Math.abs(aCoords.x - originCoords.x), Math.abs(aCoords.y - originCoords.y))
      const distB = Math.max(Math.abs(bCoords.x - originCoords.x), Math.abs(bCoords.y - originCoords.y))
      const closerDist = Math.min(distA, distB)
      const rippleDelay = closerDist * SHIFT_RIPPLE_DELAY
      const edgeEnd = this.shiftMotionStartTime + rippleDelay + SHIFT_MOTION
      if (edgeEnd > maxEnd) {
        maxEnd = edgeEnd
      }
    }
    this.shiftEndPlannedTime = maxEnd

    this.emit({
      type: 'shiftWarn',
      origin: plan.origin,
      close: plan.close,
      open: plan.open,
      runId: this.runId,
    })

    return true
  }

  private startShiftMotions(): void {
    if (!this.currentShiftPlan) return
    this._remainingDistanceCache = null
    this._lastDistanceRoom = null
    const plan = this.currentShiftPlan
    const originCoords = roomXY(plan.origin, this.maze.w)

    // close 边升起动画
    for (const e of plan.close) {
      const [a, b] = edgeRooms(e, this.maze.w, this.maze.h)
      const aCoords = roomXY(a, this.maze.w)
      const bCoords = roomXY(b, this.maze.w)
      const distA = Math.max(Math.abs(aCoords.x - originCoords.x), Math.abs(aCoords.y - originCoords.y))
      const distB = Math.max(Math.abs(bCoords.x - originCoords.x), Math.abs(bCoords.y - originCoords.y))
      const rippleDelay = Math.min(distA, distB) * SHIFT_RIPPLE_DELAY
      const startTime = this.shiftMotionStartTime + rippleDelay

      this.activeEdgeAnims.set(e, {
        edge: e,
        fromHeight: WALL_LOW,
        toHeight: WALL_H,
        startTime,
        dur: SHIFT_MOTION,
        type: 'rising',
      })
    }

    // open 边落下动画
    for (const e of plan.open) {
      const [a, b] = edgeRooms(e, this.maze.w, this.maze.h)
      const aCoords = roomXY(a, this.maze.w)
      const bCoords = roomXY(b, this.maze.w)
      const distA = Math.max(Math.abs(aCoords.x - originCoords.x), Math.abs(aCoords.y - originCoords.y))
      const distB = Math.max(Math.abs(bCoords.x - originCoords.x), Math.abs(bCoords.y - originCoords.y))
      const rippleDelay = Math.min(distA, distB) * SHIFT_RIPPLE_DELAY
      const startTime = this.shiftMotionStartTime + rippleDelay

      this.activeEdgeAnims.set(e, {
        edge: e,
        fromHeight: WALL_H,
        toHeight: WALL_LOW,
        startTime,
        dur: SHIFT_MOTION,
        type: 'falling',
      })
    }
  }

  private finishShift(): void {
    if (!this.currentShiftPlan) return
    const plan = this.currentShiftPlan

    // 同步权威迷宫数据
    for (const e of plan.close) {
      this.maze.open[e] = 0
      this.edgeStates[e] = 0
    }
    for (const e of plan.open) {
      this.maze.open[e] = 1
      this.edgeStates[e] = 1
    }

    this.activeEdgeAnims.clear()
    this.isShifting = false
    this.shiftPhase = 'none'
    this.currentShiftPlan = null
    this._shiftsDone++
    // 拓扑已变，理论最优步数与逃脱距离读数需要重算
    this._optimalCache = null
    this._remainingDistanceCache = null
    this._lastDistanceRoom = null

    this.emit({
      type: 'shiftEnd',
      shiftsDone: this._shiftsDone,
      runId: this.runId,
    })

    this.nextShiftElapsed = this._elapsed + this.shiftInterval

    // 运行期断言生成树不变量
    if (process.env.NODE_ENV !== 'production') {
      if (!isSpanningTree(this.maze)) {
        console.error('CRITICAL: Spanning tree invariant broken after shift!')
      }
    }
  }
}
