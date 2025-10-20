export const BASE_FONT_PX = 16

export const pxToRem = (px: number, base = BASE_FONT_PX) => `${px / base}rem`

// unitless line-height from pixels:
export const lh = (linePx: number, fontPx: number) =>
  Number((linePx / fontPx).toFixed(2))
