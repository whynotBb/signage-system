// HEX → HSL 변환 (반환: [h 0-360, s 0-100, l 0-100])
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  return [h * 360, s * 100, l * 100]
}

// HSL → HEX 변환
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * 기존 등록 색상들의 채도·명도 톤을 참고해 유사한 톤의 새 색상을 랜덤 생성.
 * - 기존 hue와 30° 이상 떨어진 hue 탐색
 * - 채도·명도는 기존 평균 ±8% 범위에서 미세 변동
 */
export function generateShuffleColor(existingColors: string[]): string {
  const valid = existingColors.filter((c) => /^#[0-9a-fA-F]{6}$/i.test(c))

  if (valid.length === 0) {
    const defaults = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316']
    return defaults[Math.floor(Math.random() * defaults.length)]
  }

  const hslList = valid.map(hexToHsl)
  const avgS = hslList.reduce((sum, [, s]) => sum + s, 0) / hslList.length
  const avgL = hslList.reduce((sum, [, , l]) => sum + l, 0) / hslList.length
  const existingHues = hslList.map(([h]) => h)

  // 기존 hue와 30° 이상 떨어진 후보를 최대 60회 탐색
  const MIN_HUE_GAP = 30
  let newH = Math.random() * 360
  for (let i = 0; i < 60; i++) {
    const candidate = Math.random() * 360
    const tooClose = existingHues.some((h) => {
      const diff = Math.abs(h - candidate)
      return Math.min(diff, 360 - diff) < MIN_HUE_GAP
    })
    if (!tooClose) {
      newH = candidate
      break
    }
  }

  const jitter = () => (Math.random() - 0.5) * 16
  const newS = Math.min(90, Math.max(45, avgS + jitter()))
  const newL = Math.min(68, Math.max(38, avgL + jitter()))

  return hslToHex(newH, newS, newL)
}
