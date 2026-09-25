export const getStepProgress = (step: number, steps: number) => {
  const value = ((step + 1) / steps) * 100
  return Number.isFinite(value) ? Math.min(100, Math.max(1, value)) : 100
}
