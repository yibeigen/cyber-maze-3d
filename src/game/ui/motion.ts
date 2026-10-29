/**
 * 全站动效参数（全案 3.5）
 * 统一曲线 cubic-bezier(0.22, 1, 0.36, 1)；面板进出 200ms，页面切换 300ms。
 * 类型写成四元组，framer-motion 的 Easing 才能正确推断。
 */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** 面板进出：opacity + scale 0.98↔1 */
export const panelMotion = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: EASE },
} as const

/** 页面切换：opacity + y 8px */
export const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.3, ease: EASE },
} as const

/** 标题页入场编排：品牌行 → 主标题 → 副标题 → 控制台，stagger 80ms */
export const staggerParent = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
} as const

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
} as const
