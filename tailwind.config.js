/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#08090d',
          card: '#0f111a',
          accent: 'rgb(var(--accent) / <alpha-value>)'
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        edge: 'rgb(var(--edge) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          dim: 'rgb(var(--ink-dim) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)'
        }
      },
      fontFamily: {
        // 品牌与数字统一 Outfit，中文回落到系统黑体栈；mono 仅留给种子/指纹/键位等技术串
        sans: [
          'Outfit Variable',
          'Outfit',
          'PingFang SC',
          'HarmonyOS Sans SC',
          'MiSans',
          'Microsoft YaHei',
          'sans-serif'
        ],
        mono: ['Fira Code', 'JetBrains Mono', 'Courier New', 'monospace']
      },
      transitionTimingFunction: {
        // 全站统一曲线（全案 3.5）
        cockpit: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    },
  },
  plugins: [],
}
